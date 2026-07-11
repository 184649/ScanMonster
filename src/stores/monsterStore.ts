import { create } from "zustand";

import { HABITAT_GROUPS } from "../data/habitatGroups";
import {
  getCharacterIdForFamily,
  getCharacterIdForMonster,
  getCharacterIdForRare,
  getCharacterRarityForMonster,
  getFamilyHabitatGroup
} from "../data/characters";
import { BACKGROUND_UNLOCKS, createDefaultEconomyState, FORM_STAGE_LABELS, FORM_STAGE_ORDER, FORM_UNLOCK_COSTS, FRAME_UNLOCKS, HINT_UNLOCKS } from "../data/economy";
import { getExpeditionAreaById } from "../data/expeditionAreas";
import {
  addExpToMonster,
  calculateExpeditionReward,
  createActiveExpedition,
  createRewardSummary,
  getExpeditionDisplayStatus,
  isMonsterInActiveExpedition
} from "../services/expeditionService";
import { getSeason, getTimeSlot } from "../services/contextService";
import { awardCategoryBonuses, awardDailyLoginBonus, awardDiscoveryDP, awardFlatDP, getUnlockedFormStages, spendDP } from "../services/economyService";
import { defaultScanCategory, getCategoryCount, getMonsterCategory } from "../services/categoryService";
import { calculateDiscoveryRate, selectDiscoveryType } from "../services/discoveryRate";
import { rareReadyWorldGroups, selectWorldSpawn } from "../services/worldSpawn";
import { FEATURE_FLAGS } from "../constants/featureFlags";
import { useSettingsStore } from "./settingsStore";
import {
  ALL_WORLD_GROUPS,
  INITIAL_WORLD_GROUPS,
  WORLD_BOOST_COST,
  WORLD_BOOST_RATE,
  WORLD_BOOST_SCAN_COUNT,
  WORLD_GROUP_LABELS,
  decrementWorldBoostAfterValidScan,
  getNextWorldUnlockCost,
  realmOfWorld
} from "../data/worlds";
import type { RealmGroup, WorldGroup } from "../types/worlds";
import { valueFromHash } from "../utils/randomFromHash";
import { MONSTER_FAMILIES } from "../data/monsterFamilies";
import { RARE_MONSTERS } from "../data/rareMonsters";
import { createSourceHash, createVariantSeed } from "../services/hashService";
import { generateMonsterFromScan, pickFamilyFromHash } from "../services/monsterGenerator";
import { decrementBoostAfterValidScan, getUnlockedHabitatsOrFallback, pickFamilyForHabitat, pickHabitatByRates } from "../services/habitatService";
import { addResearchReward } from "../services/researchService";
import { applyDiscoveryToCharacterRecord, recordDiscovery } from "../services/discoveryRecordService";
import { isServerMode } from "../config/apiConfig";
import { ApiUnavailableError, postScan } from "../services/apiClient";
import { getActiveServerUserId } from "../services/activeUser";
import { getActivePrefecture } from "./locationStore";
import { isApiReachable } from "../services/networkService";
import { storageService } from "../services/storageService";
import { syncUnlockedTitles } from "../services/titleService";
import type { CharacterRecord, DiscoveryRarity, DiscoveryRecord } from "../types/discoveryRecord";
import type { DetectedCode, DiscoveryResult } from "../types/discovery";
import type { ScanCategory } from "../types/category";
import type { EconomyStateData, FormStage, SpendDPResult } from "../types/economy";
import type { ActiveExpedition, ExpeditionReward } from "../types/expedition";
import type { CharacterRarity, HabitatGroup } from "../types/habitat";
import type { MissionProgress } from "../types/mission";
import type { ScanSource, UserMonster } from "../types/monster";
import type { RegionKey } from "../types/region";
import type { FamilyResearch } from "../types/research";
import type { DailySourceLimit, ScanHistory } from "../types/scan";
import { calculateConsecutiveScanDays, getLocalDateKey, getLocalTimeString } from "../utils/dateUtils";

type AddScannedMonsterParams = {
  /** 正規化済みのコード値（保存しない）。 */
  normalizedData: string;
  barcodeType: string;
  scanSource: ScanSource;
  scannedAt: Date;
  regionKey: RegionKey;
};

export type AddScanResult =
  | {
      kind: "first" | "rediscovery";
      scanSource: ScanSource;
      monster: UserMonster;
      dpEarned: number;
      dpBalanceAfter: number;
      dpBreakdown: DiscoveryResult["dpBreakdown"];
      /** 発行された発見証明ID（結果画面が store から証明を引く）。 */
      discoveryRecordId?: string;
    }
  | {
      kind: "duplicate";
      scanSource: ScanSource;
      familyId: string;
      researchPoints: number;
      dpEarned: number;
      dpBalanceAfter: number;
      dpBreakdown: DiscoveryResult["dpBreakdown"];
    };

type MonsterStore = {
  monsters: UserMonster[];
  scanHistories: ScanHistory[];
  dailySourceLimits: DailySourceLimit[];
  expeditions: ActiveExpedition[];
  research: FamilyResearch[];
  missionProgress: MissionProgress[];
  economy: EconomyStateData;
  /** 発見証明（全履歴、新しい順）。 */
  discoveryRecords: DiscoveryRecord[];
  /** キャラごとの記録（1種1件）。 */
  characterRecords: CharacterRecord[];
  userSalt: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addScannedMonster: (params: AddScannedMonsterParams) => Promise<AddScanResult>;
  /** キャラの記録を取得する。 */
  getCharacterRecord: (characterId: string) => CharacterRecord | undefined;
  /** キャラの取得済み発見証明を新しい順で返す。 */
  getDiscoveryRecordsForCharacter: (characterId: string) => DiscoveryRecord[];
  /** IDで発見証明を返す。 */
  getDiscoveryRecordById: (recordId: string) => DiscoveryRecord | undefined;
  /** 引継ぎ同期：サーバーの発見証明で発見記録キャッシュを置き換える。 */
  applyServerDiscoveries: (records: DiscoveryRecord[]) => Promise<void>;
  processDetectedCodes: (codes: DetectedCode[], regionKey: RegionKey, scannedAt?: Date) => Promise<DiscoveryResult[]>;
  updateMonster: (monster: UserMonster) => Promise<void>;
  toggleFavorite: (monsterId: string) => Promise<void>;
  renameMonster: (monsterId: string, nickname: string) => Promise<void>;
  /** 個体の発見カテゴリを変更する。新カテゴリの節目に達すればDPを付与する。 */
  setMonsterCategory: (monsterId: string, category: ScanCategory) => Promise<{ ok: boolean; message: string; dpEarned: number }>;
  getMonsterById: (monsterId: string) => UserMonster | undefined;
  /** 初回ワールド選択（ground/waterside/sky/bug）。selectedInitialWorldGroup と最初の解放を保存。 */
  selectInitialWorldGroup: (world: WorldGroup) => Promise<SpendDPResult>;
  /** DPでワールドを解放する。コストは解放済み数で決まる。 */
  unlockWorldGroup: (world: WorldGroup) => Promise<SpendDPResult>;
  /** ワールドブースト（対象ワールドの出現率のみ上げる）を開始する。 */
  startWorldBoost: (world: WorldGroup) => Promise<SpendDPResult>;
  setActiveTitle: (titleId: string) => Promise<SpendDPResult>;
  setActiveFormStage: (monsterId: string, stage: FormStage) => Promise<SpendDPResult>;
  unlockMonsterForm: (monsterId: string, stage: FormStage) => Promise<SpendDPResult>;
  unlockBackground: (backgroundKey: string) => Promise<SpendDPResult>;
  setActiveBackground: (monsterId: string, backgroundKey: string) => Promise<SpendDPResult>;
  unlockFrame: (frameKey: string) => Promise<SpendDPResult>;
  unlockHint: (hintKey: string) => Promise<SpendDPResult>;
  getUnlockedFormStages: (monsterId: string) => FormStage[];
  startExpedition: (areaId: string, monsterIds: string[]) => Promise<ActiveExpedition>;
  claimExpeditionReward: (expeditionId: string) => Promise<ExpeditionReward | undefined>;
  claimMissionReward: (missionId: string, dateKey: string, rewardLabel: string) => Promise<void>;
  isMissionRewardClaimed: (missionId: string, dateKey: string) => boolean;
  isMonsterBusy: (monsterId: string) => boolean;
  syncExpeditionStatuses: () => Promise<void>;
  /** 動作確認用：DPを大量付与し、全個体の姿・背景・フレーム・ヒントを開放する。 */
  devUnlockAllForTesting: () => Promise<void>;
  /** 動作確認用：全種族＋全レアを発見済みにする（図鑑を全種捕獲済みにする）。追加した数を返す。 */
  devDiscoverAllForTesting: (regionKey: RegionKey) => Promise<number>;
  /** 友達招待ボーナス（+DP のみ）を付与する。付与した合計DPを返す。 */
  grantFriendInviteDP: (amount: number, label: string) => Promise<number>;
  resetLocalData: () => Promise<void>;
};

export const useMonsterStore = create<MonsterStore>((set, get) => ({
  monsters: [],
  scanHistories: [],
  dailySourceLimits: [],
  expeditions: [],
  research: [],
  missionProgress: [],
  economy: createDefaultEconomyState(),
  discoveryRecords: [],
  characterRecords: [],
  userSalt: "",
  hydrated: false,

  async hydrate() {
    await storageService.ensureSchema();
    const [
      monsters,
      scanHistories,
      dailySourceLimits,
      expeditions,
      research,
      missionProgress,
      economy,
      discoveryRecords,
      characterRecords,
      userSalt
    ] = await Promise.all([
      storageService.getMonsters(),
      storageService.getScanHistories(),
      storageService.getDailySourceLimits(),
      storageService.getExpeditions(),
      storageService.getResearch(),
      storageService.getMissionProgress(),
      storageService.getEconomy(),
      storageService.getDiscoveryRecords(),
      storageService.getCharacterRecords(),
      storageService.ensureUserSalt()
    ]);
    const syncedExpeditions = expeditions.map((expedition) => ({
      ...expedition,
      status: getExpeditionDisplayStatus(expedition)
    }));
    const loginAward = awardDailyLoginBonus(economy);
    const economyWithTitles = syncUnlockedTitles(loginAward.economy, monsters, scanHistories);

    if (loginAward.total > 0 || JSON.stringify(economyWithTitles.titles) !== JSON.stringify(economy.titles)) {
      await storageService.saveEconomy(economyWithTitles);
    }

    set({
      monsters,
      scanHistories,
      dailySourceLimits,
      expeditions: syncedExpeditions,
      research,
      missionProgress,
      economy: economyWithTitles,
      discoveryRecords,
      characterRecords,
      userSalt,
      hydrated: true
    });
  },

  async addScannedMonster({ normalizedData, barcodeType, scanSource, scannedAt, regionKey }) {
    const state = get();
    // sourceHash は種族傾向を決める（同じコードなら同じ傾向）。生の値は保存しない。
    const sourceHash = await createSourceHash(barcodeType, normalizedData);
    const scanDate = getLocalDateKey(scannedAt);
    const limitKey = `${sourceHash}:${scanDate}`;

    // 同じコードは同じローカル日付では1回だけ処理可能（3秒のカメラ重複制限とは別のゲームルール）。
    // 同日2回目以降は「発見済みブロック」：新規発見・新個体・DP・研究ポイントを一切付与しない。
    const isDebugScanBypass = FEATURE_FLAGS.DEBUG_MODE;
    const alreadyDiscoveredToday = !isDebugScanBypass && state.dailySourceLimits.some((limit) => limit.key === limitKey);

    if (alreadyDiscoveredToday) {
      const family = pickFamilyFromHash(sourceHash);
      return {
        kind: "duplicate",
        scanSource,
        familyId: family.id,
        researchPoints: 0,
        dpEarned: 0,
        dpBalanceAfter: state.economy.dpBalance,
        dpBreakdown: []
      };
    }

    const userSalt = state.userSalt || (await storageService.ensureUserSalt());
    const timeSlot = getTimeSlot(scannedAt);
    const season = getSeason(scannedAt);
    // variantSeed は個体差を決める（秒単位の時刻・userSalt を含む）。
    const variantSeed = await createVariantSeed({
      sourceHash,
      userSalt,
      localDate: scanDate,
      localTime: getLocalTimeString(scannedAt),
      timeSlot,
      season,
      regionKey
    });

    // 出現確率ロジック：normal/variant/rare を確率でロールする（上限は discoveryRate 側で担保）。
    const discoveryRate = calculateDiscoveryRate({
      totalScans: state.scanHistories.length,
      discoveredSpeciesCount: new Set(state.monsters.map((monster) => getCharacterIdForMonster(monster))).size,
      totalSpeciesCount: MONSTER_FAMILIES.length,
      scanStreak: state.economy.scanStreak.totalScanStreakDays,
      discoveryStreak: state.economy.scanStreak.totalScanStreakDays
    });
    let discoveryType = selectDiscoveryType(discoveryRate);
    // デバッグ：出現の ノーマル/レア を固定（設定画面のデバッグ欄から切替）。DEBUG_MODE 時のみ有効。
    const debugForceRarity = FEATURE_FLAGS.DEBUG_MODE
      ? useSettingsStore.getState().settings.debugForceRarity
      : undefined;
    if (debugForceRarity === "normal") {
      discoveryType = "normal";
    } else if (debugForceRarity === "rare") {
      discoveryType = "rare";
    }
    const unlockedHabitats = getUnlockedHabitatsOrFallback(state.economy.unlocks.unlockedHabitatGroups);
    const selectedHabitat = pickHabitatByRates(unlockedHabitats, state.economy.unlocks.activeHabitatBoost, variantSeed);
    const family = pickFamilyForHabitat({
      habitat: selectedHabitat,
      sourceHash: variantSeed,
      wantRare: discoveryType === "rare"
    });
    const forcedType = discoveryType === "rare" && family.hiddenRareIds.length > 0 ? "rare" : "normal";
    const boostFirstDiscovery = state.monsters.length === 0;

    // レア出現判定に渡す文脈（このスキャン前の状態）。
    const rareInput = {
      streakDays: calculateConsecutiveScanDays(
        state.scanHistories.map((history) => history.scannedAt),
        scannedAt
      ),
      discoveredFamilyIds: new Set(state.monsters.map((monster) => monster.familyId)),
      familyDiscoveryCount: state.monsters.filter((monster) => monster.familyId === family.id).length
    };

    const generated = generateMonsterFromScan({
      sourceHash,
      variantSeed,
      sourceType: scanSource === "qr" ? "qr" : "barcode",
      scanSource,
      barcodeType,
      scannedAt,
      regionKey,
      boostFirstDiscovery,
      rareInput,
      forcedType
    });

    // ===== サーバーモード：公式発見はサーバーが確定する（§2/§4）。ローカル抽選・ローカル採番は使わない =====
    if (isServerMode) {
      const reachable = await isApiReachable();
      if (!reachable) {
        // オフラインでは新規スキャンを成立させない（§3）。呼び出し側でオフライン表示に変換する。
        throw new ApiUnavailableError();
      }
      const activePrefecture = getActivePrefecture();
      const resp = await postScan({
        userId: getActiveServerUserId(userSalt),
        sourceHash,
        scanType: scanSource === "qr" ? "qr" : "barcode",
        localDate: scanDate,
        prefectureCode: activePrefecture?.code,
        prefectureName: activePrefecture?.name
      });
      if (resp.status === "duplicate") {
        const family = pickFamilyFromHash(sourceHash);
        return { kind: "duplicate", scanSource, familyId: family.id, researchPoints: 0, dpEarned: 0, dpBalanceAfter: state.economy.dpBalance, dpBreakdown: [] };
      }
      const dto = resp.discoveryRecord;
      // サーバー確定の rarity を丸めずに保持（legendary/secret も normal に落とさない・段3）。
      const serverRarity: CharacterRarity =
        dto.rarity === "rare"
          ? "rare"
          : dto.rarity === "legendary"
            ? "legendary"
            : dto.rarity === "secret"
              ? "secret"
              : "normal";
      // 表示用の器は generated を流用し、キャラ情報はサーバー確定値で上書き（画像は imageKey=公式characterId）。
      const serverMonster: UserMonster = {
        ...generated.monster,
        characterId: dto.characterId,
        displayName: dto.characterName,
        imageKey: dto.characterId,
        worldGroup: (dto.worldGroup || undefined) as WorldGroup | undefined,
        characterRarity: serverRarity,
        rarityTier: serverRarity === "normal" ? "normal" : "hiddenRare",
        firstDiscoveredAt: dto.discoveredAt,
        lastDiscoveredAt: dto.discoveredAt,
        discoveryCount: 1,
        rareId: undefined
      };
      const serverRecord: DiscoveryRecord = {
        id: dto.id,
        certificateId: dto.certificateId,
        characterId: dto.characterId,
        characterName: dto.characterName,
        imageKey: dto.characterId,
        worldGroup: dto.worldGroup,
        rarity: dto.rarity,
        discoveredAt: dto.discoveredAt,
        localDate: scanDate,
        isNewForUser: dto.isNewForUser,
        isRediscovery: dto.isRediscovery,
        difficultyRank: dto.difficultyRank,
        characterDiscoveryNo: dto.characterDiscoveryNo,
        numberBadges: dto.numberBadges,
        primaryNumberBadge: dto.primaryNumberBadge,
        grantedCharacterTitles: dto.grantedCharacterTitles,
        strongestProof: dto.strongestProof,
        discoveryRankLabel: dto.discoveryRankLabel,
        dpGained: dto.dpGained,
        numberSource: "server",
        prefectureName: dto.prefectureName,
        legendaryUnlockedNow: dto.legendaryUnlockedNow
      };
      const existingRec = await storageService.getCharacterRecordById(dto.characterId);
      const charRecord = applyDiscoveryToCharacterRecord(existingRec, serverRecord);
      const serverEconomy: EconomyStateData = { ...state.economy, dpBalance: dto.dpBalanceAfter };
      await storageService.saveMonster(serverMonster);
      await storageService.saveDiscoveryRecord(serverRecord);
      await storageService.saveCharacterRecord(charRecord);
      await storageService.saveEconomy(serverEconomy);
      set((current) => ({
        monsters: dto.isRediscovery
          ? [serverMonster, ...current.monsters.filter((m) => getCharacterIdForMonster(m) !== dto.characterId)]
          : [serverMonster, ...current.monsters],
        economy: serverEconomy,
        discoveryRecords: [serverRecord, ...current.discoveryRecords.filter((r) => r.id !== serverRecord.id)],
        characterRecords: [charRecord, ...current.characterRecords.filter((r) => r.characterId !== charRecord.characterId)]
      }));
      return {
        kind: dto.isNewForUser ? "first" : "rediscovery",
        scanSource,
        monster: serverMonster,
        dpEarned: dto.dpGained,
        dpBalanceAfter: dto.dpBalanceAfter,
        dpBreakdown: [],
        discoveryRecordId: serverRecord.id
      };
    }

    // 新モデル（領域>ワールド）：解放済みワールドから均等抽選（ブースト補正込み）→ そのワールドの
    // 「画像実在」キャラを1体。未発見優先はしない（所持済みも候補）。rare のみ wantRare。
    let catalogOffset = 700;
    const catalogRng = () => valueFromHash(variantSeed, 0, 99999, catalogOffset++) / 100000;
    // レア固定デバッグ時は、レアが実際に出現し得るワールド（画像実在の通常＋レアが両方ある）に限定する。
    const rareWorlds = rareReadyWorldGroups();
    const unlockedWorldsForSpawn = state.economy.unlocks.unlockedWorldGroups;
    const rareUnlockedWorlds = unlockedWorldsForSpawn.filter((world) => rareWorlds.includes(world));
    const unlockedForSpawn =
      debugForceRarity === "rare" && rareUnlockedWorlds.length > 0
        ? rareUnlockedWorlds
        : unlockedWorldsForSpawn;
    let worldPick = selectWorldSpawn({
      unlockedWorldGroups: unlockedForSpawn,
      activeBoost: state.economy.unlocks.activeWorldBoost,
      wantRare: discoveryType === "rare",
      rng: catalogRng
    });
    if (!worldPick) {
      worldPick = selectWorldSpawn({
        unlockedWorldGroups: unlockedForSpawn,
        activeBoost: undefined,
        wantRare: discoveryType === "rare",
        rng: catalogRng
      });
    }
    if (!worldPick) {
      throw new Error("No image-ready character in unlocked worlds.");
    }
    const catalogChar = worldPick ? (worldPick.kind === "rare" ? worldPick.rare : worldPick.character) : undefined;
    const catalogIsRare = worldPick?.kind === "rare";

    // 発見元の生活カテゴリを初期設定（QR→qr / 今日の対象 / other）。後から変更可能。
    const scanCategory = defaultScanCategory(scanSource, state.monsters, scannedAt);
    const characterId = catalogChar
      ? catalogChar.id
      : generated.monster.rareId
        ? getCharacterIdForRare(generated.monster.rareId)
        : getCharacterIdForFamily(generated.monster.familyId);
    const existingMonster = state.monsters.find((item) => getCharacterIdForMonster(item) === characterId);
    const isRediscovery = Boolean(existingMonster);
    const discoveredAt = scannedAt.toISOString();
    const baseMonster: UserMonster = {
      ...generated.monster,
      scanCategory,
      characterId,
      habitatGroup: selectedHabitat,
      characterRarity: getCharacterRarityForMonster(generated.monster),
      firstDiscoveredAt: discoveredAt,
      lastDiscoveredAt: discoveredAt,
      discoveryCount: 1,
      // カタログ由来キャラは、表示名・画像・ワールド・レア判定をカタログで上書き（末尾＝優先）。
      ...(catalogChar
        ? {
            displayName: catalogChar.name,
            imageKey: catalogChar.id,
            worldGroup: (catalogChar.worldGroup || undefined) as WorldGroup | undefined,
            realmGroup: (catalogChar.realmGroup || undefined) as RealmGroup | undefined,
            speciesJa: catalogChar.speciesJa,
            speciesEn: catalogChar.speciesEn,
            characterRarity: catalogIsRare ? ("rare" as const) : ("normal" as const),
            rarityTier: catalogIsRare ? ("hiddenRare" as const) : ("normal" as const),
            rareId: undefined
          }
        : {})
    };
    const monster: UserMonster = existingMonster
      ? {
          ...existingMonster,
          lastDiscoveredAt: discoveredAt,
          discoveryCount: (existingMonster.discoveryCount ?? 1) + 1,
          sourceHash,
          variantSeedHash: variantSeed,
          scanSource,
          sourceType: scanSource === "qr" ? "qr" : "barcode",
          barcodeType,
          scanCategory,
          habitatGroup: selectedHabitat,
          characterRarity: existingMonster.characterRarity ?? getCharacterRarityForMonster(existingMonster),
          favorite: existingMonster.favorite
        }
      : baseMonster;
    const scanHistory = { ...generated.scanHistory, resultMonsterId: monster.id };

    const limitRecord: DailySourceLimit = {
      key: limitKey,
      sourceHash,
      scanDate,
      recordedAt: scannedAt.toISOString()
    };
    const nextDailyLimits = isDebugScanBypass ? state.dailySourceLimits : [limitRecord, ...state.dailySourceLimits].slice(0, 500);
    const nextMonsters = isRediscovery
      ? [monster, ...state.monsters.filter((item) => item.id !== monster.id)]
      : [monster, ...state.monsters];
    const nextHistories = [scanHistory, ...state.scanHistories];
    const economyBeforeReward: EconomyStateData = {
      ...state.economy,
      unlocks: {
        ...state.economy.unlocks,
        activeHabitatBoost: decrementBoostAfterValidScan(state.economy.unlocks.activeHabitatBoost),
        activeWorldBoost: decrementWorldBoostAfterValidScan(state.economy.unlocks.activeWorldBoost)
      }
    };
    const discoveryReward = awardDiscoveryDP({
      economy: economyBeforeReward,
      scannedAt,
      scanSource,
      discoveryKind: isRediscovery ? "rediscovery" : "first",
      isHiddenRare: catalogChar ? catalogIsRare : Boolean(monster.rareId),
      discoveredFamilyCount: new Set(nextMonsters.map((item) => getCharacterIdForMonster(item))).size,
      hiddenRareCount: new Set(nextMonsters.map((item) => item.rareId).filter(Boolean)).size
    });
    const finalEconomy = syncUnlockedTitles(discoveryReward.economy, nextMonsters, nextHistories);
    const rewardLines = discoveryReward.lines;
    const totalDp = discoveryReward.total;

    await storageService.saveMonster(monster);
    await storageService.saveScanHistory(scanHistory);
    await storageService.saveDailySourceLimits(nextDailyLimits);
    await storageService.saveEconomy(finalEconomy);

    // 発見記録ドメイン：公式発見番号の採番・発見証明の発行・キャラ記録の更新（§9/§15/§18/§23）。
    // 採番/番号価値/難度/最強の証は discoveryRecordService に集約。dpGained は実際の付与額を記録する。
    const discoveryRarity: DiscoveryRarity = monster.characterRarity === "rare" || catalogIsRare ? "rare" : "normal";
    const proofRoll = valueFromHash(variantSeed, 0, 999999, 8888) / 1000000;
    const { record, characterRecord } = await recordDiscovery({
      id: `disc_${sourceHash.slice(0, 6)}_${variantSeed.slice(0, 6)}_${Date.now()}`,
      characterId,
      characterName: monster.displayName,
      imageKey: monster.imageKey,
      worldGroup: monster.worldGroup,
      rarity: discoveryRarity,
      discoveredAt,
      localDate: scanDate,
      dpGained: totalDp,
      roll01: proofRoll
    });

    set((current) => ({
      monsters: isRediscovery ? [monster, ...current.monsters.filter((item) => item.id !== monster.id)] : [monster, ...current.monsters],
      scanHistories: [scanHistory, ...current.scanHistories],
      dailySourceLimits: nextDailyLimits,
      economy: finalEconomy,
      discoveryRecords: [record, ...current.discoveryRecords.filter((item) => item.id !== record.id)],
      characterRecords: [
        characterRecord,
        ...current.characterRecords.filter((item) => item.characterId !== characterRecord.characterId)
      ]
    }));

    return {
      kind: isRediscovery ? "rediscovery" : "first",
      scanSource,
      monster,
      dpEarned: totalDp,
      dpBalanceAfter: finalEconomy.dpBalance,
      dpBreakdown: rewardLines,
      discoveryRecordId: record.id
    };
  },

  getCharacterRecord(characterId) {
    return get().characterRecords.find((record) => record.characterId === characterId);
  },

  getDiscoveryRecordsForCharacter(characterId) {
    return get().discoveryRecords.filter((record) => record.characterId === characterId);
  },

  getDiscoveryRecordById(recordId) {
    return get().discoveryRecords.find((record) => record.id === recordId);
  },

  async applyServerDiscoveries(records) {
    // 古い順にキャラ記録を畳んで再構築（発見回数・代表・称号を復元）。
    const asc = [...records].sort((a, b) => (a.discoveredAt < b.discoveredAt ? -1 : a.discoveredAt > b.discoveredAt ? 1 : 0));
    const charMap = new Map<string, CharacterRecord>();
    for (const rec of asc) {
      charMap.set(rec.characterId, applyDiscoveryToCharacterRecord(charMap.get(rec.characterId), rec));
    }
    const discoveryRecords = [...records].sort((a, b) => (a.discoveredAt > b.discoveredAt ? -1 : a.discoveredAt < b.discoveredAt ? 1 : 0));
    const characterRecords = [...charMap.values()];
    await storageService.saveDiscoveryRecords(discoveryRecords);
    await storageService.saveCharacterRecords(characterRecords);
    set({ discoveryRecords, characterRecords });
  },

  async processDetectedCodes(codes, regionKey, scannedAt = new Date()) {
    const results: DiscoveryResult[] = [];

    // 1回の読み取りで複数コードが見つかった場合、まとめて処理する。
    // 片方の処理に失敗しても、もう片方を止めない。
    for (const code of codes) {
      try {
        const result = await get().addScannedMonster({
          normalizedData: code.normalizedValue,
          barcodeType: code.codeType,
          scanSource: code.scanSource,
          scannedAt,
          regionKey
        });

        if (result.kind === "duplicate") {
          results.push({
            id: code.id,
            kind: "duplicate",
            scanSource: result.scanSource,
            familyId: result.familyId,
            researchPoints: result.researchPoints,
            dpEarned: result.dpEarned,
            dpBalanceAfter: result.dpBalanceAfter,
            dpBreakdown: result.dpBreakdown
          });
        } else {
          results.push({
            id: code.id,
            kind: result.kind,
            scanSource: result.scanSource,
            monster: result.monster,
            dpEarned: result.dpEarned,
            dpBalanceAfter: result.dpBalanceAfter,
            dpBreakdown: result.dpBreakdown,
            discoveryRecordId: result.discoveryRecordId
          });
        }
      } catch {
        // このコードの処理に失敗しても、他のコードの処理は続行する。
      }
    }

    return results;
  },

  async updateMonster(monster) {
    await storageService.updateMonster(monster);
    set((state) => ({
      monsters: state.monsters.map((item) => (item.id === monster.id ? monster : item))
    }));
  },

  async toggleFavorite(monsterId) {
    const monster = get().getMonsterById(monsterId);

    if (!monster) {
      return;
    }

    await get().updateMonster({ ...monster, favorite: !monster.favorite });
  },

  async renameMonster(monsterId, nickname) {
    const monster = get().getMonsterById(monsterId);

    if (!monster) {
      return;
    }

    const trimmed = nickname.trim();
    await get().updateMonster({ ...monster, nickname: trimmed.length > 0 ? trimmed : undefined });
  },

  async setMonsterCategory(monsterId, category) {
    const state = get();
    const monster = state.getMonsterById(monsterId);

    if (!monster) {
      return { ok: false, message: "個体が見つかりません。", dpEarned: 0 };
    }

    if (getMonsterCategory(monster) === category) {
      return { ok: true, message: "カテゴリは変更ありません。", dpEarned: 0 };
    }

    const updated: UserMonster = { ...monster, scanCategory: category };
    const nextMonsters = state.monsters.map((item) => (item.id === monsterId ? updated : item));

    // 変更後のカテゴリで節目に達していればDPを付与（重複付与は防止済み）。
    const categoryCount = getCategoryCount(nextMonsters, category);
    const categoryReward = awardCategoryBonuses(state.economy, category, categoryCount);

    await storageService.updateMonster(updated);
    await storageService.saveEconomy(categoryReward.economy);
    set({ monsters: nextMonsters, economy: categoryReward.economy });

    return {
      ok: true,
      dpEarned: categoryReward.total,
      message: categoryReward.total > 0 ? `カテゴリを変更し、ボーナス +${categoryReward.total} DP を獲得しました。` : "カテゴリを変更しました。"
    };
  },

  getMonsterById(monsterId) {
    return get().monsters.find((monster) => monster.id === monsterId);
  },

  async selectInitialWorldGroup(world) {
    const state = get();

    if (!INITIAL_WORLD_GROUPS.includes(world)) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "ワールドが見つかりません。" };
    }

    if (state.economy.unlocks.selectedInitialWorldGroup) {
      return { ok: true, balanceAfter: state.economy.dpBalance, message: "最初のワールドはすでに選択済みです。" };
    }

    const nextEconomy = syncUnlockedTitles(
      {
        ...state.economy,
        unlocks: {
          ...state.economy.unlocks,
          selectedInitialWorldGroup: world,
          unlockedWorldGroups: [world],
          unlockedRealmGroups: Array.from(
            new Set<RealmGroup>([...state.economy.unlocks.unlockedRealmGroups, "life"])
          )
        }
      },
      state.monsters,
      state.scanHistories
    );

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return {
      ok: true,
      balanceAfter: nextEconomy.dpBalance,
      message: `${WORLD_GROUP_LABELS[world]}を最初のワールドに選びました。`
    };
  },

  async unlockWorldGroup(world) {
    const state = get();

    if (!ALL_WORLD_GROUPS.includes(world)) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "ワールドが見つかりません。" };
    }

    if (state.economy.unlocks.unlockedWorldGroups.includes(world)) {
      return { ok: true, balanceAfter: state.economy.dpBalance, message: "このワールドは解放済みです。" };
    }

    const cost = getNextWorldUnlockCost(state.economy.unlocks.unlockedWorldGroups.length);
    if (cost === null) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "これ以上解放できるワールドはありません。" };
    }

    if (cost > 0 && state.economy.dpBalance < cost) {
      const shortage = cost - state.economy.dpBalance;
      return {
        ok: false,
        balanceAfter: state.economy.dpBalance,
        message: `DPが足りません。あと${shortage.toLocaleString("ja-JP")} DP必要です。`
      };
    }

    const spent =
      cost > 0
        ? spendDP(state.economy, cost, `${WORLD_GROUP_LABELS[world]}を解放`, { world })
        : { economy: state.economy, ok: true, message: "解放しました。", balanceAfter: state.economy.dpBalance };

    if (!spent.ok) {
      return { ok: false, balanceAfter: spent.balanceAfter, message: spent.message };
    }

    const nextEconomy = syncUnlockedTitles(
      {
        ...spent.economy,
        unlocks: {
          ...spent.economy.unlocks,
          unlockedWorldGroups: [...spent.economy.unlocks.unlockedWorldGroups, world],
          unlockedRealmGroups: Array.from(
            new Set<RealmGroup>([...spent.economy.unlocks.unlockedRealmGroups, realmOfWorld(world)])
          )
        }
      },
      state.monsters,
      state.scanHistories
    );

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return {
      ok: true,
      balanceAfter: nextEconomy.dpBalance,
      message: `${WORLD_GROUP_LABELS[world]}を解放しました。`
    };
  },

  async startWorldBoost(world) {
    const state = get();

    if (!state.economy.unlocks.unlockedWorldGroups.includes(world)) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "未解放ワールドにはワールドブーストを使えません。" };
    }

    if (state.economy.unlocks.unlockedWorldGroups.length <= 1) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "ワールドブーストは2ワールド以上解放後に使用できます。" };
    }

    if (state.economy.unlocks.activeWorldBoost?.remainingScans) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "すでにワールドブーストが発動中です。" };
    }

    const spent = spendDP(state.economy, WORLD_BOOST_COST, `${WORLD_GROUP_LABELS[world]}のワールドブースト`, { world });

    if (!spent.ok) {
      return { ok: false, balanceAfter: spent.balanceAfter, message: spent.message };
    }

    const nextEconomy = {
      ...spent.economy,
      unlocks: {
        ...spent.economy.unlocks,
        activeWorldBoost: {
          id: `world-boost_${Date.now()}_${world}`,
          targetWorld: world,
          remainingScans: WORLD_BOOST_SCAN_COUNT,
          boostRate: WORLD_BOOST_RATE,
          createdAt: new Date().toISOString()
        }
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return {
      ok: true,
      balanceAfter: nextEconomy.dpBalance,
      message: `${WORLD_GROUP_LABELS[world]}のワールドブーストを開始しました。`
    };
  },

  async setActiveTitle(titleId) {
    const state = get();

    if (!state.economy.titles.unlockedTitleIds.includes(titleId)) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "未獲得の称号は設定できません。" };
    }

    const nextEconomy = {
      ...state.economy,
      titles: {
        ...state.economy.titles,
        activeTitleId: titleId
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: "表示称号を変更しました。" };
  },

  async setActiveFormStage(monsterId, stage) {
    const state = get();
    const unlocked = getUnlockedFormStages(state.economy, monsterId);

    if (!unlocked.includes(stage)) {
      return {
        ok: false,
        balanceAfter: state.economy.dpBalance,
        message: `${FORM_STAGE_LABELS[stage]}はまだ開放されていません。`
      };
    }

    const nextEconomy = {
      ...state.economy,
      unlocks: {
        ...state.economy.unlocks,
        activeFormByMonsterId: {
          ...state.economy.unlocks.activeFormByMonsterId,
          [monsterId]: stage
        }
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: `${FORM_STAGE_LABELS[stage]}に切り替えました。` };
  },

  async unlockMonsterForm(monsterId, stage) {
    const state = get();

    if (stage === "base") {
      return get().setActiveFormStage(monsterId, "base");
    }

    const monster = state.getMonsterById(monsterId);
    if (!monster) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "個体が見つかりません。" };
    }

    const unlocked = getUnlockedFormStages(state.economy, monsterId);
    if (unlocked.includes(stage)) {
      return get().setActiveFormStage(monsterId, stage);
    }

    const cost = FORM_UNLOCK_COSTS[stage];
    const spent = spendDP(state.economy, cost, `${FORM_STAGE_LABELS[stage]}を開放`, {
      monsterId,
      stage,
      familyId: monster.familyId
    });

    if (!spent.ok) {
      return { ok: false, balanceAfter: spent.balanceAfter, message: spent.message };
    }

    const nextEconomy = {
      ...spent.economy,
      unlocks: {
        ...spent.economy.unlocks,
        activeFormByMonsterId: {
          ...spent.economy.unlocks.activeFormByMonsterId,
          [monsterId]: stage
        },
        unlockedFormsByMonsterId: {
          ...spent.economy.unlocks.unlockedFormsByMonsterId,
          [monsterId]: Array.from(new Set([...(spent.economy.unlocks.unlockedFormsByMonsterId[monsterId] ?? []), stage]))
        }
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: `${FORM_STAGE_LABELS[stage]}が開放されました。` };
  },

  async unlockBackground(backgroundKey) {
    const state = get();
    const item = BACKGROUND_UNLOCKS.find((entry) => entry.key === backgroundKey);

    if (!item) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "背景が見つかりません。" };
    }

    if (state.economy.unlocks.unlockedBackgrounds.includes(backgroundKey)) {
      return { ok: true, balanceAfter: state.economy.dpBalance, message: `${item.label}は開放済みです。` };
    }

    const spent = spendDP(state.economy, item.cost, item.label, { backgroundKey });
    if (!spent.ok) {
      return { ok: false, balanceAfter: spent.balanceAfter, message: spent.message };
    }

    const nextEconomy = {
      ...spent.economy,
      unlocks: {
        ...spent.economy.unlocks,
        unlockedBackgrounds: [...spent.economy.unlocks.unlockedBackgrounds, backgroundKey]
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: `${item.label}を開放しました。` };
  },

  async setActiveBackground(monsterId, backgroundKey) {
    const state = get();

    if (!state.economy.unlocks.unlockedBackgrounds.includes(backgroundKey)) {
      const label = BACKGROUND_UNLOCKS.find((entry) => entry.key === backgroundKey)?.label ?? "背景";
      return { ok: false, balanceAfter: state.economy.dpBalance, message: `${label}はまだ開放されていません。` };
    }

    const label = BACKGROUND_UNLOCKS.find((entry) => entry.key === backgroundKey)?.label ?? "背景";
    const nextEconomy = {
      ...state.economy,
      unlocks: {
        ...state.economy.unlocks,
        activeBackgroundByMonsterId: {
          ...state.economy.unlocks.activeBackgroundByMonsterId,
          [monsterId]: backgroundKey
        }
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: `背景を「${label}」に変更しました。` };
  },

  async unlockFrame(frameKey) {
    const state = get();
    const item = FRAME_UNLOCKS.find((entry) => entry.key === frameKey);

    if (!item) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "フレームが見つかりません。" };
    }

    if (state.economy.unlocks.unlockedFrames.includes(frameKey)) {
      return { ok: true, balanceAfter: state.economy.dpBalance, message: `${item.label}は開放済みです。` };
    }

    const spent = spendDP(state.economy, item.cost, item.label, { frameKey });
    if (!spent.ok) {
      return { ok: false, balanceAfter: spent.balanceAfter, message: spent.message };
    }

    const nextEconomy = {
      ...spent.economy,
      unlocks: {
        ...spent.economy.unlocks,
        unlockedFrames: [...spent.economy.unlocks.unlockedFrames, frameKey]
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: `${item.label}を開放しました。` };
  },

  async unlockHint(hintKey) {
    const state = get();
    const item = HINT_UNLOCKS.find((entry) => entry.key === hintKey);

    if (!item) {
      return { ok: false, balanceAfter: state.economy.dpBalance, message: "ヒントが見つかりません。" };
    }

    if (state.economy.unlocks.unlockedHints.includes(hintKey)) {
      return { ok: true, balanceAfter: state.economy.dpBalance, message: `${item.label}は開放済みです。` };
    }

    const spent = spendDP(state.economy, item.cost, item.label, { hintKey });
    if (!spent.ok) {
      return { ok: false, balanceAfter: spent.balanceAfter, message: spent.message };
    }

    const nextEconomy = {
      ...spent.economy,
      unlocks: {
        ...spent.economy.unlocks,
        unlockedHints: [...spent.economy.unlocks.unlockedHints, hintKey]
      }
    };

    await storageService.saveEconomy(nextEconomy);
    set({ economy: nextEconomy });
    return { ok: true, balanceAfter: nextEconomy.dpBalance, message: `${item.label}を開放しました。` };
  },

  getUnlockedFormStages(monsterId) {
    return getUnlockedFormStages(get().economy, monsterId);
  },

  async startExpedition(areaId, monsterIds) {
    const area = getExpeditionAreaById(areaId);

    if (!area) {
      throw new Error("探索先が見つかりません。");
    }

    const uniqueMonsterIds = Array.from(new Set(monsterIds)).slice(0, 3);

    if (uniqueMonsterIds.length === 0) {
      throw new Error("探索に出すモンスターを選んでください。");
    }

    const state = get();
    const selectedMonsters = uniqueMonsterIds
      .map((monsterId) => state.getMonsterById(monsterId))
      .filter((monster): monster is UserMonster => Boolean(monster));

    if (selectedMonsters.length !== uniqueMonsterIds.length) {
      throw new Error("選択したモンスターが見つかりません。");
    }

    if (selectedMonsters.some((monster) => monster.level < area.requiredLevel)) {
      throw new Error(`この探索にはLv.${area.requiredLevel}以上が必要です。`);
    }

    if (uniqueMonsterIds.some((monsterId) => isMonsterInActiveExpedition(monsterId, state.expeditions))) {
      throw new Error("探索中のモンスターは同時に使えません。");
    }

    const expedition = createActiveExpedition(areaId, uniqueMonsterIds);
    const nextMonsters = state.monsters.map((monster) =>
      uniqueMonsterIds.includes(monster.id) ? { ...monster, expeditionStatus: "in_expedition" as const } : monster
    );
    const nextExpeditions = [expedition, ...state.expeditions];

    await Promise.all([
      storageService.saveExpeditions(nextExpeditions),
      storageService.saveResearch(state.research),
      ...nextMonsters.map((monster) => storageService.updateMonster(monster))
    ]);

    set({ monsters: nextMonsters, expeditions: nextExpeditions });
    return expedition;
  },

  async claimExpeditionReward(expeditionId) {
    const state = get();
    const expedition = state.expeditions.find((item) => item.id === expeditionId);

    if (!expedition || getExpeditionDisplayStatus(expedition) !== "completed") {
      return undefined;
    }

    const area = getExpeditionAreaById(expedition.areaId);

    if (!area) {
      return undefined;
    }

    const expeditionMonsters = expedition.monsterIds
      .map((monsterId) => state.getMonsterById(monsterId))
      .filter((monster): monster is UserMonster => Boolean(monster));
    const reward = calculateExpeditionReward(area, expeditionMonsters);
    const expPerMonster = Math.max(1, Math.floor(reward.exp / Math.max(1, expeditionMonsters.length)));
    const updatedMonsterIds = new Set(expedition.monsterIds);
    const nextMonsters = state.monsters.map((monster) =>
      updatedMonsterIds.has(monster.id)
        ? addExpToMonster(monster, expPerMonster)
        : monster
    );
    const primaryFamilyId = expeditionMonsters[0]?.familyId;
    const nextResearch = primaryFamilyId
      ? addResearchReward(state.research, primaryFamilyId, reward.researchPoints, reward.unlockedHints)
      : state.research;
    const nextExpeditions = state.expeditions.map((item) =>
      item.id === expedition.id
        ? {
            ...item,
            status: "claimed" as const,
            rewardClaimedAt: new Date().toISOString(),
            rewardSummary: createRewardSummary(reward)
          }
        : item
    );

    await Promise.all([
      storageService.saveExpeditions(nextExpeditions),
      storageService.saveResearch(nextResearch),
      ...nextMonsters.map((monster) => storageService.updateMonster(monster))
    ]);

    set({ monsters: nextMonsters, expeditions: nextExpeditions, research: nextResearch });
    return reward;
  },

  async claimMissionReward(missionId, dateKey, rewardLabel) {
    const state = get();

    if (state.isMissionRewardClaimed(missionId, dateKey)) {
      return;
    }

    const nextProgress: MissionProgress[] = [
      {
        missionId,
        dateKey,
        rewardLabel,
        claimedAt: new Date().toISOString()
      },
      ...state.missionProgress
    ];

    await storageService.saveMissionProgress(nextProgress);
    set({ missionProgress: nextProgress });
  },

  isMissionRewardClaimed(missionId, dateKey) {
    return get().missionProgress.some((progress) => progress.missionId === missionId && progress.dateKey === dateKey);
  },

  isMonsterBusy(monsterId) {
    return isMonsterInActiveExpedition(monsterId, get().expeditions);
  },

  async syncExpeditionStatuses() {
    const state = get();
    const nextExpeditions = state.expeditions.map((expedition) => ({
      ...expedition,
      status: getExpeditionDisplayStatus(expedition)
    }));

    await storageService.saveExpeditions(nextExpeditions);
    set({ expeditions: nextExpeditions });
  },

  async devUnlockAllForTesting() {
    const state = get();
    const allForms = FORM_STAGE_ORDER;
    const allBackgrounds = BACKGROUND_UNLOCKS.map((item) => item.key);

    // 全個体の姿・背景を全開放。
    const unlockedFormsByMonsterId: Record<string, FormStage[]> = {};
    const activeFormByMonsterId: Record<string, FormStage> = { ...state.economy.unlocks.activeFormByMonsterId };
    for (const monster of state.monsters) {
      unlockedFormsByMonsterId[monster.id] = [...allForms];
      if (!activeFormByMonsterId[monster.id]) {
        activeFormByMonsterId[monster.id] = "base";
      }
    }

    const nextEconomy: EconomyStateData = {
      ...state.economy,
      dpBalance: Math.max(state.economy.dpBalance, 999999),
      unlocks: {
        ...state.economy.unlocks,
        selectedInitialHabitatGroup: state.economy.unlocks.selectedInitialHabitatGroup ?? "land",
        unlockedHabitatGroups: HABITAT_GROUPS,
        activeFormByMonsterId,
        unlockedFormsByMonsterId,
        unlockedBackgrounds: allBackgrounds,
        unlockedFrames: FRAME_UNLOCKS.map((item) => item.key),
        unlockedHints: HINT_UNLOCKS.map((item) => item.key)
      }
    };

    const economyWithTitles = syncUnlockedTitles(nextEconomy, state.monsters, state.scanHistories);

    await storageService.saveEconomy(economyWithTitles);
    set({ economy: economyWithTitles });
  },

  async grantFriendInviteDP(amount, label) {
    const state = get();
    const result = awardFlatDP(state.economy, amount, label, "friend_invite", { source: "friend_invite" });

    if (result.total <= 0) {
      return 0;
    }

    await storageService.saveEconomy(result.economy);
    set({ economy: result.economy });
    return result.total;
  },

  async devDiscoverAllForTesting(regionKey) {
    const state = get();
    const ownedFamilyIds = new Set(state.monsters.map((monster) => monster.familyId));
    const ownedRareIds = new Set(state.monsters.map((monster) => monster.rareId).filter(Boolean));
    const scannedAt = new Date();
    const newMonsters: UserMonster[] = [];

    // 未発見の全種族を1体ずつ発見済みにする（ノーマル個体）。
    for (const family of MONSTER_FAMILIES) {
      if (ownedFamilyIds.has(family.id)) {
        continue;
      }
      const { monster } = generateMonsterFromScan({
        sourceHash: `dev_family_${family.id}`,
        variantSeed: `dev_seed_${family.id}`,
        sourceType: "barcode",
        scanSource: "barcode",
        barcodeType: "dev",
        scannedAt,
        regionKey,
        familyOverride: family,
        forcedType: "normal"
      });
      newMonsters.push({
        ...monster,
        id: `mon_dev_${family.id}`,
        characterId: getCharacterIdForFamily(family.id),
        habitatGroup: getFamilyHabitatGroup(family.id),
        characterRarity: "normal",
        firstDiscoveredAt: monster.obtainedAt,
        lastDiscoveredAt: monster.obtainedAt,
        discoveryCount: 1,
        scanCategory: "other"
      });
    }

    // 未発見の全レアも発見済みにする。
    for (const rare of RARE_MONSTERS) {
      if (ownedRareIds.has(rare.id)) {
        continue;
      }
      const { monster } = generateMonsterFromScan({
        sourceHash: `dev_rare_${rare.id}`,
        variantSeed: `dev_seed_${rare.id}`,
        sourceType: "barcode",
        scanSource: "barcode",
        barcodeType: "dev",
        scannedAt,
        regionKey,
        rareOverride: rare.id
      });
      newMonsters.push({
        ...monster,
        id: `mon_dev_rare_${rare.id}`,
        characterId: getCharacterIdForRare(rare.id),
        habitatGroup: getFamilyHabitatGroup(monster.familyId),
        characterRarity: getCharacterRarityForMonster(monster),
        firstDiscoveredAt: monster.obtainedAt,
        lastDiscoveredAt: monster.obtainedAt,
        discoveryCount: 1,
        scanCategory: "other"
      });
    }

    if (newMonsters.length === 0) {
      return 0;
    }

    for (const monster of newMonsters) {
      await storageService.saveMonster(monster);
    }
    set((current) => ({ monsters: [...newMonsters, ...current.monsters] }));
    return newMonsters.length;
  },

  async resetLocalData() {
    await storageService.clearGameData();
    const userSalt = await storageService.ensureUserSalt();
    set({
      monsters: [],
      scanHistories: [],
      dailySourceLimits: [],
      expeditions: [],
      research: [],
      missionProgress: [],
      economy: createDefaultEconomyState(),
      discoveryRecords: [],
      characterRecords: [],
      userSalt
    });
  }
}));
