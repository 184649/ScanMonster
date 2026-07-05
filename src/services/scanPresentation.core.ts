/**
 * スキャン演出の純粋ロジック（テスト可能・型のみ import）。仕様: docs/SCAN_PRESENTATION.md。
 * サーバー応答待ちを吸収するためのフェーズ最小時間と、レアリティ/特別番号による差分を決める。
 */
import type { DifficultyRank, DiscoveryRarity, NumberValueRank } from "../types/discoveryRecord";
import type { DiscoveryResultRef } from "../types/discovery";

/** 演出のティア（レアリティ由来）。friend は将来拡張。 */
export type RevealTier = "normal" | "rare" | "secret" | "friend";

/** モンスターのレアリティ表現から演出ティアを決める。 */
export const resolveTier = (rarity: DiscoveryRarity | string | undefined): RevealTier => {
  if (rarity === "rare") return "rare";
  if (rarity === "secret") return "secret";
  if (rarity === "friend") return "friend";
  return "normal";
};

/** 特別番号・最強の証・高難度なら追加の盛り上げ（§7）。 */
export const isBigCelebration = (input: {
  numberValueRank?: NumberValueRank;
  difficultyRank?: DifficultyRank;
  strongestProof?: boolean;
}): boolean => {
  if (input.strongestProof) return true;
  if (input.numberValueRank === "premium" || input.numberValueRank === "legend") return true;
  if (input.difficultyRank === "SS" || input.difficultyRank === "SSS") return true;
  return false;
};

export type PhaseDurations = {
  /** Phase1 読み取り確定 */
  locked: number;
  /** Phase2 解析（この最小時間は必ず滞在し、超えてAPIが遅ければ待つ＝待機吸収） */
  analyzingMin: number;
  /** Phase3 出現前のため */
  preReveal: number;
};

const BASE: Record<RevealTier, PhaseDurations> = {
  normal: { locked: 350, analyzingMin: 750, preReveal: 500 },
  rare: { locked: 380, analyzingMin: 1000, preReveal: 900 },
  secret: { locked: 420, analyzingMin: 1200, preReveal: 1300 },
  friend: { locked: 380, analyzingMin: 1000, preReveal: 900 }
};

// Reduce Motion / 簡易演出時は全ティア短縮（体感時間を抑える・§8.2/§8.3）。
const REDUCED: PhaseDurations = { locked: 150, analyzingMin: 300, preReveal: 150 };

/** ティアとアクセシビリティ設定から各フェーズの時間を返す。 */
export const phaseDurations = (
  tier: RevealTier,
  opts: { reduceMotion?: boolean; simple?: boolean } = {}
): PhaseDurations => {
  if (opts.reduceMotion || opts.simple) {
    return REDUCED;
  }
  return BASE[tier];
};

/** 発見結果一覧の分類（新規/再発見が1件でもあれば discovered）。 */
export const classifyOutcome = (refs: DiscoveryResultRef[]): "discovered" | "duplicate" => {
  return refs.some((r) => r.kind !== "duplicate") ? "discovered" : "duplicate";
};

/** 公開対象（最初の新規/再発見）を選ぶ。無ければ undefined。 */
export const pickPrimaryRef = (refs: DiscoveryResultRef[]): DiscoveryResultRef | undefined =>
  refs.find((r) => r.kind !== "duplicate");
