/**
 * 発見難度・発見ランク・称号の純粋判定（仕様 §17/§19/§12/§23）。
 * 型のみ import（bundler / node:test 双方で安全）。チューニング値(DP/確率/節目)は
 * discoveryConfig.ts 側に置く。
 */
import type {
  CharacterTitle,
  DifficultyRank,
  DiscoveryNumberBadge,
  DiscoveryRarity,
  NumberTag,
  NumberValueRank
} from "../types/discoveryRecord";

const DIFFICULTY_ORDER: DifficultyRank[] = ["C", "B", "A", "S", "SS", "SSS"];

export const difficultyIndex = (rank: DifficultyRank): number => DIFFICULTY_ORDER.indexOf(rank);
export const difficultyFromIndex = (index: number): DifficultyRank =>
  DIFFICULTY_ORDER[Math.max(0, Math.min(DIFFICULTY_ORDER.length - 1, index))]!;
/** a が b 以上の難度か。 */
export const difficultyAtLeast = (a: DifficultyRank, b: DifficultyRank): boolean =>
  difficultyIndex(a) >= difficultyIndex(b);

const NUMBER_VALUE_BUMP: Record<NumberValueRank, number> = {
  normal: 0,
  memorial: 0,
  rare: 1,
  premium: 1,
  legend: 2
};

export type DifficultyInput = {
  rarity: DiscoveryRarity;
  isRediscovery: boolean;
  numberValueRank: NumberValueRank;
  hasStrongestProof: boolean;
  isMilestone: boolean;
};

/** 発見難度を決定する（§17）。 */
export const computeDifficulty = (input: DifficultyInput): DifficultyRank => {
  // ベース: 最強の証>SS、レア>A、新規ノーマル>B、通常再発見>C。
  let index = input.hasStrongestProof ? 4 : input.rarity === "rare" ? 2 : input.isRediscovery ? 0 : 1;

  // 番号価値による上昇。
  index = Math.min(5, index + NUMBER_VALUE_BUMP[input.numberValueRank]);

  // 節目再発見は最低でもB。
  if (input.isMilestone && input.isRediscovery) {
    index = Math.max(index, 1);
  }

  // 最強の証 + 強い番号でSSS。
  if (input.hasStrongestProof && input.numberValueRank === "legend") {
    index = Math.max(index, 5);
  }
  if (
    input.hasStrongestProof &&
    input.rarity === "rare" &&
    (input.numberValueRank === "premium" || input.numberValueRank === "legend")
  ) {
    index = 5;
  }

  return difficultyFromIndex(index);
};

/** 最強の証を付与するか（roll01 < chance）。chance は discoveryConfig で算出。 */
export const shouldGrantStrongestProof = (roll01: number, chance: number): boolean => roll01 < chance;

export type DiscoveryRankInput = {
  difficultyRank: DifficultyRank;
  hasStrongestProof: boolean;
  isNewForUser: boolean;
};

/** 発見結果そのもののランク表示ラベル（§19）。 */
export const discoveryRankLabel = (input: DiscoveryRankInput): string => {
  if (input.difficultyRank === "SSS") return "奇跡の発見";
  if (input.hasStrongestProof) return "称号付き発見";
  if (input.difficultyRank === "SS" || input.difficultyRank === "S") return "超希少発見";
  if (input.difficultyRank === "A") return "希少発見";
  if (input.isNewForUser) return "新規発見";
  return "通常発見";
};

/** 節目回数に対応する再会称号（§23）。10/50/100 のみ称号化。 */
export const milestoneTitle = (count: number): CharacterTitle | undefined => {
  if (count === 10) return "reunion_10";
  if (count === 50) return "reunion_50";
  if (count === 100) return "reunion_100";
  return undefined;
};

/** 番号タグから番号系の称号を導く。 */
export const numberTagTitles = (tags: NumberTag[]): CharacterTitle[] => {
  const titles: CharacterTitle[] = [];
  if (tags.includes("lucky7")) titles.push("lucky_number");
  if (tags.includes("repdigit")) titles.push("repdigit_number");
  if (tags.includes("round")) titles.push("round_number");
  if (tags.includes("early")) titles.push("early_discoverer");
  return titles;
};

/**
 * 1発見で付与される全キャラクター称号を集約する（重複なし）。
 * strongest_proof は最高位（§12.2）。
 */
export const collectGrantedTitles = (params: {
  badge: DiscoveryNumberBadge;
  hasStrongestProof: boolean;
  discoveryCount: number;
  isRediscovery: boolean;
}): CharacterTitle[] => {
  const titles = new Set<CharacterTitle>();
  if (params.hasStrongestProof) {
    titles.add("strongest_proof");
  }
  for (const title of numberTagTitles(params.badge.tags)) {
    titles.add(title);
  }
  if (params.isRediscovery) {
    const reunion = milestoneTitle(params.discoveryCount);
    if (reunion) {
      titles.add(reunion);
    }
  }
  return [...titles];
};
