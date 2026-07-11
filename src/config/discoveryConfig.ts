/**
 * 発見系のチューニング値（設定値で変更可能：仕様 §11/§12.4/§13/§39-13）。
 * レア率・最強の証率・DP・ワールド解放コストを一箇所に集約する。
 * デバッグ時の上書きは settings.debugForceRarity 等と併用する。
 */
import type { DiscoveryRarity, NumberValueRank } from "../types/discoveryRecord";

/** レア出現率（目安）。上限3%基本。開発中は変更しやすいよう定数化。 */
export const RARE_APPEARANCE_RATE = {
  min: 0.02,
  max: 0.03
} as const;

/** DP報酬（§13）。 */
export const DISCOVERY_DP = {
  normalFirst: 30,
  normalRediscovery: 5,
  rareFirst: 100,
  rareRediscovery: 20,
  firstValidScanOfDay: 20
} as const;

/** 節目再発見の回数（§23）。 */
export const REDISCOVERY_MILESTONES = [10, 50, 100, 777, 1000] as const;

/** その発見回数が節目再発見か（§23）。 */
export const isRediscoveryMilestone = (count: number): boolean =>
  (REDISCOVERY_MILESTONES as readonly number[]).includes(count);

export type DiscoveryDpBreakdown = { base: number; daily: number; total: number };

/** 有効スキャン1回の発見DPを算出（§13）。同日初回は +20DP。 */
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

/**
 * 最強の証 付与率（§12.4）。番号価値が高いほど上がる。
 * A相当以上＝valueRank rare 以上、S相当以上＝premium 以上に対応させる。
 */
export const STRONGEST_PROOF_RATE = {
  base: 0.002,
  numberRareOrAbove: 0.005,
  numberPremiumOrAbove: 0.01,
  rareAndNumberPremiumOrAbove: 0.02
} as const;

const NUMBER_VALUE_ORDER: NumberValueRank[] = ["normal", "memorial", "rare", "premium", "legend"];

/** valueRank a が b 以上かを返す。 */
export const numberValueAtLeast = (value: NumberValueRank, threshold: NumberValueRank): boolean =>
  NUMBER_VALUE_ORDER.indexOf(value) >= NUMBER_VALUE_ORDER.indexOf(threshold);

/** rarity + 番号価値から 最強の証 の付与確率を返す。 */
export const strongestProofChance = (rarity: DiscoveryRarity, valueRank: NumberValueRank): number => {
  const isRare = rarity === "rare";
  if (isRare && numberValueAtLeast(valueRank, "premium")) {
    return STRONGEST_PROOF_RATE.rareAndNumberPremiumOrAbove;
  }
  if (numberValueAtLeast(valueRank, "premium")) {
    return STRONGEST_PROOF_RATE.numberPremiumOrAbove;
  }
  if (numberValueAtLeast(valueRank, "rare")) {
    return STRONGEST_PROOF_RATE.numberRareOrAbove;
  }
  return STRONGEST_PROOF_RATE.base;
};

/** ワールド解放コスト（§8）。0=無料。null=これ以上解放不可。 */
export const WORLD_UNLOCK_COSTS = [0, 1000, 2300, 4200, 7000, 11000] as const;

/** ワールドブースト（§14）。 */
export const WORLD_BOOST = {
  cost: 300,
  validScans: 10
} as const;
