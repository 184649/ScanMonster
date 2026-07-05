import type { DiscoveryType } from "../services/discoveryRate";
import type { UserMonster } from "../types/monster";

/**
 * 既存の個体データから「ノーマル / 別個体 / レア」の区分を導出する。
 * - 隠れレア（rareId あり）→ rare
 * - 通常個体でない（時間/季節/希少の個体バリアント、または rarity>=3）→ variant
 * - それ以外 → normal
 */
export const getMonsterDiscoveryType = (monster: UserMonster): DiscoveryType => {
  if (monster.rareId || monster.characterRarity === "rare") {
    return "rare";
  }
  // 新ワールド構成のカタログ由来キャラは normal/rare の2層（別個体は廃止）。
  if (monster.worldGroup) {
    return "normal";
  }
  const key = monster.dna.individualVariantKey;
  const isVariant = (key !== undefined && key !== "common") || monster.dna.rarity >= 3;
  return isVariant ? "variant" : "normal";
};

export const DISCOVERY_TYPE_LABEL: Record<DiscoveryType, string> = {
  normal: "ノーマル",
  variant: "別個体",
  rare: "レア"
};

/** チップ背景色（白基調＋黄色アクセントに調和）。 */
export const DISCOVERY_TYPE_CHIP: Record<DiscoveryType, string> = {
  normal: "#F1F5F9",
  variant: "#E0F2FE",
  rare: "#FEF3C7"
};
