import {
  CATEGORY_MILESTONE_STEP,
  CATEGORY_MILESTONES,
  CATEGORY_NEW_BONUS,
  categoryMilestoneReward,
  getWeeklyStreakReward,
  normalizeEconomyState,
  SCAN_CATEGORY_LABELS,
  sumRewardLines,
  toStreakWeek,
  toWeeklyStreakDay
} from "../data/economy";
import type { ScanCategory } from "../types/category";
import type { DPRewardLine, EconomyStateData, ScanStreakState, WeeklyStreakDay } from "../types/economy";
import type { ScanSource } from "../types/monster";
import { getLocalDateKey } from "../utils/dateUtils";

type EconomyAwardResult = {
  economy: EconomyStateData;
  lines: DPRewardLine[];
  total: number;
  balanceAfter: number;
};

type DiscoveryRewardParams = {
  economy: EconomyStateData;
  scannedAt: Date;
  scanSource: ScanSource;
  discoveryKind: "first" | "rediscovery" | "duplicate";
  isHiddenRare: boolean;
  discoveredFamilyCount: number;
  hiddenRareCount: number;
};

const createLine = (kind: DPRewardLine["kind"], label: string, amount: number): DPRewardLine => ({
  id: `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  kind,
  label,
  amount
});

const cloneEconomy = (economy: EconomyStateData): EconomyStateData =>
  normalizeEconomyState(JSON.parse(JSON.stringify(economy)) as EconomyStateData);

const previousDateKey = (dateKey: string): string => {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, (day ?? 1) - 1);
  return getLocalDateKey(date);
};

const dailyLoginAmount = (streakDays: number): number => {
  if (streakDays >= 5) {
    return 40;
  }

  if (streakDays === 4) {
    return 35;
  }

  if (streakDays === 3) {
    return 30;
  }

  if (streakDays === 2) {
    return 25;
  }

  return 20;
};

export type ScanStreakAdvance = {
  streak: ScanStreakState;
  reward: number;
  weeklyStreakDay: WeeklyStreakDay;
  streakWeek: number;
  totalScanStreakDays: number;
  isSeventh: boolean;
  label: string;
};

/** その日最初の有効発見で連続発見を1日進め、週内報酬を決める。 */
export const advanceScanStreak = (streak: ScanStreakState, dateKey: string): ScanStreakAdvance => {
  const continued = streak.lastDailyScanDate === previousDateKey(dateKey);
  const total = continued ? streak.totalScanStreakDays + 1 : 1;
  const weeklyStreakDay = toWeeklyStreakDay(total);
  const streakWeek = toStreakWeek(total);
  const reward = getWeeklyStreakReward(weeklyStreakDay);
  const isSeventh = weeklyStreakDay === 7;

  const nextStreak: ScanStreakState = {
    lastDailyScanDate: dateKey,
    totalScanStreakDays: total,
    weeklyStreakDay,
    streakWeek,
    claimedDailyScanRewardDates: [dateKey, ...streak.claimedDailyScanRewardDates].slice(0, 60),
    bestScanStreakDays: Math.max(streak.bestScanStreakDays, total)
  };

  const label = isSeventh
    ? "7日連続達成！今週の連続発見ボーナス最大報酬"
    : `今日の1スキャン（今週の連続発見 ${weeklyStreakDay}日目）`;

  return { streak: nextStreak, reward, weeklyStreakDay, streakWeek, totalScanStreakDays: total, isSeventh, label };
};

export type ScanStreakView = {
  /** 今日すでに1日1スキャン報酬を受け取ったか。 */
  achievedToday: boolean;
  /** 表示用の通算連続日数（達成済みなら現在値、未達成なら今日発見した場合の見込み）。 */
  totalScanStreakDays: number;
  /** 表示用の週内日数（1〜7）。 */
  weeklyStreakDay: WeeklyStreakDay;
  streakWeek: number;
  /** 今日の報酬（達成済みなら受け取った額、未達成なら今日発見で貰える額）。 */
  todayReward: number;
  /** 明日発見した場合の週内日数と報酬。 */
  tomorrowWeeklyDay: WeeklyStreakDay;
  tomorrowReward: number;
  /** 今日が週の7日目（達成 or 見込み）。 */
  isSeventh: boolean;
  /** 今日が7日目達成 → 明日は次の週の1日目に戻る。 */
  resetsAfterToday: boolean;
};

/** ホーム・スキャン結果画面向けの連続発見の見え方をまとめる。 */
export const getScanStreakView = (economy: EconomyStateData, today = new Date()): ScanStreakView => {
  const todayKey = getLocalDateKey(today);
  const streak = economy.scanStreak;
  const achievedToday = streak.lastDailyScanDate === todayKey;

  let effectiveTotal: number;
  if (achievedToday) {
    effectiveTotal = streak.totalScanStreakDays;
  } else {
    const continued = streak.lastDailyScanDate === previousDateKey(todayKey);
    effectiveTotal = continued ? streak.totalScanStreakDays + 1 : 1;
  }

  const weeklyStreakDay = toWeeklyStreakDay(effectiveTotal);
  const streakWeek = toStreakWeek(effectiveTotal);
  const todayReward = getWeeklyStreakReward(weeklyStreakDay);
  const tomorrowWeeklyDay = toWeeklyStreakDay(effectiveTotal + 1);
  const tomorrowReward = getWeeklyStreakReward(tomorrowWeeklyDay);

  return {
    achievedToday,
    totalScanStreakDays: effectiveTotal,
    weeklyStreakDay,
    streakWeek,
    todayReward,
    tomorrowWeeklyDay,
    tomorrowReward,
    isSeventh: weeklyStreakDay === 7,
    resetsAfterToday: weeklyStreakDay === 7
  };
};

/** count までに達成したカテゴリ節目（10/30/50、以降50ごと）を列挙する。 */
const getCategoryMilestonesUpTo = (count: number): number[] => {
  const result: number[] = [];
  for (const milestone of CATEGORY_MILESTONES) {
    if (count >= milestone) {
      result.push(milestone);
    }
  }
  for (let milestone = CATEGORY_MILESTONE_STEP * 2; milestone <= count; milestone += CATEGORY_MILESTONE_STEP) {
    result.push(milestone);
  }
  return result;
};

/**
 * カテゴリ図鑑のDPを付与する。
 * - 新カテゴリ初発見: +50
 * - 節目(10/30/50・以降50ごと): 体数×10
 * 重複付与は claimedCategoryBonuses で防ぐ。
 */
export const awardCategoryBonuses = (
  economy: EconomyStateData,
  category: ScanCategory,
  discoveredCountInCategory: number
): EconomyAwardResult => {
  const next = cloneEconomy(economy);
  const lines: DPRewardLine[] = [];
  const label = SCAN_CATEGORY_LABELS[category];

  const newId = `${category}:new`;
  if (discoveredCountInCategory >= 1 && !next.claimedCategoryBonuses.includes(newId)) {
    lines.push(createLine("category_new", `新しいカテゴリから発見・${label}`, CATEGORY_NEW_BONUS));
    next.claimedCategoryBonuses.push(newId);
  }

  for (const milestone of getCategoryMilestonesUpTo(discoveredCountInCategory)) {
    const id = `${category}:${milestone}`;
    if (!next.claimedCategoryBonuses.includes(id)) {
      lines.push(createLine("category_milestone", `${label}から${milestone}体発見`, categoryMilestoneReward(milestone)));
      next.claimedCategoryBonuses.push(id);
    }
  }

  const rewarded = applyDPRewardLines(next, lines, { source: "category", category });
  return { economy: rewarded, lines, total: sumRewardLines(lines), balanceAfter: rewarded.dpBalance };
};

export const applyDPRewardLines = (
  economy: EconomyStateData,
  lines: DPRewardLine[],
  metadata?: Record<string, string | number | boolean>
): EconomyStateData => {
  const next = cloneEconomy(economy);
  const total = sumRewardLines(lines);

  if (total <= 0) {
    return next;
  }

  let balance = next.dpBalance;
  const now = new Date().toISOString();
  const entries = lines.map((line) => {
    balance += line.amount;
    return {
      id: `dp_${line.id}`,
      amount: line.amount,
      balanceAfter: balance,
      label: line.label,
      createdAt: now,
      metadata
    };
  });

  next.dpBalance = balance;
  next.ledger = [...entries, ...next.ledger].slice(0, 120);
  return next;
};

/**
 * ラベル付きの一括DP付与（ログイン/スキャン以外の加点用）。
 * 友達招待ボーナスなど、単発の +DP をレッジャーに記録する。
 */
export const awardFlatDP = (
  economy: EconomyStateData,
  amount: number,
  label: string,
  kind: DPRewardLine["kind"],
  metadata?: Record<string, string | number | boolean>
): EconomyAwardResult => {
  if (amount <= 0) {
    const unchanged = cloneEconomy(economy);
    return { economy: unchanged, lines: [], total: 0, balanceAfter: unchanged.dpBalance };
  }

  const line = createLine(kind, label, amount);
  const rewarded = applyDPRewardLines(economy, [line], metadata);
  return { economy: rewarded, lines: [line], total: amount, balanceAfter: rewarded.dpBalance };
};

export const awardDailyLoginBonus = (economy: EconomyStateData, now = new Date()): EconomyAwardResult => {
  const next = cloneEconomy(economy);
  const todayKey = getLocalDateKey(now);

  if (next.login.lastLoginDate === todayKey) {
    return {
      economy: next,
      lines: next.login.lastRewards,
      total: 0,
      balanceAfter: next.dpBalance
    };
  }

  const lines: DPRewardLine[] = [];
  const streakDays = next.login.lastLoginDate === previousDateKey(todayKey) ? next.login.streakDays + 1 : 1;

  if (!next.login.firstLoginBonusClaimed) {
    lines.push(createLine("login", "初回ログインボーナス", 100));
    next.login.firstLoginBonusClaimed = true;
  }

  lines.push(createLine("login", `連続${streakDays}日ログイン`, dailyLoginAmount(streakDays)));

  next.login.lastLoginDate = todayKey;
  next.login.streakDays = streakDays;
  next.login.todayEarnedDP = sumRewardLines(lines);
  next.login.lastRewards = lines;

  const rewarded = applyDPRewardLines(next, lines, { source: "login", dateKey: todayKey });
  return {
    economy: rewarded,
    lines,
    total: sumRewardLines(lines),
    balanceAfter: rewarded.dpBalance
  };
};

export const awardDiscoveryDP = ({
  economy,
  scannedAt,
  scanSource,
  discoveryKind,
  isHiddenRare,
  discoveredFamilyCount,
  hiddenRareCount
}: DiscoveryRewardParams): EconomyAwardResult => {
  const next = cloneEconomy(economy);
  const dateKey = getLocalDateKey(scannedAt);
  const daily = next.dailyScanRewards[dateKey] ?? {
    dateKey,
    scanCount: 0,
    firstScanAwarded: false,
    milestone3Awarded: false,
    milestone5Awarded: false
  };
  const lines: DPRewardLine[] = [];
  let streakMetadata: Record<string, string | number | boolean> | undefined;

  // 1日1スキャン報酬：その日最初の「有効な発見」で +20 DP。
  if (discoveryKind !== "duplicate" && next.scanStreak.lastDailyScanDate !== dateKey) {
    const advance = advanceScanStreak(next.scanStreak, dateKey);
    next.scanStreak = advance.streak;
    lines.push(createLine("first_scan_today", "今日の初スキャン", 20));
    daily.firstScanAwarded = true;
    streakMetadata = {
      totalScanStreakDays: advance.totalScanStreakDays,
      weeklyStreakDay: advance.weeklyStreakDay,
      streakWeek: advance.streakWeek
    };
  }

  if (discoveryKind === "duplicate") {
    // 同日同コードブロックは抽選なし・DPなし。
  } else if (discoveryKind === "first") {
    lines.push(
      isHiddenRare
        ? createLine("hidden_rare", "レアキャラ初発見", 100)
        : createLine("new_species", "新キャラ発見", 30)
    );
  } else {
    lines.push(
      isHiddenRare
        ? createLine("rare_rediscovery", "レアキャラ再発見", 20)
        : createLine("rediscovery", "再発見", 5)
    );
  }

  daily.scanCount += 1;

  next.dailyScanRewards[dateKey] = daily;
  const rewarded = applyDPRewardLines(next, lines, { source: "scan", dateKey, discoveryKind, ...streakMetadata });

  return {
    economy: rewarded,
    lines,
    total: sumRewardLines(lines),
    balanceAfter: rewarded.dpBalance
  };
};

export const spendDP = (
  economy: EconomyStateData,
  amount: number,
  label: string,
  metadata?: Record<string, string | number | boolean>
): { economy: EconomyStateData; ok: boolean; message: string; balanceAfter: number } => {
  const next = cloneEconomy(economy);

  if (amount <= 0) {
    return { economy: next, ok: false, message: "必要DPが正しくありません。", balanceAfter: next.dpBalance };
  }

  if (next.dpBalance < amount) {
    return { economy: next, ok: false, message: "DPが足りません。", balanceAfter: next.dpBalance };
  }

  const balanceAfter = next.dpBalance - amount;
  next.dpBalance = balanceAfter;
  next.ledger = [
    {
      id: `dp_spend_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: -amount,
      balanceAfter,
      label,
      createdAt: new Date().toISOString(),
      metadata
    },
    ...next.ledger
  ].slice(0, 120);

  return { economy: next, ok: true, message: `${label}を開放しました。`, balanceAfter };
};

export const getUnlockedFormStages = (economy: EconomyStateData, monsterId: string) => {
  const unlocked = economy.unlocks.unlockedFormsByMonsterId[monsterId] ?? [];
  return Array.from(new Set(["base", ...unlocked] as const));
};
