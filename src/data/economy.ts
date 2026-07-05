import type { DPRewardLine, EconomyStateData, FormStage, ScanStreakState, WeeklyStreakDay } from "../types/economy";
import type { ScanCategory } from "../types/category";
import type { RealmGroup, WorldBoost, WorldGroup } from "../types/worlds";
import { normalizeHabitatGroups } from "./habitatGroups";
import { MONSTER_FAMILY_COUNT } from "./monsterFamilies";
import { USER_TITLES } from "./titles";
import { REALM_GROUPS, WORLD_BOOST_RATE, normalizeWorldGroups } from "./worlds";

export const DP_NAME = "ドーンポイント";
export const DP_ABBR = "DP";

export const DP_DESCRIPTION =
  "DP（ドーンポイント）は、ログインやスキャン、いきものの発見で集まるWORLDAWNのポイントです。集めたDPは、出現カテゴリの解放と気配ブーストに使えます。";

export const formatDP = (amount: number): string => `${Math.max(0, amount).toLocaleString("ja-JP")} DP`;

export const formatEarnedDP = (amount: number): string => `+${Math.max(0, amount).toLocaleString("ja-JP")} DP`;

// 姿段階の順序（開放UI・表示順）。
export const FORM_STAGE_ORDER: FormStage[] = ["base", "kou", "sai", "sei", "gen", "gyo"];

// 開放UI・システムメッセージ用の短いラベル。base は「元の姿」、他は漢字1文字。
export const FORM_STAGE_LABELS: Record<FormStage, string> = {
  base: "元の姿",
  kou: "煌",
  sai: "彩",
  sei: "星",
  gen: "幻",
  gyo: "暁"
};

// 表示名に付ける接尾辞。base は接尾辞なし（例: 「朝露のコイヌ」）。
export const FORM_STAGE_SUFFIX: Record<FormStage, string> = {
  base: "",
  kou: "・煌",
  sai: "・彩",
  sei: "・星",
  gen: "・幻",
  gyo: "・暁"
};

// DP開放コスト（初期調整値。段階が進むほど高くなる）。base は無料。
export const FORM_UNLOCK_COSTS: Record<Exclude<FormStage, "base">, number> = {
  kou: 150,
  sai: 280,
  sei: 420,
  gen: 600,
  gyo: 900
};

// 旧仕様（shine / dawn）で保存された姿キーを新キーへ移行するためのマップ。
export const LEGACY_FORM_STAGE_MAP: Record<string, FormStage> = {
  shine: "kou",
  dawn: "gyo"
};

/** 保存済みの姿キーを現行キーへ正規化する（未知値・旧値は安全に変換／base扱い）。 */
export const normalizeFormStage = (value: unknown): FormStage => {
  if (typeof value !== "string") {
    return "base";
  }
  if ((FORM_STAGE_ORDER as string[]).includes(value)) {
    return value as FormStage;
  }
  return LEGACY_FORM_STAGE_MAP[value] ?? "base";
};

export const BACKGROUND_UNLOCKS = [
  { key: "default", label: "通常背景", group: "normal", cost: 100 },
  { key: "forest", label: "森の背景", group: "normal", cost: 100 },
  { key: "water", label: "水辺の背景", group: "normal", cost: 100 },
  { key: "wetland", label: "湿地の背景", group: "normal", cost: 100 },
  { key: "sky", label: "空の背景", group: "normal", cost: 100 },
  { key: "grassland", label: "草原の背景", group: "normal", cost: 100 },
  { key: "underground", label: "地底の背景", group: "normal", cost: 100 },
  { key: "camp", label: "キャンプの背景", group: "normal", cost: 100 },
  { key: "autumn_leaves", label: "季節背景・紅葉", group: "seasonal", cost: 200 },
  { key: "snow_light", label: "季節背景・雪灯り", group: "seasonal", cost: 200 },
  { key: "rare", label: "レア背景", group: "rare", cost: 400 },
  { key: "legend", label: "伝説背景", group: "legend", cost: 700 }
] as const;

export const FRAME_UNLOCKS = [
  { key: "normal", label: "通常フレーム", cost: 150 },
  { key: "special", label: "特別フレーム", cost: 350 },
  { key: "legend", label: "伝説フレーム", cost: 700 }
] as const;

export const HINT_UNLOCKS = [
  { key: "species_hint", label: "未発見種族ヒント", cost: 50 },
  { key: "variant_hint", label: "個体タイプヒント", cost: 80 },
  { key: "rare_hint", label: "レア出現ヒント", cost: 150 }
] as const;

// 1週間区切りの連続発見報酬。7日目が最大、8日目は次の週の1日目（=30）に戻る。
export const WEEKLY_SCAN_STREAK_REWARDS: Record<WeeklyStreakDay, number> = {
  1: 30,
  2: 35,
  3: 40,
  4: 45,
  5: 50,
  6: 60,
  7: 100
};

/** 週内連続日数（1〜7）に対応する報酬DP。 */
export const getWeeklyStreakReward = (weeklyStreakDay: WeeklyStreakDay): number => WEEKLY_SCAN_STREAK_REWARDS[weeklyStreakDay];

/** 通算連続日数（1始まり）から週内日数（1〜7）を求める。 */
export const toWeeklyStreakDay = (totalScanStreakDays: number): WeeklyStreakDay => {
  const safe = Math.max(1, Math.floor(totalScanStreakDays));
  return (((safe - 1) % 7) + 1) as WeeklyStreakDay;
};

/** 通算連続日数（1始まり）から何週目か（1始まり）を求める。 */
export const toStreakWeek = (totalScanStreakDays: number): number => {
  const safe = Math.max(1, Math.floor(totalScanStreakDays));
  return Math.floor((safe - 1) / 7) + 1;
};

// カテゴリ図鑑：表示ラベル・絵文字・表示順。
export const SCAN_CATEGORY_ORDER: ScanCategory[] = [
  "drink",
  "snack",
  "food",
  "daily_goods",
  "book",
  "cosmetics",
  "medicine",
  "stationery",
  "toy",
  "qr",
  "other"
];

export const SCAN_CATEGORY_LABELS: Record<ScanCategory, string> = {
  drink: "飲み物",
  snack: "お菓子",
  food: "食べ物",
  daily_goods: "日用品",
  book: "本",
  cosmetics: "化粧品",
  medicine: "薬・健康",
  stationery: "文具",
  toy: "おもちゃ",
  qr: "QR",
  other: "その他"
};

export const SCAN_CATEGORY_EMOJI: Record<ScanCategory, string> = {
  drink: "🥤",
  snack: "🍫",
  food: "🍙",
  daily_goods: "🧴",
  book: "📚",
  cosmetics: "💄",
  medicine: "💊",
  stationery: "✏️",
  toy: "🧸",
  qr: "🔗",
  other: "📦"
};

// カテゴリ節目：10/30/50体、以降50体ごと。amount は 10→100, 30→300, 50→500, 100→1000 …（=体数×10）。
export const CATEGORY_MILESTONES = [10, 30, 50] as const;
export const CATEGORY_MILESTONE_STEP = 50;
export const CATEGORY_NEW_BONUS = 50;
/** 節目体数に対する報酬DP（体数×10）。 */
export const categoryMilestoneReward = (count: number): number => count * 10;

export const DEX_PROGRESS_BONUSES = [
  { id: "species-5", label: "種族図鑑5種達成", amount: 100, type: "species", threshold: 5 },
  { id: "species-10", label: "種族図鑑10種達成", amount: 150, type: "species", threshold: 10 },
  { id: "species-20", label: "種族図鑑20種達成", amount: 250, type: "species", threshold: 20 },
  { id: "species-30", label: "種族図鑑30種達成", amount: 400, type: "species", threshold: 30 },
  {
    id: `species-${MONSTER_FAMILY_COUNT}`,
    label: `通常${MONSTER_FAMILY_COUNT}種コンプリート`,
    amount: 800,
    type: "species",
    threshold: MONSTER_FAMILY_COUNT
  },
  { id: "rare-1", label: "隠れレア初発見", amount: 300, type: "hiddenRare", threshold: 1 },
  { id: "rare-3", label: "隠れレア3体発見", amount: 500, type: "hiddenRare", threshold: 3 },
  { id: "rare-8", label: "隠れレア8体コンプリート", amount: 1500, type: "hiddenRare", threshold: 8 }
] as const;

export const createDefaultScanStreak = (): ScanStreakState => ({
  lastDailyScanDate: null,
  totalScanStreakDays: 0,
  weeklyStreakDay: 1,
  streakWeek: 1,
  claimedDailyScanRewardDates: [],
  bestScanStreakDays: 0
});

const VALID_REALM_GROUPS = new Set<RealmGroup>(REALM_GROUPS);

/** 保存済みの解放領域を検証。空/未知なら life にフォールバック（生物領域は常時解放）。 */
export const normalizeRealmGroups = (value: unknown): RealmGroup[] => {
  const valid = Array.isArray(value) ? (value.filter((v) => VALID_REALM_GROUPS.has(v as RealmGroup)) as RealmGroup[]) : [];
  const unique = Array.from(new Set(valid));
  return unique.length > 0 ? unique : ["life"];
};

/** ワールドブーストを検証。対象が有効ワールドで残り回数>0のときだけ保持、それ以外は undefined。 */
export const normalizeWorldBoost = (value: unknown): WorldBoost | undefined => {
  const boost = value as Partial<WorldBoost> | undefined;
  if (!boost) {
    return undefined;
  }
  const target = normalizeWorldGroups([boost.targetWorld])[0];
  const remainingScans = Math.max(0, Math.floor(Number(boost.remainingScans) || 0));
  if (!target || remainingScans <= 0) {
    return undefined;
  }
  return {
    id: typeof boost.id === "string" ? boost.id : `world-boost-${Date.now()}`,
    targetWorld: target,
    remainingScans,
    boostRate: Math.min(0.95, Math.max(0.01, Number(boost.boostRate) || WORLD_BOOST_RATE)),
    createdAt: typeof boost.createdAt === "string" ? boost.createdAt : new Date().toISOString()
  };
};

export const createDefaultEconomyState = (): EconomyStateData => ({
  dpBalance: 0,
  ledger: [],
  login: {
    firstLoginBonusClaimed: false,
    streakDays: 0,
    todayEarnedDP: 0,
    lastRewards: []
  },
  dailyScanRewards: {},
  scanStreak: createDefaultScanStreak(),
  claimedDexBonuses: [],
  claimedCategoryBonuses: [],
  unlocks: {
    unlockedHabitatGroups: [],
    // 領域は life を初期解放。ワールドは初回選択で1つ入るまで空。
    unlockedRealmGroups: ["life"],
    unlockedWorldGroups: [],
    selectedInitialWorldGroup: undefined,
    activeWorldBoost: undefined,
    selectedInitialHabitatGroup: undefined,
    activeHabitatBoost: undefined,
    activeFormByMonsterId: {},
    unlockedFormsByMonsterId: {},
    unlockedBackgrounds: [],
    activeBackgroundByMonsterId: {},
    unlockedFrames: [],
    unlockedHints: []
  },
  titles: {
    unlockedTitleIds: [],
    activeTitleId: undefined
  }
});

const normalizeScanStreak = (value: Partial<ScanStreakState> | null | undefined): ScanStreakState => {
  const defaults = createDefaultScanStreak();
  const total = Math.max(0, Math.floor(value?.totalScanStreakDays ?? defaults.totalScanStreakDays));
  return {
    lastDailyScanDate: typeof value?.lastDailyScanDate === "string" ? value.lastDailyScanDate : null,
    totalScanStreakDays: total,
    // 保存値が壊れていても totalScanStreakDays から導出し直す。
    weeklyStreakDay: total > 0 ? toWeeklyStreakDay(total) : 1,
    streakWeek: total > 0 ? toStreakWeek(total) : 1,
    claimedDailyScanRewardDates: Array.isArray(value?.claimedDailyScanRewardDates)
      ? value.claimedDailyScanRewardDates
      : [],
    bestScanStreakDays: Math.max(0, Math.floor(value?.bestScanStreakDays ?? 0), total)
  };
};

export const normalizeEconomyState = (value: Partial<EconomyStateData> | null | undefined): EconomyStateData => {
  const defaults = createDefaultEconomyState();
  const login = value?.login ?? defaults.login;
  const unlocks = value?.unlocks ?? defaults.unlocks;
  const unlockedHabitatGroups = normalizeHabitatGroups(unlocks.unlockedHabitatGroups);
  const selectedInitialHabitatGroup = normalizeHabitatGroups(
    unlocks.selectedInitialHabitatGroup ? [unlocks.selectedInitialHabitatGroup] : []
  )[0];
  const activeHabitatBoost =
    unlocks.activeHabitatBoost &&
    normalizeHabitatGroups([unlocks.activeHabitatBoost.targetHabitat]).length > 0 &&
    Math.max(0, Math.floor(unlocks.activeHabitatBoost.remainingScans)) > 0
      ? {
          ...unlocks.activeHabitatBoost,
          remainingScans: Math.max(0, Math.floor(unlocks.activeHabitatBoost.remainingScans)),
          boostRate: Math.min(0.95, Math.max(0.01, Number(unlocks.activeHabitatBoost.boostRate) || 0.55))
        }
      : undefined;
  const titleIds = new Set(USER_TITLES.map((title) => title.id));
  const normalizedUnlockedTitleIds = Array.isArray(value?.titles?.unlockedTitleIds)
    ? value.titles.unlockedTitleIds.filter((id) => titleIds.has(id))
    : [];
  const activeTitleId =
    value?.titles?.activeTitleId && normalizedUnlockedTitleIds.includes(value.titles.activeTitleId)
      ? value.titles.activeTitleId
      : normalizedUnlockedTitleIds[0];

  return {
    dpBalance: Math.max(0, value?.dpBalance ?? defaults.dpBalance),
    ledger: Array.isArray(value?.ledger) ? value.ledger : defaults.ledger,
    login: {
      firstLoginBonusClaimed: Boolean(login.firstLoginBonusClaimed),
      lastLoginDate: login.lastLoginDate,
      streakDays: Math.max(0, login.streakDays ?? 0),
      todayEarnedDP: Math.max(0, login.todayEarnedDP ?? 0),
      lastRewards: Array.isArray(login.lastRewards) ? login.lastRewards : []
    },
    dailyScanRewards: value?.dailyScanRewards ?? defaults.dailyScanRewards,
    scanStreak: normalizeScanStreak(value?.scanStreak),
    claimedDexBonuses: Array.isArray(value?.claimedDexBonuses) ? value.claimedDexBonuses : [],
    claimedCategoryBonuses: Array.isArray(value?.claimedCategoryBonuses) ? value.claimedCategoryBonuses : [],
    unlocks: {
      unlockedHabitatGroups,
      unlockedRealmGroups: normalizeRealmGroups(unlocks.unlockedRealmGroups),
      unlockedWorldGroups: normalizeWorldGroups(unlocks.unlockedWorldGroups),
      selectedInitialWorldGroup: normalizeWorldGroups(
        unlocks.selectedInitialWorldGroup ? [unlocks.selectedInitialWorldGroup] : []
      )[0],
      activeWorldBoost: normalizeWorldBoost(unlocks.activeWorldBoost),
      selectedInitialHabitatGroup,
      activeHabitatBoost,
      // 旧キー（shine/dawn）を含む保存データを現行キーへ移行する。
      activeFormByMonsterId: Object.fromEntries(
        Object.entries(unlocks.activeFormByMonsterId ?? {}).map(([id, stage]) => [id, normalizeFormStage(stage)])
      ),
      unlockedFormsByMonsterId: Object.fromEntries(
        Object.entries(unlocks.unlockedFormsByMonsterId ?? {}).map(([id, stages]) => [
          id,
          Array.from(new Set((Array.isArray(stages) ? stages : []).map((stage) => normalizeFormStage(stage))))
        ])
      ),
      unlockedBackgrounds: Array.isArray(unlocks.unlockedBackgrounds) ? unlocks.unlockedBackgrounds : [],
      activeBackgroundByMonsterId:
        unlocks.activeBackgroundByMonsterId && typeof unlocks.activeBackgroundByMonsterId === "object"
          ? unlocks.activeBackgroundByMonsterId
          : {},
      unlockedFrames: Array.isArray(unlocks.unlockedFrames) ? unlocks.unlockedFrames : [],
      unlockedHints: Array.isArray(unlocks.unlockedHints) ? unlocks.unlockedHints : []
    },
    titles: {
      unlockedTitleIds: normalizedUnlockedTitleIds,
      activeTitleId
    }
  };
};

export const sumRewardLines = (lines: DPRewardLine[]): number =>
  lines.reduce((total, line) => total + Math.max(0, line.amount), 0);
