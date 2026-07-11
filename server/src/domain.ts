/**
 * WORLDAWN サーバードメイン（純粋ロジック）。仕様 §16/§17/§12/§13/§23。
 * アプリ側 src/services/numberValue.core.ts / discoveryJudge.core.ts と同一仕様。
 * 外部依存なし → `node --test` でそのまま検証できる。
 */

export type DiscoveryRarity = "normal" | "rare" | "legendary" | "prefecture" | "secret" | "friend" | "variant" | "limited";
export type DifficultyRank = "C" | "B" | "A" | "S" | "SS" | "SSS";
export type NumberValueRank = "normal" | "memorial" | "rare" | "premium" | "legend";
export type NumberTag =
  | "early"
  | "round"
  | "repdigit"
  | "sequential"
  | "reverse_sequential"
  | "palindrome"
  | "lucky7"
  | "year";
export type CharacterTitle =
  | "strongest_proof"
  | "early_discoverer"
  | "lucky_number"
  | "repdigit_number"
  | "round_number"
  | "reunion_10"
  | "reunion_50"
  | "reunion_100";
export type NumberScope = "character" | "world" | "event" | "friend_link";
export type DiscoveryNumberBadge = {
  numberScope: NumberScope;
  number: string;
  label: string;
  tags: NumberTag[];
  valueRank: NumberValueRank;
};

// ===== 設定値（可変・§11/§12.4/§13） =====
export const DISCOVERY_DP = {
  normalFirst: 30,
  normalRediscovery: 5,
  rareFirst: 100,
  rareRediscovery: 20,
  firstValidScanOfDay: 20
} as const;
export const REDISCOVERY_MILESTONES = [10, 50, 100, 777, 1000];
export const RARE_APPEARANCE_RATE = { min: 0.02, max: 0.03 } as const;
export const STRONGEST_PROOF_RATE = {
  base: 0.002,
  numberRareOrAbove: 0.005,
  numberPremiumOrAbove: 0.01,
  rareAndNumberPremiumOrAbove: 0.02
} as const;
export const WORLD_UNLOCK_COSTS = [0, 1000, 2300, 4200, 7000, 11000];
export const WORLD_BOOST = { cost: 300, validScans: 10 } as const;

// ===== 番号価値 =====
const VALUE_ORDER: NumberValueRank[] = ["normal", "memorial", "rare", "premium", "legend"];
const valueIndex = (r: NumberValueRank): number => VALUE_ORDER.indexOf(r);

export const normalizeDigits = (noStr: string): string => {
  const only = (noStr ?? "").replace(/[^0-9]/g, "");
  const trimmed = only.replace(/^0+/, "");
  return trimmed.length > 0 ? trimmed : only.length > 0 ? "0" : "";
};

const isRepdigit = (s: string) => s.length >= 2 && /^(\d)\1+$/.test(s);
const isLucky7 = (s: string) => /^7+$/.test(s);
const isRound = (s: string) => /^[1-9]0+$/.test(s);
const isSequential = (s: string) => {
  if (s.length < 3) return false;
  for (let i = 1; i < s.length; i++) if (s.charCodeAt(i) !== s.charCodeAt(i - 1) + 1) return false;
  return true;
};
const isReverseSequential = (s: string) => {
  if (s.length < 3) return false;
  for (let i = 1; i < s.length; i++) if (s.charCodeAt(i) !== s.charCodeAt(i - 1) - 1) return false;
  return true;
};
const isPalindrome = (s: string) => s.length >= 3 && s === s.split("").reverse().join("");
const isYear = (s: string) => s.length === 4 && Number(s) >= 1900 && Number(s) <= 2099;
const isEarly = (s: string) => s.length <= 2 && Number(s) <= 10;

export const collectNumberTags = (noStr: string): NumberTag[] => {
  const s = normalizeDigits(noStr);
  if (s.length === 0 || s === "0") return [];
  const tags: NumberTag[] = [];
  if (isEarly(s)) tags.push("early");
  if (isRound(s)) tags.push("round");
  if (isRepdigit(s)) tags.push("repdigit");
  if (isSequential(s)) tags.push("sequential");
  if (isReverseSequential(s)) tags.push("reverse_sequential");
  if (isPalindrome(s) && !isRepdigit(s)) tags.push("palindrome");
  if (isLucky7(s)) tags.push("lucky7");
  if (isYear(s)) tags.push("year");
  return tags;
};

export const judgeNumberValueRank = (noStr: string): NumberValueRank => {
  const s = normalizeDigits(noStr);
  if (s.length === 0 || s === "0") return "normal";
  const len = s.length;
  const value = len <= 4 ? Number(s) : NaN;
  let rank: NumberValueRank = "normal";
  const bump = (r: NumberValueRank) => {
    if (valueIndex(r) > valueIndex(rank)) rank = r;
  };
  if (value === 1) bump("legend");
  if (isLucky7(s) && len === 1) bump("legend");
  if (isYear(s)) bump("legend");
  if (value >= 2 && value <= 9) bump("premium");
  if (isLucky7(s) && len >= 2) bump("premium");
  if (isRound(s)) {
    if (value === 100) bump("rare");
    else if (len >= 4) bump("premium");
    else bump("memorial");
  }
  if (isRepdigit(s) && !isLucky7(s)) bump(len === 2 ? "memorial" : "rare");
  if (isSequential(s)) bump(len === 3 ? "rare" : "premium");
  if (isReverseSequential(s)) bump(len === 3 ? "rare" : "premium");
  if (isPalindrome(s) && !isRepdigit(s)) bump("rare");
  return rank;
};

const LABEL_PRIORITY: { tag: NumberTag; label: string }[] = [
  { tag: "lucky7", label: "ラッキーセブン" },
  { tag: "year", label: "年号番号" },
  { tag: "early", label: "若い番号" },
  { tag: "sequential", label: "連番" },
  { tag: "reverse_sequential", label: "逆連番" },
  { tag: "palindrome", label: "ミラー番号" },
  { tag: "repdigit", label: "ゾロ目" },
  { tag: "round", label: "キリ番" }
];

export const numberValueLabel = (tags: NumberTag[]): string =>
  LABEL_PRIORITY.find((e) => tags.includes(e.tag))?.label ?? "通常番号";

export const buildCharacterNumberBadge = (noStr: string): DiscoveryNumberBadge => {
  const tags = collectNumberTags(noStr);
  return {
    numberScope: "character",
    number: noStr,
    label: numberValueLabel(tags),
    tags,
    valueRank: judgeNumberValueRank(noStr)
  };
};

export const formatDiscoveryNo = (noStr: string): string => {
  const s = normalizeDigits(noStr);
  return `No.${(s.length === 0 ? "0" : s).padStart(3, "0")}`;
};

// ===== 難度・称号・DP =====
const DIFFICULTY_ORDER: DifficultyRank[] = ["C", "B", "A", "S", "SS", "SSS"];
export const difficultyIndex = (r: DifficultyRank): number => DIFFICULTY_ORDER.indexOf(r);
export const difficultyFromIndex = (i: number): DifficultyRank =>
  DIFFICULTY_ORDER[Math.max(0, Math.min(5, i))]!;
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

const ELEVATED_RARITY = new Set<DiscoveryRarity>(["rare", "legendary", "prefecture", "secret"]);

export const computeDifficulty = (input: DifficultyInput): DifficultyRank => {
  let index = input.hasStrongestProof ? 4 : ELEVATED_RARITY.has(input.rarity) ? 2 : input.isRediscovery ? 0 : 1;
  index = Math.min(5, index + NUMBER_VALUE_BUMP[input.numberValueRank]);
  if (input.isMilestone && input.isRediscovery) index = Math.max(index, 1);
  if (input.hasStrongestProof && input.numberValueRank === "legend") index = Math.max(index, 5);
  if (
    input.hasStrongestProof &&
    input.rarity === "rare" &&
    (input.numberValueRank === "premium" || input.numberValueRank === "legend")
  ) {
    index = 5;
  }
  return difficultyFromIndex(index);
};

export const strongestProofChance = (rarity: DiscoveryRarity, valueRank: NumberValueRank): number => {
  const atLeast = (t: NumberValueRank) => valueIndex(valueRank) >= valueIndex(t);
  if (rarity === "rare" && atLeast("premium")) return STRONGEST_PROOF_RATE.rareAndNumberPremiumOrAbove;
  if (atLeast("premium")) return STRONGEST_PROOF_RATE.numberPremiumOrAbove;
  if (atLeast("rare")) return STRONGEST_PROOF_RATE.numberRareOrAbove;
  return STRONGEST_PROOF_RATE.base;
};

export const shouldGrantStrongestProof = (roll01: number, chance: number): boolean => roll01 < chance;

export const isRediscoveryMilestone = (count: number): boolean => REDISCOVERY_MILESTONES.includes(count);

export const milestoneTitle = (count: number): CharacterTitle | undefined =>
  count === 10 ? "reunion_10" : count === 50 ? "reunion_50" : count === 100 ? "reunion_100" : undefined;

export const numberTagTitles = (tags: NumberTag[]): CharacterTitle[] => {
  const titles: CharacterTitle[] = [];
  if (tags.includes("lucky7")) titles.push("lucky_number");
  if (tags.includes("repdigit")) titles.push("repdigit_number");
  if (tags.includes("round")) titles.push("round_number");
  if (tags.includes("early")) titles.push("early_discoverer");
  return titles;
};

export const collectGrantedTitles = (params: {
  badge: DiscoveryNumberBadge;
  hasStrongestProof: boolean;
  discoveryCount: number;
  isRediscovery: boolean;
}): CharacterTitle[] => {
  const titles = new Set<CharacterTitle>();
  if (params.hasStrongestProof) titles.add("strongest_proof");
  for (const t of numberTagTitles(params.badge.tags)) titles.add(t);
  if (params.isRediscovery) {
    const r = milestoneTitle(params.discoveryCount);
    if (r) titles.add(r);
  }
  return [...titles];
};

export const discoveryRankLabel = (input: {
  difficultyRank: DifficultyRank;
  hasStrongestProof: boolean;
  isNewForUser: boolean;
}): string => {
  if (input.difficultyRank === "SSS") return "奇跡の発見";
  if (input.hasStrongestProof) return "称号付き発見";
  if (input.difficultyRank === "SS" || input.difficultyRank === "S") return "超希少発見";
  if (input.difficultyRank === "A") return "希少発見";
  if (input.isNewForUser) return "新規発見";
  return "通常発見";
};

export type DiscoveryDpBreakdown = { base: number; daily: number; total: number };
export const computeDiscoveryDp = (input: {
  rarity: DiscoveryRarity;
  isRediscovery: boolean;
  isFirstValidScanOfDay: boolean;
}): DiscoveryDpBreakdown => {
  const isRare = input.rarity === "rare";
  const base = isRare
    ? input.isRediscovery
      ? DISCOVERY_DP.rareRediscovery
      : DISCOVERY_DP.rareFirst
    : input.isRediscovery
      ? DISCOVERY_DP.normalRediscovery
      : DISCOVERY_DP.normalFirst;
  const daily = input.isFirstValidScanOfDay ? DISCOVERY_DP.firstValidScanOfDay : 0;
  return { base, daily, total: base + daily };
};
