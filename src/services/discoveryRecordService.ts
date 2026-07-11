/**
 * 発見記録の生成・キャラ記録更新・永続化（仕様 §9/§18/§20/§21/§23）。
 * 純粋判定は numberValue.core / discoveryJudge.core、チューニング値は discoveryConfig。
 * 採番は numberingService に委譲する（発見処理に直書きしない：§34）。
 */
import { isRediscoveryMilestone, strongestProofChance } from "../config/discoveryConfig";
import type {
  CharacterRecord,
  CharacterTitle,
  DifficultyRank,
  DiscoveryNumberBadge,
  DiscoveryRarity,
  DiscoveryRecord,
  NumberValueRank
} from "../types/discoveryRecord";
import {
  collectGrantedTitles,
  computeDifficulty,
  difficultyAtLeast,
  difficultyIndex,
  discoveryRankLabel,
  shouldGrantStrongestProof
} from "./discoveryJudge.core";
import { buildCharacterNumberBadge } from "./numberValue.core";
import { numberingService } from "./numberingService";
import { storageService } from "./storageService";

const NUMBER_VALUE_ORDER: NumberValueRank[] = ["normal", "memorial", "rare", "premium", "legend"];
const numberValueIndex = (rank: NumberValueRank): number => NUMBER_VALUE_ORDER.indexOf(rank);

const TITLE_PRIORITY: CharacterTitle[] = [
  "strongest_proof",
  "early_discoverer",
  "lucky_number",
  "repdigit_number",
  "round_number",
  "reunion_100",
  "reunion_50",
  "reunion_10"
];

/** 称号集合から代表称号を選ぶ（最強の証が最優先）。 */
export const pickActiveTitle = (titles: CharacterTitle[]): CharacterTitle | undefined =>
  TITLE_PRIORITY.find((title) => titles.includes(title));

export type BuildDiscoveryInput = {
  id: string;
  characterId: string;
  characterName: string;
  imageKey: string;
  worldGroup?: string;
  rarity: DiscoveryRarity;
  discoveredAt: string;
  localDate: string;
  isRediscovery: boolean;
  /** この発見を含めた累計発見回数。 */
  discoveryCount: number;
  characterDiscoveryNo: string;
  dpGained: number;
  /** 最強の証の抽選値 0..1（決定的シードから供給）。 */
  roll01: number;
  /** 番号の出所。既定 "local"（暫定）。サーバー採番結果は "server"。 */
  numberSource?: "server" | "local";
};

/** 発見証明（DiscoveryRecord）を組み立てる。 */
export const buildDiscoveryRecord = (input: BuildDiscoveryInput): DiscoveryRecord => {
  // 若い番号・ゾロ目などは番号レア度として扱う（暫定/公式にかかわらず表示）。
  const badge = buildCharacterNumberBadge(input.characterDiscoveryNo);
  const isNewForUser = !input.isRediscovery;
  const isMilestone = input.isRediscovery && isRediscoveryMilestone(input.discoveryCount);
  const chance = strongestProofChance(input.rarity, badge.valueRank);
  const strongestProof = shouldGrantStrongestProof(input.roll01, chance);
  const difficultyRank = computeDifficulty({
    rarity: input.rarity,
    isRediscovery: input.isRediscovery,
    numberValueRank: badge.valueRank,
    hasStrongestProof: strongestProof,
    isMilestone
  });
  const grantedCharacterTitles = collectGrantedTitles({
    badge,
    hasStrongestProof: strongestProof,
    discoveryCount: input.discoveryCount,
    isRediscovery: input.isRediscovery
  });
  const rankLabel = discoveryRankLabel({ difficultyRank, hasStrongestProof: strongestProof, isNewForUser });
  const notable = badge.valueRank !== "normal";

  return {
    id: input.id,
    certificateId: input.id,
    characterId: input.characterId,
    characterName: input.characterName,
    imageKey: input.imageKey,
    worldGroup: input.worldGroup,
    rarity: input.rarity,
    discoveredAt: input.discoveredAt,
    localDate: input.localDate,
    isNewForUser,
    isRediscovery: input.isRediscovery,
    difficultyRank,
    characterDiscoveryNo: input.characterDiscoveryNo,
    numberBadges: notable ? [badge] : [],
    primaryNumberBadge: notable ? badge : undefined,
    grantedCharacterTitles,
    strongestProof,
    discoveryRankLabel: rankLabel,
    dpGained: input.dpGained,
    numberSource: input.numberSource ?? "local"
  };
};

/** 代表発見証明を選ぶための比較スコア。 */
export const representativeScore = (record: DiscoveryRecord): number =>
  difficultyIndex(record.difficultyRank) * 100 +
  numberValueIndex(record.primaryNumberBadge?.valueRank ?? "normal") * 10 +
  (record.strongestProof ? 5 : 0);

const mergeBadges = (
  existing: DiscoveryNumberBadge[],
  badge: DiscoveryNumberBadge | undefined
): DiscoveryNumberBadge[] => {
  if (!badge) return existing;
  if (existing.some((item) => item.number === badge.number && item.numberScope === badge.numberScope)) {
    return existing;
  }
  return [badge, ...existing];
};

/** 発見証明を CharacterRecord に反映する（新規・再発見どちらも）。 */
export const applyDiscoveryToCharacterRecord = (
  existing: CharacterRecord | undefined,
  record: DiscoveryRecord
): CharacterRecord => {
  const score = representativeScore(record);

  if (!existing) {
    return {
      characterId: record.characterId,
      firstDiscoveredAt: record.discoveredAt,
      lastDiscoveredAt: record.discoveredAt,
      discoveryCount: 1,
      bestDifficultyRank: record.difficultyRank,
      titles: [...record.grantedCharacterTitles],
      activeTitle: pickActiveTitle(record.grantedCharacterTitles),
      representativeDiscoveryId: record.id,
      representativeScore: score,
      firstDiscoveryId: record.id,
      latestDiscoveryId: record.id,
      numberBadges: record.primaryNumberBadge ? [record.primaryNumberBadge] : []
    };
  }

  const titles = [...new Set<CharacterTitle>([...existing.titles, ...record.grantedCharacterTitles])];
  const bestDifficultyRank: DifficultyRank = difficultyAtLeast(record.difficultyRank, existing.bestDifficultyRank)
    ? record.difficultyRank
    : existing.bestDifficultyRank;
  const takeNewRepresentative = score >= existing.representativeScore;

  return {
    ...existing,
    lastDiscoveredAt: record.discoveredAt,
    discoveryCount: existing.discoveryCount + 1,
    bestDifficultyRank,
    titles,
    activeTitle: pickActiveTitle(titles) ?? existing.activeTitle,
    representativeDiscoveryId: takeNewRepresentative ? record.id : existing.representativeDiscoveryId,
    representativeScore: Math.max(score, existing.representativeScore),
    latestDiscoveryId: record.id,
    numberBadges: mergeBadges(existing.numberBadges, record.primaryNumberBadge)
  };
};

export type RecordDiscoveryParams = {
  id: string;
  characterId: string;
  characterName: string;
  imageKey: string;
  worldGroup?: string;
  rarity: DiscoveryRarity;
  discoveredAt: string;
  localDate: string;
  dpGained: number;
  roll01: number;
};

/**
 * 有効スキャン確定時に発見記録を生成・永続化する。
 * 端末内トランザクション相当（採番→記録→キャラ記録の順で保存）。
 */
export const recordDiscovery = async (
  params: RecordDiscoveryParams
): Promise<{ record: DiscoveryRecord; characterRecord: CharacterRecord }> => {
  const existing = await storageService.getCharacterRecordById(params.characterId);
  const isRediscovery = Boolean(existing);
  const discoveryCount = (existing?.discoveryCount ?? 0) + 1;
  const characterDiscoveryNo = await numberingService.issueCharacterDiscoveryNo(params.characterId);

  const record = buildDiscoveryRecord({
    ...params,
    isRediscovery,
    discoveryCount,
    characterDiscoveryNo
  });
  const characterRecord = applyDiscoveryToCharacterRecord(existing, record);

  await storageService.saveDiscoveryRecord(record);
  await storageService.saveCharacterRecord(characterRecord);

  return { record, characterRecord };
};
