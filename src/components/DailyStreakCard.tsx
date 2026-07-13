/**
 * 連続プレイの「日次フック」カード（毎日戻りたくなる導線）。
 * Home 上部に置き、連続ログイン日数・今日のボーナス・週間ストリーク進捗(7日)を1目で見せる。
 * 既存の economy.login / economy.scanStreak を可視化するだけ（新規ゲームロジックは足さない）。
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme";

type Props = {
  /** 連続ログイン日数（economy.login.streakDays）。 */
  loginStreakDays: number;
  /** 今日のログインボーナスで得たDP（economy.login.todayEarnedDP）。0なら受取済み表示にしない。 */
  todayEarnedDP: number;
  /** 週内の連続発見日数 1〜7（economy.scanStreak.weeklyStreakDay）。 */
  weeklyStreakDay: number;
  /** 通算の連続発見日数（economy.scanStreak.totalScanStreakDays）。 */
  totalScanStreakDays: number;
  /** 過去最高の連続発見日数（economy.scanStreak.bestScanStreakDays）。 */
  bestScanStreakDays: number;
  onPress: () => void;
};

const WEEK = [1, 2, 3, 4, 5, 6, 7];

export const DailyStreakCard = ({
  loginStreakDays,
  todayEarnedDP,
  weeklyStreakDay,
  totalScanStreakDays,
  bestScanStreakDays,
  onPress
}: Props) => {
  const day = Math.min(7, Math.max(0, weeklyStreakDay || 0));
  const remaining = 7 - day;
  const weekMessage =
    day >= 7 ? "今週の連続発見コンプリート！" : day <= 0 ? "今日発見すると連続記録がスタート" : `あと${remaining}日で1週間達成`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`連続ログイン${loginStreakDays}日。詳細を見る`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.headerRow}>
        <View style={styles.flameWrap}>
          <Text style={styles.flame}>🔥</Text>
          <View>
            <Text style={styles.streakNum}>
              {Math.max(0, loginStreakDays)}
              <Text style={styles.streakUnit}> 日連続</Text>
            </Text>
            <Text style={styles.streakSub}>
              {loginStreakDays >= 2 ? "毎日プレイ中！この調子で続けよう" : "毎日ひらくとボーナスが育つ"}
            </Text>
          </View>
        </View>
        {todayEarnedDP > 0 ? (
          <View style={styles.bonusBadge}>
            <Text style={styles.bonusText}>＋{todayEarnedDP} DP</Text>
            <Text style={styles.bonusLabel}>今日のボーナス</Text>
          </View>
        ) : (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>

      <View style={styles.week}>
        {WEEK.map((d) => {
          const filled = d <= day;
          const isToday = d === day;
          return (
            <View key={d} style={[styles.dot, filled && styles.dotFilled, isToday && styles.dotToday]}>
              <Text style={[styles.dotText, filled && styles.dotTextFilled]}>{d}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footRow}>
        <Text style={styles.weekMessage}>{weekMessage}</Text>
        <Text style={styles.best}>最高 {Math.max(bestScanStreakDays, totalScanStreakDays)}日</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 10,
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: colors.accentGoldSoft,
    borderWidth: 1,
    borderColor: colors.accentGold
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.995 }] },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  flameWrap: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  flame: { fontSize: 30 },
  streakNum: { color: colors.navy, fontSize: 24, fontWeight: "900" },
  streakUnit: { fontSize: 14, fontWeight: "900", color: colors.accentGoldInk },
  streakSub: { color: colors.accentGoldInk, fontSize: 12, fontWeight: "800", marginTop: 1 },
  bonusBadge: { alignItems: "center", backgroundColor: colors.success, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 6 },
  bonusText: { color: colors.white, fontSize: 15, fontWeight: "900" },
  bonusLabel: { color: colors.white, fontSize: 10, fontWeight: "800", opacity: 0.9 },
  chevron: { color: colors.accentGoldInk, fontSize: 24, fontWeight: "900" },
  week: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  dot: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 40,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.accentGold
  },
  dotFilled: { backgroundColor: colors.warn, borderColor: colors.accentGoldInk },
  dotToday: { borderColor: colors.navy, borderWidth: 2.5 },
  dotText: { color: colors.textFaint, fontSize: 12, fontWeight: "900" },
  dotTextFilled: { color: colors.accentGoldInk },
  footRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  weekMessage: { color: colors.accentGoldInk, fontSize: 12, fontWeight: "900", flex: 1, minWidth: 0 },
  best: { color: colors.textMuted, fontSize: 11, fontWeight: "800" }
});
