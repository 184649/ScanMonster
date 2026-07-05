import type { RarityTier } from "../types/monster";

/** レア区分の表示ラベル（common / uncommon / rare / legend 相当）。 */
export const RARITY_TIER_LABEL: Record<RarityTier, string> = {
  normal: "コモン",
  uncommon: "アンコモン",
  rare: "レア",
  hiddenRare: "レジェンド"
};

export const getRarityTierLabel = (tier: RarityTier): string => RARITY_TIER_LABEL[tier] ?? "コモン";

/** レア区分の表示色。 */
export const RARITY_TIER_COLOR: Record<RarityTier, string> = {
  normal: "#64748B",
  uncommon: "#2877D9",
  rare: "#7C3AED",
  hiddenRare: "#D97706"
};
