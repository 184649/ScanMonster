/**
 * 発見処理（§4.2 / 段2）。すべて1トランザクション内で確定する。
 * 採番・番号価値・難度・最強の証・発見証明・キャラ記録・DP を原子的に実行する。
 *
 * 【段2の変更点】
 *  - 採番・証明・記録・DP を finalizeDiscovery() に切り出し、通常スキャンとフレンドQRで共通化。
 *  - レアリティ/キャラはサーバー側抽選に変更（sourceHash は重複防止・識別のみ・§6）。
 *  - その日の有効フレンド人数（friend_qr_reads・最大100）で rare と未発見重みを補正（§7/§8）。
 */
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { withTransaction } from "./db.ts";
import {
  buildCharacterNumberBadge,
  collectGrantedTitles,
  computeDifficulty,
  computeDiscoveryDp,
  difficultyAtLeast,
  difficultyIndex,
  discoveryRankLabel,
  isRediscoveryMilestone,
  shouldGrantStrongestProof,
  strongestProofChance,
  type DifficultyRank,
  type DiscoveryNumberBadge,
  type DiscoveryRarity
} from "./domain.ts";
import { scanDistribution, unseenWeightMultiplier, pickWeightedByUnseen } from "./friendDaily.core.ts";
import { didUnlockLegendaryNow, legendaryUnlockedWorlds, type WorldNormalProgress } from "./legendaryUnlock.core.ts";
import { pickRarity } from "./rates.ts";

export type ScanRequest = {
  userId: string;
  sourceHash: string;
  scanType: "barcode" | "qr" | "player_qr";
  localDate: string; // YYYY-MM-DD
  /** GPSで判定した現在地の都道府県（将来用。初期リリースは通常抽選に入れない・§13）。 */
  prefectureCode?: string;
  prefectureName?: string;
};

export type DiscoveryRecordDTO = {
  id: string;
  characterId: string;
  characterName: string;
  rarity: DiscoveryRarity;
  worldGroup: string;
  characterDiscoveryNo: string; // BIGINT → string（§15）
  difficultyRank: DifficultyRank;
  discoveryRankLabel: string;
  isNewForUser: boolean;
  isRediscovery: boolean;
  numberBadges: DiscoveryNumberBadge[];
  primaryNumberBadge?: DiscoveryNumberBadge;
  grantedCharacterTitles: string[];
  strongestProof: boolean;
  dpGained: number;
  dpBalanceAfter: number;
  certificateId: string;
  discoveredAt: string;
  /** prefecture 発見時のみ（将来用）。 */
  prefectureCode?: string;
  prefectureName?: string;
  /** この発見で伝説が解放されたワールド（解放演出のトリガ）。それ以外は undefined。§5/§25。 */
  legendaryUnlockedNow?: string;
};

export type ScanResult =
  | { status: "discovered"; discoveryRecord: DiscoveryRecordDTO }
  | { status: "duplicate"; message: string };

export type SpawnCharacter = { id: string; name: string; world_group: string; rarity: DiscoveryRarity };
type SpawnRow = SpawnCharacter & { prefecture_code: string | null };

/** sourceHash と用途 salt から決定的な [0,1) 乱数を作る（proof など「同一発見内で安定させたい」用途のみ）。 */
const roll = (sourceHash: string, salt: string): number => {
  let h = 2166136261 >>> 0;
  const input = `${sourceHash}:${salt}`;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h >>> 0) / 4294967296;
};

const NUMBER_VALUE_INDEX: Record<string, number> = { normal: 0, memorial: 1, rare: 2, premium: 3, legend: 4 };
const representativeScore = (difficultyRank: DifficultyRank, badge: DiscoveryNumberBadge | undefined, strongestProof: boolean): number =>
  difficultyIndex(difficultyRank) * 100 + (NUMBER_VALUE_INDEX[badge?.valueRank ?? "normal"] ?? 0) * 10 + (strongestProof ? 5 : 0);

/** そのユーザーが発見済みのキャラID集合（未発見重み補正・新規フレンド未発見確定に使用）。 */
export const getDiscoveredCharacterIds = async (client: PoolClient, userId: string): Promise<Set<string>> => {
  const rows = await client.query<{ character_id: string }>(
    "SELECT character_id FROM character_records WHERE user_id = $1",
    [userId]
  );
  return new Set(rows.rows.map((r) => r.character_id));
};

/** そのユーザーの解放済みワールド（無ければ公開中ワールド）。 */
export const resolveWorlds = async (client: PoolClient, userId: string): Promise<string[]> => {
  const unlocked = await client.query<{ world_group: string }>(
    "SELECT world_group FROM user_world_unlocks WHERE user_id = $1 ORDER BY unlock_order",
    [userId]
  );
  let worlds = unlocked.rows.map((r) => r.world_group);
  if (worlds.length === 0) {
    const released = await client.query<{ world_group: string }>(
      "SELECT world_group FROM world_masters WHERE is_released = TRUE ORDER BY sort_order"
    );
    worlds = released.rows.map((r) => r.world_group);
  }
  return worlds;
};

/**
 * 各ワールドの normal 進捗（総数・発見済み数）。伝説解放判定に使う。§3/§6。
 * worlds に含まれるワールドのみ対象。
 */
export const worldNormalProgress = async (
  client: PoolClient,
  userId: string,
  worlds: string[]
): Promise<WorldNormalProgress[]> => {
  if (worlds.length === 0) return [];
  const ph = worlds.map((_, i) => `$${i + 1}`).join(",");
  const totals = await client.query<{ world_group: string; n: string }>(
    `SELECT world_group, COUNT(*)::int AS n FROM character_masters
      WHERE rarity = 'normal' AND is_available_for_scan = TRUE AND world_group IN (${ph}) GROUP BY world_group`,
    worlds
  );
  const ph2 = worlds.map((_, i) => `$${i + 2}`).join(",");
  const discovered = await client.query<{ world_group: string; n: string }>(
    `SELECT m.world_group, COUNT(*)::int AS n
       FROM character_records cr JOIN character_masters m ON m.id = cr.character_id
      WHERE cr.user_id = $1 AND m.rarity = 'normal' AND m.world_group IN (${ph2})
      GROUP BY m.world_group`,
    [userId, ...worlds]
  );
  const discMap = new Map(discovered.rows.map((r) => [r.world_group, Number(r.n)]));
  const totalMap = new Map(totals.rows.map((r) => [r.world_group, Number(r.n)]));
  return worlds.map((w) => ({
    worldGroup: w,
    normalTotal: totalMap.get(w) ?? 0,
    normalDiscovered: discMap.get(w) ?? 0
  }));
};

/** 伝説が解放済みのワールド集合（normal コンプリート済み）。§6。 */
export const getLegendaryUnlockedWorlds = async (client: PoolClient, userId: string, worlds: string[]): Promise<Set<string>> =>
  legendaryUnlockedWorlds(await worldNormalProgress(client, userId, worlds));

/** その日の有効フレンド人数（同一相手は1日1回＝行が1つ）。§6。 */
export const dailyFriendCount = async (client: PoolClient, userId: string, localDate: string): Promise<number> => {
  const res = await client.query<{ n: string }>(
    "SELECT COUNT(*)::bigint AS n FROM friend_qr_reads WHERE reader_user_id = $1 AND local_date = $2",
    [userId, localDate]
  );
  return Number(res.rows[0]?.n ?? 0);
};

const charMastersByRarity = async (client: PoolClient, rarity: DiscoveryRarity): Promise<SpawnRow[]> =>
  (
    await client.query<SpawnRow>(
      "SELECT id, name, world_group, rarity, prefecture_code FROM character_masters WHERE rarity = $1 AND is_available_for_scan = TRUE ORDER BY id",
      [rarity]
    )
  ).rows;

/**
 * 通常スキャンのキャラ抽選（§6/§7/§8/§13）。
 *  - レアリティはサーバー側抽選（その日のフレンド人数で rare を補正）。都道府県は初期リリース非対象。
 *  - 選ばれたレアリティ内で、未発見キャラに重み補正（unseenWeightMultiplier）を掛けて1体選ぶ。
 */
const chooseNormalScanCharacter = async (
  client: PoolClient,
  userId: string,
  friendCountToday: number
): Promise<SpawnCharacter> => {
  const worlds = await resolveWorlds(client, userId);
  if (worlds.length === 0) throw new Error("出現可能なワールドがありません。");
  const discovered = await getDiscoveredCharacterIds(client, userId);
  const legendaryWorlds = await getLegendaryUnlockedWorlds(client, userId, worlds);
  const inUnlocked = (rows: SpawnRow[]): SpawnRow[] => rows.filter((r) => worlds.includes(r.world_group));
  const inLegendaryWorlds = (rows: SpawnRow[]): SpawnRow[] => rows.filter((r) => legendaryWorlds.has(r.world_group));

  // legendary は解放済みワールドが1つ以上あるときだけ抽選対象（§10）。
  const dist = scanDistribution({ friendCountToday, legendaryUnlocked: legendaryWorlds.size > 0 });
  const scanRarity = pickRarity(dist, Math.random());

  let candidates: SpawnRow[];
  if (scanRarity === "secret") {
    candidates = await charMastersByRarity(client, "secret");
  } else if (scanRarity === "legendary") {
    candidates = inLegendaryWorlds(await charMastersByRarity(client, "legendary"));
  } else if (scanRarity === "rare") {
    candidates = inUnlocked(await charMastersByRarity(client, "rare"));
  } else {
    candidates = inUnlocked(await charMastersByRarity(client, "normal"));
  }
  if (candidates.length === 0) candidates = inUnlocked(await charMastersByRarity(client, "normal"));
  if (candidates.length === 0) throw new Error("出現可能キャラがいません。");

  const mult = unseenWeightMultiplier(friendCountToday);
  const chosen = pickWeightedByUnseen(candidates, (c) => !discovered.has(c.id), mult, Math.random()) ?? candidates[0]!;
  return { id: chosen.id, name: chosen.name, world_group: chosen.world_group, rarity: chosen.rarity };
};

/** キャラ別採番カウンターを +1 して新値(string)を返す（トランザクション内・§15）。 */
const issueCharacterDiscoveryNo = async (client: PoolClient, characterId: string): Promise<string> => {
  const key = `character:${characterId}`;
  await client.query(
    "INSERT INTO discovery_counters (counter_key, current_value) VALUES ($1, 0) ON CONFLICT (counter_key) DO NOTHING",
    [key]
  );
  const res = await client.query<{ current_value: string }>(
    "UPDATE discovery_counters SET current_value = current_value + 1, updated_at = NOW() WHERE counter_key = $1 RETURNING current_value",
    [key]
  );
  return String(res.rows[0]!.current_value);
};

/** テスト/動作確認用: 最強の証を強制付与する（WORLDAWN_FORCE_STRONGEST_PROOF=1）。§9。 */
const forceStrongestProof = (): boolean => process.env.WORLDAWN_FORCE_STRONGEST_PROOF === "1";

export type FinalizeDiscoveryInput = {
  userId: string;
  character: SpawnCharacter;
  localDate: string;
  discoverySource: string; // normal_scan | prefecture_scan | friend_new | friend_existing
  proofRoll: number; // 0..1（最強の証の抽選に使用）
  friendCountToday: number; // 記録用（0..100 相当）
  isFirstValidScanOfDay: boolean;
  prefectureCode?: string;
  prefectureName?: string;
  friendQrId?: string | null;
};

/**
 * 採番・番号価値・難度・最強の証・発見証明・character_records・DP を確定する（通常スキャン/フレンドQR共通）。
 * scan_history・ワールドブースト消費は通常スキャン固有なので含めない（呼び出し側で行う）。
 */
export const finalizeDiscovery = async (client: PoolClient, input: FinalizeDiscoveryInput): Promise<DiscoveryRecordDTO> => {
  const { userId, character } = input;

  const existing = await client.query<{
    discovery_count: number;
    best_difficulty_rank: DifficultyRank;
    titles: string[];
    representative_score: number;
    representative_discovery_id: string | null;
    number_badges: DiscoveryNumberBadge[];
  }>("SELECT * FROM character_records WHERE user_id = $1 AND character_id = $2", [userId, character.id]);
  const isRediscovery = (existing.rowCount ?? 0) > 0;
  const discoveryCount = (existing.rows[0]?.discovery_count ?? 0) + 1;

  // 伝説解放の瞬間判定（normal を新規発見し、そのワールドの normal が今回で完了した場合・§5）。
  // character_records へ書き込む前に「直前の発見済み数」を数える。
  let legendaryUnlockedNow: string | undefined;
  if (character.rarity === "normal" && !isRediscovery) {
    const totalRes = await client.query<{ n: string }>(
      "SELECT COUNT(*)::int AS n FROM character_masters WHERE rarity = 'normal' AND is_available_for_scan = TRUE AND world_group = $1",
      [character.world_group]
    );
    const discRes = await client.query<{ n: string }>(
      `SELECT COUNT(*)::int AS n FROM character_records cr JOIN character_masters m ON m.id = cr.character_id
        WHERE cr.user_id = $1 AND m.rarity = 'normal' AND m.world_group = $2`,
      [userId, character.world_group]
    );
    const normalTotal = Number(totalRes.rows[0]?.n ?? 0);
    const normalDiscoveredBefore = Number(discRes.rows[0]?.n ?? 0);
    if (didUnlockLegendaryNow({ rarity: "normal", normalTotal, normalDiscoveredBefore, isNewForUser: true })) {
      const ins = await client.query(
        "INSERT INTO user_world_legendary (user_id, world_group) VALUES ($1,$2) ON CONFLICT (user_id, world_group) DO NOTHING RETURNING world_group",
        [userId, character.world_group]
      );
      if ((ins.rowCount ?? 0) > 0) legendaryUnlockedNow = character.world_group;
    }
  }

  const characterDiscoveryNo = await issueCharacterDiscoveryNo(client, character.id);
  const badge = buildCharacterNumberBadge(characterDiscoveryNo);

  const isMilestone = isRediscovery && isRediscoveryMilestone(discoveryCount);
  const chance = strongestProofChance(character.rarity, badge.valueRank);
  const strongestProof = forceStrongestProof() || shouldGrantStrongestProof(input.proofRoll, chance);
  const difficultyRank = computeDifficulty({
    rarity: character.rarity,
    isRediscovery,
    numberValueRank: badge.valueRank,
    hasStrongestProof: strongestProof,
    isMilestone
  });
  const grantedCharacterTitles = collectGrantedTitles({ badge, hasStrongestProof: strongestProof, discoveryCount, isRediscovery });
  const rankLabel = discoveryRankLabel({ difficultyRank, hasStrongestProof: strongestProof, isNewForUser: !isRediscovery });
  const notable = badge.valueRank !== "normal";
  const dp = computeDiscoveryDp({ rarity: character.rarity, isRediscovery, isFirstValidScanOfDay: input.isFirstValidScanOfDay });

  const discoveryId = `disc_${randomUUID()}`;
  const certificateId = `cert_${randomUUID()}`;
  const discoveredAt = new Date().toISOString();
  const friendEffectLevelRec = Math.min(100, Math.max(0, Math.floor(input.friendCountToday)));

  await client.query(
    `INSERT INTO discovery_records
      (id, user_id, character_id, world_group, rarity, character_discovery_no, discovered_at, local_date,
       is_new_for_user, is_rediscovery, difficulty_rank, discovery_rank_label, number_badges, primary_number_badge,
       granted_character_titles, strongest_proof, dp_gained, certificate_id,
       prefecture_code, prefecture_name, discovery_source, friend_effect_level, friend_qr_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
    [
      discoveryId,
      userId,
      character.id,
      character.world_group,
      character.rarity,
      characterDiscoveryNo,
      discoveredAt,
      input.localDate,
      !isRediscovery,
      isRediscovery,
      difficultyRank,
      rankLabel,
      JSON.stringify(notable ? [badge] : []),
      notable ? JSON.stringify(badge) : null,
      JSON.stringify(grantedCharacterTitles),
      strongestProof,
      dp.total,
      certificateId,
      input.prefectureCode ?? null,
      input.prefectureName ?? null,
      input.discoverySource,
      friendEffectLevelRec,
      input.friendQrId ?? null
    ]
  );

  const score = representativeScore(difficultyRank, notable ? badge : undefined, strongestProof);
  if (!isRediscovery) {
    await client.query(
      `INSERT INTO character_records
        (id, user_id, character_id, first_discovered_at, last_discovered_at, discovery_count, best_difficulty_rank,
         titles, active_title, representative_discovery_id, representative_score, first_discovery_id, latest_discovery_id, number_badges)
       VALUES ($1,$2,$3,$4,$4,1,$5,$6,$7,$8,$9,$8,$8,$10)`,
      [
        `crec_${randomUUID()}`,
        userId,
        character.id,
        discoveredAt,
        difficultyRank,
        JSON.stringify(grantedCharacterTitles),
        grantedCharacterTitles[0] ?? null,
        discoveryId,
        score,
        JSON.stringify(notable ? [badge] : [])
      ]
    );
  } else {
    const prev = existing.rows[0]!;
    const mergedTitles = [...new Set([...(prev.titles ?? []), ...grantedCharacterTitles])];
    const bestDifficulty: DifficultyRank = difficultyAtLeast(difficultyRank, prev.best_difficulty_rank)
      ? difficultyRank
      : prev.best_difficulty_rank;
    const takeRep = score >= prev.representative_score;
    const mergedBadges =
      notable && !prev.number_badges.some((b) => b.number === badge.number) ? [badge, ...prev.number_badges] : prev.number_badges;
    await client.query(
      `UPDATE character_records SET
         last_discovered_at = $3, discovery_count = discovery_count + 1, best_difficulty_rank = $4,
         titles = $5, active_title = COALESCE($6, active_title),
         representative_discovery_id = $7, representative_score = $8, latest_discovery_id = $9, number_badges = $10
       WHERE user_id = $1 AND character_id = $2`,
      [
        userId,
        character.id,
        discoveredAt,
        bestDifficulty,
        JSON.stringify(mergedTitles),
        mergedTitles[0] ?? null,
        takeRep ? discoveryId : prev.representative_discovery_id,
        Math.max(score, prev.representative_score),
        discoveryId,
        JSON.stringify(mergedBadges)
      ]
    );
  }

  await client.query(
    `INSERT INTO user_dp (user_id, balance) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET balance = user_dp.balance + $2, updated_at = NOW()`,
    [userId, dp.total]
  );
  await client.query("INSERT INTO dp_transactions (id, user_id, amount, reason) VALUES ($1,$2,$3,$4)", [
    `dpt_${randomUUID()}`,
    userId,
    dp.total,
    isRediscovery ? "rediscovery" : "first_discovery"
  ]);
  const balanceRow = await client.query<{ balance: number }>("SELECT balance FROM user_dp WHERE user_id = $1", [userId]);
  const dpBalanceAfter = Number(balanceRow.rows[0]?.balance ?? dp.total);

  return {
    id: discoveryId,
    characterId: character.id,
    characterName: character.name,
    rarity: character.rarity,
    worldGroup: character.world_group,
    characterDiscoveryNo,
    difficultyRank,
    discoveryRankLabel: rankLabel,
    isNewForUser: !isRediscovery,
    isRediscovery,
    numberBadges: notable ? [badge] : [],
    primaryNumberBadge: notable ? badge : undefined,
    grantedCharacterTitles,
    strongestProof,
    dpGained: dp.total,
    dpBalanceAfter,
    certificateId,
    discoveredAt,
    prefectureCode: character.rarity === "prefecture" ? input.prefectureCode : undefined,
    prefectureName: character.rarity === "prefecture" ? input.prefectureName : undefined,
    legendaryUnlockedNow
  };
};

export const processScan = async (req: ScanRequest): Promise<ScanResult> =>
  withTransaction(async (client) => {
    // 1. 同日同コード重複確認。
    const dup = await client.query(
      "SELECT 1 FROM scan_history WHERE user_id = $1 AND source_hash = $2 AND local_date = $3",
      [req.userId, req.sourceHash, req.localDate]
    );
    if ((dup.rowCount ?? 0) > 0) {
      return { status: "duplicate", message: "今日はこのコードからはすでに発見済みです。" };
    }

    const todayValid = await client.query(
      "SELECT 1 FROM scan_history WHERE user_id = $1 AND local_date = $2 AND is_valid_scan = TRUE LIMIT 1",
      [req.userId, req.localDate]
    );
    const isFirstValidScanOfDay = (todayValid.rowCount ?? 0) === 0;

    // その日の有効フレンド人数（rare・未発見重みの補正に使用・§7/§8）。
    const friendCountToday = await dailyFriendCount(client, req.userId, req.localDate);

    // レアリティ・キャラをサーバー側抽選（§6）。
    const character = await chooseNormalScanCharacter(client, req.userId, friendCountToday);
    const discoverySource = character.rarity === "prefecture" ? "prefecture_scan" : "normal_scan";

    // 採番・証明・記録・DP（共通処理）。
    const discoveryRecord = await finalizeDiscovery(client, {
      userId: req.userId,
      character,
      localDate: req.localDate,
      discoverySource,
      proofRoll: roll(req.sourceHash, "proof"),
      friendCountToday,
      isFirstValidScanOfDay,
      prefectureCode: req.prefectureCode,
      prefectureName: req.prefectureName
    });

    // scan_history（有効）作成＋ワールドブースト消費（通常スキャン固有）。
    await client.query(
      `INSERT INTO scan_history (id, user_id, source_hash, local_date, scan_type, is_valid_scan, discovery_record_id)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6)`,
      [`scan_${randomUUID()}`, req.userId, req.sourceHash, req.localDate, req.scanType, discoveryRecord.id]
    );
    await client.query(
      `UPDATE user_boosts SET remaining_valid_scans = remaining_valid_scans - 1,
         is_active = (remaining_valid_scans - 1 > 0),
         ended_at = CASE WHEN remaining_valid_scans - 1 <= 0 THEN NOW() ELSE ended_at END
       WHERE user_id = $1 AND is_active = TRUE`,
      [req.userId]
    );

    return { status: "discovered", discoveryRecord };
  });
