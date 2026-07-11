/**
 * 日次フレンド交流にもとづく発見補正（純粋・テスト可能）。仕様 §6〜§11。
 *
 * 【設計の要点】
 *  - その日の有効フレンド人数（新規＋既存、同一相手は1日1回）を 0..100 に丸めて使う。
 *  - 未発見キャラの「重み」を 1人ごとに +0.02 して上げる（確率固定ではない・§7）。
 *  - rare の確率を 10人ごとに +0.2pt 上げ、増分は normal から差し引く（§8）。
 *  - 内部の未知の出現相当(secret) はフレンド人数では増やさない（固定 §8）。
 *  - 都道府県は初期リリースでは通常抽選に入れない（§13）。enum/構造は残す。
 *  - ユーザーには倍率も確率も secret も見せない（表示は Lv と文言のみ・§11/§12）。
 */

import type { ScanRarity } from "./rates.ts";

/** 1日の確率補正対象の上限人数（§6）。 */
export const DAILY_FRIEND_CAP = 100;

/** 初期リリースの通常出現の基本確率（§8）。都道府県は通常抽選に入れない＝0。 */
export const INITIAL_BASE_RATES = { normal: 0.968, rare: 0.03, prefecture: 0, secret: 0.002 } as const;

/** その日の有効フレンド人数を 0..100 に丸める（§6：min(count,100)）。 */
export const effectiveFriendCount = (validFriendCountToday: number): number => {
  const n = Math.max(0, Math.floor(validFriendCountToday));
  return Math.min(n, DAILY_FRIEND_CAP);
};

/**
 * 未発見キャラの抽選重み倍率（§7）。
 *  unseenWeightMultiplier = 1 + min(count,100) * 0.02   （0人=1.00 … 100人=3.00）
 * これは確率そのものではなく、候補内の未発見キャラに掛ける「重み」。
 */
export const unseenWeightMultiplier = (validFriendCountToday: number): number =>
  1 + effectiveFriendCount(validFriendCountToday) * 0.02;

/**
 * その日の rare 確率（§8）。
 *  rareRate = 0.03 + floor(min(count,100)/10) * 0.002   （0〜9人=3.0% … 100人=5.0%）
 * 上限 5.0%。増分は normal から差し引く。secret は据え置き。
 */
export const dailyRareRate = (validFriendCountToday: number): number => {
  const c = effectiveFriendCount(validFriendCountToday);
  const rate = INITIAL_BASE_RATES.rare + Math.floor(c / 10) * 0.002;
  return Math.min(rate, 0.05);
};

/**
 * 伝説キャラの出現確率（段3 §10）。legendaryUnlocked の場合のみ意味を持つ（呼び出し側でゲート）。
 *  legendaryRate = min(0.10, 0.01 + min(count,100) * 0.0009)   （0人=1.0% … 100人=10.0%）
 */
export const legendaryRate = (validFriendCountToday: number): number =>
  Math.min(0.1, 0.01 + effectiveFriendCount(validFriendCountToday) * 0.0009);

/**
 * 通常スキャン/フレンド発見のレアリティ分布（段3 §7〜§12）。合計1.0を必ず維持。
 *  - prefecture は通常抽選に入れない（0・§13）。
 *  - secret は 0.2% 固定（フレンド人数で増えない・§11）。
 *  - rare はフレンド人数で上昇（§9）。
 *  - legendary は legendaryUnlocked のときだけ上昇、未解放なら必ず 0%（§10）。
 *  - 増分（rare + legendary）は normal から差し引く（§12）。
 */
export const scanDistribution = (input: {
  friendCountToday: number;
  legendaryUnlocked: boolean;
}): Record<ScanRarity, number> => {
  const rare = dailyRareRate(input.friendCountToday);
  const secret = INITIAL_BASE_RATES.secret;
  const prefecture = 0;
  const legendary = input.legendaryUnlocked ? legendaryRate(input.friendCountToday) : 0;
  const normal = 1 - rare - legendary - prefecture - secret;
  return { normal, rare, legendary, prefecture, secret };
};

/** 後方互換: 伝説未解放時の分布（既存テスト・呼び出し用）。 */
export const initialScanDistribution = (validFriendCountToday: number): Record<ScanRarity, number> =>
  scanDistribution({ friendCountToday: validFriendCountToday, legendaryUnlocked: false });

/**
 * 候補内の未発見キャラに重み補正をかけて1体選ぶ（§7.1/§9-5）。
 *  - 未発見キャラの重み = 1 × unseenWeightMultiplier
 *  - 発見済みキャラの重み = 1
 *  roll01 (0..1) で加重抽選する。候補が空なら null。
 */
export const pickWeightedByUnseen = <T>(
  candidates: readonly T[],
  isUnseen: (c: T) => boolean,
  multiplier: number,
  roll01: number
): T | null => {
  if (candidates.length === 0) return null;
  const weights = candidates.map((c) => (isUnseen(c) ? multiplier : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[0] ?? null;
  const target = Math.min(Math.max(roll01, 0), 0.9999999) * total;
  let acc = 0;
  for (let i = 0; i < candidates.length; i++) {
    acc += weights[i] ?? 0;
    if (target < acc) return candidates[i] ?? null;
  }
  return candidates[candidates.length - 1] ?? null;
};

/**
 * UI 表示用のフレンド効果レベル（§11：粗い大分類）。確率や倍率は出さない。
 *  0人 / 1〜9 / 10〜29 / 30〜59 / 60〜99 / 100 の6段階。
 */
export type FriendDailyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const friendDailyLevel = (validFriendCountToday: number): FriendDailyLevel => {
  const c = effectiveFriendCount(validFriendCountToday);
  if (c >= 100) return 5;
  if (c >= 60) return 4;
  if (c >= 30) return 3;
  if (c >= 10) return 2;
  if (c >= 1) return 1;
  return 0;
};

/** レベルに応じた文言（数値・secret を出さない・§11/§12）。 */
export const friendDailyMessage = (level: FriendDailyLevel): string => {
  switch (level) {
    case 5:
      return "珍しい発見の気配が最高潮に高まっています";
    case 4:
      return "珍しい発見の気配が強まっています";
    case 3:
      return "まだ見ぬキャラの気配が高まっています";
    case 2:
      return "新しい発見の気配があります";
    case 1:
      return "交流が、新しい発見の気配を高めています";
    default:
      return "フレンドQRを読み合うと、発見に良い影響があります";
  }
};
