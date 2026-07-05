import {
  RARE_CONDITION_MULTIPLIER,
  RARE_RATE_CAP,
  getRareRulesForFamily,
  type RareMonsterKey,
  type RareSpawnContext,
  type RareSpawnRule
} from "../constants/rareRules";
import { valueFromHash } from "./randomFromHash";

export type RareSpawnEvaluation = {
  rareKey: RareMonsterKey;
  /** 適用後の出現確率（デバッグ・表示用）。 */
  effectiveRate: number;
  /** 満たした条件の説明。 */
  metConditions: string[];
};

/** ルール単位の実効確率を計算する。条件を満たすごとに少しだけ上がる（上限あり）。 */
const computeEffectiveRate = (rule: RareSpawnRule, ctx: RareSpawnContext): { rate: number; met: string[] } => {
  const met = rule.bonusConditions.filter((condition) => condition.test(ctx));
  const multiplier = 1 + met.length * RARE_CONDITION_MULTIPLIER;
  const rate = Math.min(RARE_RATE_CAP, rule.baseRate * multiplier);
  return { rate, met: met.map((condition) => condition.label) };
};

/**
 * レア出現を判定する。
 *
 * - sourceHash からベース種族が決まったうえで呼ぶ。
 * - 乱数源は variantSeed（同じコードでも日付・時刻で変わる）。
 * - 条件を満たすと確率が少し上がるが、満たしても必ず出るわけではない。
 * - 同じベース種族に複数のレアがある場合（ヒト系）は、より珍しい（baseRate が低い）順に判定する。
 *
 * @returns 当選したレアキー、なければ undefined
 */
export const evaluateRareSpawn = (ctx: RareSpawnContext): RareSpawnEvaluation | undefined => {
  const rules = getRareRulesForFamily(ctx.baseFamilyId);

  if (rules.length === 0) {
    return undefined;
  }

  // より珍しい（baseRate が低い）レアから先に判定する。
  const ordered = [...rules].sort((a, b) => a.baseRate - b.baseRate);

  // ルールごとに独立した乱数オフセットを使う。
  let offset = 64;

  for (const rule of ordered) {
    const { rate, met } = computeEffectiveRate(rule, ctx);
    const roll = valueFromHash(ctx.variantSeed, 0, 999999, offset) / 1000000;
    offset += 7;

    if (roll < rate) {
      return { rareKey: rule.rareKey, effectiveRate: rate, metConditions: met };
    }
  }

  return undefined;
};
