/**
 * 出現確率ロジック（初回リリース）。
 *
 * 方針:
 * - ノーマル発見を常に主役にする。別個体・レアは希少に保ち、必ず上限を設ける。
 * - 初心者目安 normal 95% / variant 4% / rare 1%。
 * - 上級者上限 normal 87% / variant 10% / rare 3%。
 * - 進捗（種族図鑑割合・総スキャン・連続スキャン・連続発見）に応じて、
 *   上限内で variant/rare がなだらかに上がる。
 * - すべて純粋関数。乱数は rng を注入できる（テスト容易化のため Math.random を直接埋め込まない）。
 */

export type DiscoveryType = "normal" | "variant" | "rare";

export type DiscoveryRate = {
  normalRate: number;
  variantRate: number;
  rareRate: number;
};

export type DiscoveryRateInput = {
  totalScans: number;
  discoveredSpeciesCount: number;
  totalSpeciesCount: number;
  scanStreak: number;
  discoveryStreak: number;
};

/** 乱数源。0以上1未満を返す。既定は Math.random。 */
export type Rng = () => number;

// 上限・下限（厳守）。
export const RARE_RATE_MIN = 0.01;
export const RARE_RATE_MAX = 0.03;
export const VARIANT_RATE_MIN = 0.04;
export const VARIANT_RATE_MAX = 0.1;
export const NORMAL_RATE_MIN = 0.87;

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return value > 1 ? 1 : value;
};

const lerp = (from: number, to: number, t: number): number => from + (to - from) * clamp01(t);

/**
 * 進捗度（0..1）を各シグナルの重み付き平均で求める。
 * 0＝初心者（初心者目安に一致）、1＝上級者（上限に一致）。
 */
const progressFactor = (input: DiscoveryRateInput): number => {
  const totalSpecies = Math.max(1, Math.floor(input.totalSpeciesCount || 0));
  const speciesProgress = clamp01(Math.max(0, input.discoveredSpeciesCount || 0) / totalSpecies);
  const scanProgress = clamp01(Math.max(0, input.totalScans || 0) / 1000);
  const scanStreakProgress = clamp01(Math.max(0, input.scanStreak || 0) / 14);
  const discoveryStreakProgress = clamp01(Math.max(0, input.discoveryStreak || 0) / 14);

  // 種族図鑑の進捗を最重視し、総スキャン・連続をなだらかに加味する。
  return clamp01(
    0.4 * speciesProgress + 0.3 * scanProgress + 0.15 * scanStreakProgress + 0.15 * discoveryStreakProgress
  );
};

/**
 * 出現確率を計算する。
 * - rareRate は [1%, 3%]、variantRate は [4%, 10%] の範囲で進捗に応じて上昇。
 * - normalRate = 1 - rare - variant（常に 87% 以上、合計は 1）。
 */
export const calculateDiscoveryRate = (input: DiscoveryRateInput): DiscoveryRate => {
  const p = progressFactor(input);

  // 上限内に必ず収める。
  const rareRate = Math.min(RARE_RATE_MAX, Math.max(RARE_RATE_MIN, lerp(RARE_RATE_MIN, RARE_RATE_MAX, p)));
  const variantRate = Math.min(
    VARIANT_RATE_MAX,
    Math.max(VARIANT_RATE_MIN, lerp(VARIANT_RATE_MIN, VARIANT_RATE_MAX, p))
  );
  // 残りがノーマル。上限（rare0.03+variant0.10）から normal は必ず 0.87 以上になる。
  const normalRate = 1 - rareRate - variantRate;

  return { normalRate, variantRate, rareRate };
};

/**
 * 確率から出現タイプを1つ選ぶ。
 * rare→variant→normal の順にしきい値判定する。rng は 0..1。
 */
export const selectDiscoveryType = (rate: DiscoveryRate, rng: Rng = Math.random): DiscoveryType => {
  const roll = rng();

  if (roll < rate.rareRate) {
    return "rare";
  }
  if (roll < rate.rareRate + rate.variantRate) {
    return "variant";
  }
  return "normal";
};

type MasterLike = { id: string; rarity: DiscoveryType };
/**
 * 指定タイプのキャラを1体選ぶ。
 * - 未所持優先はしない。所持済みも同じ候補に含めてランダムに選ぶ。
 * - 指定タイプが不在なら variant→normal の順にフォールバックする。
 */
export const selectCharacterByType = <M extends MasterLike>(
  type: DiscoveryType,
  masters: M[],
  _owned: { characterId: string }[],
  rng: Rng = Math.random
): M | undefined => {
  if (masters.length === 0) {
    return undefined;
  }

  const fallbackOrder: DiscoveryType[] = type === "rare" ? ["rare", "variant", "normal"] : type === "variant" ? ["variant", "normal"] : ["normal", "variant"];

  let candidates: M[] = [];
  for (const tier of fallbackOrder) {
    candidates = masters.filter((master) => master.rarity === tier);
    if (candidates.length > 0) {
      break;
    }
  }
  if (candidates.length === 0) {
    candidates = masters;
  }

  const index = Math.min(candidates.length - 1, Math.floor(clamp01(rng()) * candidates.length));
  return candidates[index];
};
