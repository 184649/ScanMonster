import type { ScanStreakView } from "../services/economyService";

/**
 * ホームの通知（ベル）に出す文言を、連続発見の状態に合わせて作る。
 *
 * 方針:
 * - 未達成なら、今スキャンした場合の週内日数と報酬を伝える。
 * - 7日目は最大報酬を強調する。
 * - 達成後は、明日の期待（責めない）を伝える。7日目達成後は新しい週の1日目を伝える。
 */
export const buildScanReminderNotification = (streak: ScanStreakView): { title: string; body: string } => {
  if (!streak.achievedToday) {
    if (streak.isSeventh) {
      return {
        title: "今日発見すると、今週の連続発見 7日目",
        body: `最大報酬 ${streak.todayReward} DP を受け取れます。`
      };
    }
    return {
      title: "今日の発見がまだです",
      body: `今スキャンすると、今週の連続発見 ${streak.weeklyStreakDay}日目で ${streak.todayReward} DP。`
    };
  }

  // 達成後
  if (streak.resetsAfterToday) {
    return {
      title: "新しい連続発見の週が始まります",
      body: `今日の発見で1日目、${streak.tomorrowReward} DP。`
    };
  }

  return {
    title: `今日の発見で${streak.weeklyStreakDay}日目になりました`,
    body: `明日も見つけると${streak.tomorrowWeeklyDay}日目、${streak.tomorrowReward} DP。`
  };
};
