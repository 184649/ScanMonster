/**
 * 通常スキャンのレアリティ確率モデル（純粋・テスト可能）。仕様 §2〜§5。
 * 初回リリースの抽選対象は normal / rare / prefecture / secret のみ。
 * variant / limited は抽選対象外（含めない）。friend は通常スキャンでは出さない。
 *
 * ユーザーには具体的な確率も secret の存在も見せない（表示はレベルと文言のみ）。
 */

export type ScanRarity = "normal" | "rare" | "legendary" | "prefecture" | "secret";
export type FriendEffectLevel = 0 | 1 | 2 | 3;

/** 基本確率（フレンド効果Lv0・GPS有効時）。§4 */
export const BASE_RATES = { normal: 0.96, rare: 0.03, prefecture: 0.008, secret: 0.002 } as const;

/** フレンド効果込みの上限。§5.2 */
export const MAX_RATES = { rare: 0.05, prefecture: 0.025, secret: 0.01 } as const;

const clampLevel = (level: number): FriendEffectLevel =>
  (level <= 0 ? 0 : level >= 3 ? 3 : Math.round(level)) as FriendEffectLevel;

/**
 * レアリティ分布を返す（合計1.0）。
 *  - friendEffectLevel(0..3) で rare/prefecture/secret を上限まで線形に引き上げ、上げた分を normal から差し引く。
 *  - prefectureAvailable=false（GPS未許可/判定失敗）のとき prefecture は 0% にし、normal に戻す。§4/§5.2
 */
export const rarityDistribution = (input: {
  prefectureAvailable: boolean;
  friendEffectLevel: number;
}): Record<ScanRarity, number> => {
  const t = clampLevel(input.friendEffectLevel) / 3; // 0, 1/3, 2/3, 1
  const rare = BASE_RATES.rare + (MAX_RATES.rare - BASE_RATES.rare) * t;
  const secret = BASE_RATES.secret + (MAX_RATES.secret - BASE_RATES.secret) * t;
  const prefectureRaw = BASE_RATES.prefecture + (MAX_RATES.prefecture - BASE_RATES.prefecture) * t;
  const prefecture = input.prefectureAvailable ? prefectureRaw : 0;
  const normal = 1 - rare - prefecture - secret;
  // legendary はこの旧モデルでは扱わない（段3の scanDistribution で扱う）。型整合のため 0 を返す。
  return { normal, rare, legendary: 0, prefecture, secret };
};

const PICK_ORDER: ScanRarity[] = ["secret", "legendary", "prefecture", "rare", "normal"];

/** roll01(0..1) と分布からレアリティを1つ選ぶ。 */
export const pickRarity = (dist: Record<ScanRarity, number>, roll01: number): ScanRarity => {
  let acc = 0;
  for (const rarity of PICK_ORDER) {
    acc += dist[rarity];
    if (roll01 < acc) return rarity;
  }
  return "normal";
};
