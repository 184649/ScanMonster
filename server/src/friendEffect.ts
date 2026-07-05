/**
 * フレンド効果（純粋・テスト可能）。仕様 §5.3/§6。
 * 新しいフレンドQRほど価値が高く、連続日数にも意味を持たせる。
 * 同じ相手の連打では上がらない（新規カウントは distinct owner、連続日数は日単位で更新）。
 * ユーザーには Lv.0〜3 と文言のみ見せる（具体的な確率は見せない）。
 */
import type { FriendEffectLevel } from "./rates.ts";

/**
 * 実績からフレンド効果レベルを算出。
 *  score = 新規フレンド数×2 + min(連続日数, 7)
 *  同一相手の連打は newFriendCount を増やさない運用で吸収する。
 */
export const computeFriendEffectLevel = (input: {
  newFriendCount: number;
  streakDays: number;
}): FriendEffectLevel => {
  const newFriends = Math.max(0, Math.floor(input.newFriendCount));
  const streak = Math.max(0, Math.min(7, Math.floor(input.streakDays)));
  const score = newFriends * 2 + streak;
  if (score >= 12) return 3;
  if (score >= 7) return 2;
  if (score >= 3) return 1;
  return 0;
};

/** ユーザー向け文言（確率も secret も出さない）。 */
export const friendEffectMessage = (level: FriendEffectLevel): string => {
  switch (level) {
    case 3:
      return "珍しい発見の気配が強まっています";
    case 2:
      return "珍しい発見の気配が高まっています";
    case 1:
      return "交流の気配が高まっています";
    default:
      return "フレンドQRを読むと、珍しい発見に近づくことがあります";
  }
};

/**
 * フレンドQR読み込み時の状態更新（純粋）。連続日数と新規フレンド数を返す。
 *  - 今日すでに読んでいれば streak は据え置き、日付が変わっていれば +1（間が空けば1にリセット）。
 *  - 新規フレンドのときだけ newFriendCount +1（同一相手の連打では増えない）。
 */
export const nextFriendEffectState = (input: {
  prev: { streakDays: number; newFriendCount: number; lastFriendQrDate: string | null };
  today: string; // YYYY-MM-DD
  isNewFriend: boolean;
}): { streakDays: number; newFriendCount: number; lastFriendQrDate: string } => {
  const { prev, today, isNewFriend } = input;
  let streakDays: number;
  if (prev.lastFriendQrDate === today) {
    streakDays = Math.max(1, prev.streakDays);
  } else if (prev.lastFriendQrDate && isYesterday(prev.lastFriendQrDate, today)) {
    streakDays = prev.streakDays + 1;
  } else {
    streakDays = 1;
  }
  return {
    streakDays,
    newFriendCount: prev.newFriendCount + (isNewFriend ? 1 : 0),
    lastFriendQrDate: today
  };
};

const isYesterday = (prevDate: string, today: string): boolean => {
  const p = new Date(`${prevDate}T00:00:00Z`).getTime();
  const t = new Date(`${today}T00:00:00Z`).getTime();
  return t - p === 24 * 60 * 60 * 1000;
};
