import type { HabitatBoost, HabitatGroup } from "./habitat";
import type { UserTitleState } from "./title";

export type FormStage = "base" | "kou" | "sai" | "sei" | "gen" | "gyo";

export type DiscoveryRewardKind =
  | "login"
  | "first_scan_today"
  | "new_species"
  | "new_variant"
  | "already_discovered"
  | "rediscovery"
  | "rare_rediscovery"
  | "qr_bonus"
  | "hidden_rare"
  | "daily_scan_3"
  | "daily_scan_5"
  | "dex_progress"
  | "friend_invite"
  // 1日1スキャン報酬（週内の連続発見日数で額が決まる）。
  | "daily_scan_bonus"
  | "weekly_scan_streak_bonus"
  | "habitat_unlock"
  | "habitat_boost"
  // カテゴリ図鑑の初発見・節目ボーナス。
  | "category_new"
  | "category_milestone";

export type DPRewardLine = {
  id: string;
  kind: DiscoveryRewardKind;
  label: string;
  amount: number;
};

export type DPLedgerEntry = {
  id: string;
  amount: number;
  balanceAfter: number;
  label: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean>;
};

export type DailyScanRewardState = {
  dateKey: string;
  scanCount: number;
  firstScanAwarded: boolean;
  milestone3Awarded: boolean;
  milestone5Awarded: boolean;
};

/** 週内の連続発見日数（1〜7）。 */
export type WeeklyStreakDay = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/**
 * スキャン連続発見の状態。ログインではなく「その日の最初の有効な発見」で進む。
 * 週（7日）区切りで報酬が決まり、8日目は次の週の1日目に戻る。
 */
export type ScanStreakState = {
  /** 最後に1日1スキャン報酬を付与したローカル日付。null＝未達成。 */
  lastDailyScanDate: string | null;
  /** 通算の連続発見日数（途切れると1に戻る）。 */
  totalScanStreakDays: number;
  /** 週内の連続発見日数（1〜7）。報酬額の決定に使う。 */
  weeklyStreakDay: WeeklyStreakDay;
  /** 何週目か（1始まり）。 */
  streakWeek: number;
  /** 報酬を受け取った日付の一覧（重複付与防止・履歴用）。 */
  claimedDailyScanRewardDates: string[];
  /** 過去最高の連続発見日数。 */
  bestScanStreakDays: number;
};

export type LoginBonusState = {
  firstLoginBonusClaimed: boolean;
  lastLoginDate?: string;
  streakDays: number;
  todayEarnedDP: number;
  lastRewards: DPRewardLine[];
};

export type UnlockState = {
  unlockedHabitatGroups: HabitatGroup[];
  /** 解放済み領域（表示・拡張用。DP解放単位ではない）。初期は life。 */
  unlockedRealmGroups: import("./worlds").RealmGroup[];
  /** 解放済みワールド（DP解放の単位・出現ゲート）。初回選択後に1つ入る。 */
  unlockedWorldGroups: import("./worlds").WorldGroup[];
  /** 初回選択したワールド（ground/waterside/sky/bug）。 */
  selectedInitialWorldGroup?: import("./worlds").WorldGroup;
  /** ワールドブースト（対象ワールドの出現率のみ上げる。レア確率は不変）。 */
  activeWorldBoost?: import("./worlds").WorldBoost;
  selectedInitialHabitatGroup?: HabitatGroup;
  activeHabitatBoost?: HabitatBoost;
  activeFormByMonsterId: Record<string, FormStage>;
  unlockedFormsByMonsterId: Record<string, FormStage[]>;
  unlockedBackgrounds: string[];
  /** 個体ごとに選択中の背景キー（未選択なら背景画像なし）。 */
  activeBackgroundByMonsterId: Record<string, string>;
  unlockedFrames: string[];
  unlockedHints: string[];
};

export type EconomyStateData = {
  dpBalance: number;
  ledger: DPLedgerEntry[];
  login: LoginBonusState;
  dailyScanRewards: Record<string, DailyScanRewardState>;
  /** スキャン連続発見（1週間区切り）の状態。 */
  scanStreak: ScanStreakState;
  claimedDexBonuses: string[];
  /** 付与済みのカテゴリ図鑑ボーナスID（例: "drink:new" / "drink:10"）。 */
  claimedCategoryBonuses: string[];
  unlocks: UnlockState;
  titles: UserTitleState;
};

export type SpendDPResult =
  | { ok: true; balanceAfter: number; message: string }
  | { ok: false; balanceAfter: number; message: string };
