/**
 * 図鑑分類ごとの提示ルール（純粋・テスト可能）。
 *
 * 方針：画像はリアルイラストで統一し、生々しさを足さない。
 * 特別感は**画像ではなくUI側**（枠・背景・発見演出・共有導線）で作る。
 * したがって画像へレア演出を焼き込む設計は持たず、ここで枠色・演出強度だけを決める。
 *
 * このモジュールは表示専用。抽選・出現確率・解放条件へは一切影響しない。
 */
import type { DexClass } from "../data/characterCatalog.generated";

/**
 * ここで使う色。src/theme.ts の同名トークンと同じ値を持つ。
 *
 * このモジュールは純粋（実行時 import を持たない）に保つため、theme を直接読み込まず値を持つ。
 * theme.ts 側で値が変わったまま放置されないよう、tests/dexPresentationAndShare.test.ts が
 * theme.ts の実ファイルと突き合わせて不一致を検出する。
 */
const colors = {
  border: "#E2E8F0",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  textSlate: "#52627A",
  primary: "#1D4ED8",
  primaryInk: "#1E40AF",
  primarySoft: "#EAF2FF",
  gold: "#C6A15B",
  navy: "#071B46",
  brandNavy: "#0B1B3B"
} as const;

/** 発見演出の強度。数値が大きいほど重い演出になる。 */
export type RevealIntensity = 0 | 1 | 2 | 3;

export type DexPresentation = {
  /** 図鑑カードの枠色。 */
  frameColor: string;
  /** カード背景（淡い面）。 */
  backgroundColor: string;
  /** 分類バッジの文字色。 */
  badgeTextColor: string;
  /** 分類バッジの背景。 */
  badgeBackgroundColor: string;
  /** バッジ文言。 */
  badgeLabel: string;
  /** 発見演出の強度。NORMAL は過剰な演出をしない。 */
  revealIntensity: RevealIntensity;
  /** 発見時の見出し。 */
  revealHeadline: string;
  /** 共有導線を強く出すか（レア以上）。 */
  emphasizeShare: boolean;
};

const PRESENTATION: Record<DexClass, DexPresentation> = {
  // 現生生物の通常形態：自然な見た目。過剰な演出をしない。
  NORMAL: {
    frameColor: colors.border,
    backgroundColor: colors.surface,
    badgeTextColor: colors.textSlate,
    badgeBackgroundColor: colors.surfaceMuted,
    badgeLabel: "現生",
    revealIntensity: 0,
    revealHeadline: "発見！",
    emphasizeShare: false
  },
  // 実在する希少形態：通常種との差が分かるよう、UIで特別感を強く出す。
  RARE: {
    frameColor: colors.primary,
    backgroundColor: colors.primarySoft,
    badgeTextColor: colors.primaryInk,
    badgeBackgroundColor: colors.primarySoft,
    badgeLabel: "希少形態",
    revealIntensity: 2,
    revealHeadline: "希少な個体を発見！",
    emphasizeShare: true
  },
  // 絶滅した実在生物：図鑑・復元感を強調し、重厚な演出。
  LEGEND: {
    frameColor: colors.gold,
    backgroundColor: colors.navy,
    badgeTextColor: colors.gold,
    badgeBackgroundColor: colors.navy,
    badgeLabel: "絶滅生物",
    revealIntensity: 3,
    revealHeadline: "失われた生きものの記録",
    emphasizeShare: true
  },
  // 神話・伝承・空想：レア演出と共有導線の主役。
  SECRET: {
    frameColor: colors.gold,
    backgroundColor: colors.brandNavy,
    badgeTextColor: colors.gold,
    badgeBackgroundColor: colors.brandNavy,
    badgeLabel: "未確認の存在",
    revealIntensity: 3,
    revealHeadline: "未知の存在との遭遇",
    emphasizeShare: true
  }
};

export const getDexPresentation = (dexClass: DexClass): DexPresentation => PRESENTATION[dexClass] ?? PRESENTATION.NORMAL;

/**
 * 初発見かどうかで演出を1段引き上げる。
 * 再発見では演出を重くしない（毎回同じ重さだと飽きるため）。
 */
export const revealIntensityFor = (dexClass: DexClass, isFirstDiscovery: boolean): RevealIntensity => {
  const base = getDexPresentation(dexClass).revealIntensity;
  if (!isFirstDiscovery) return 0;
  return Math.min(3, base + 1) as RevealIntensity;
};

/** 発見時の見出し（初発見のみ「はじめて」を付ける）。 */
export const revealHeadlineFor = (dexClass: DexClass, isFirstDiscovery: boolean): string => {
  const base = getDexPresentation(dexClass).revealHeadline;
  return isFirstDiscovery && dexClass === "NORMAL" ? "はじめての発見！" : base;
};

// ---- 図鑑の進捗表示 ----

export type DexProgress = {
  discovered: number;
  total: number;
  /** 0..1。total が 0 のときは 0。 */
  ratio: number;
  /** 0..100 の整数（切り捨て。100%は全件発見時のみ）。 */
  percent: number;
  isComplete: boolean;
  /** あと何種で完成するか。 */
  remaining: number;
};

/**
 * 図鑑の完成率。
 * 99.6% を四捨五入して 100% と出すと「完成したのに完成演出が出ない」ため、
 * **切り捨て**にして 100% は本当に全件発見したときだけにする。
 */
export const dexProgressOf = (discovered: number, total: number): DexProgress => {
  const safeTotal = Math.max(0, total);
  const safeDiscovered = Math.max(0, Math.min(discovered, safeTotal));
  const ratio = safeTotal === 0 ? 0 : safeDiscovered / safeTotal;
  const isComplete = safeTotal > 0 && safeDiscovered >= safeTotal;
  return {
    discovered: safeDiscovered,
    total: safeTotal,
    ratio,
    percent: isComplete ? 100 : Math.floor(ratio * 100),
    isComplete,
    remaining: safeTotal - safeDiscovered
  };
};

/** 進捗に応じた一言。「あと少し」を可視化して収集欲を押す。 */
export const dexProgressMessage = (p: DexProgress): string => {
  if (p.total === 0) return "準備中です。";
  if (p.isComplete) return "このワールドの図鑑が完成しました。";
  if (p.remaining === 1) return "あと1種で完成です。";
  if (p.remaining <= 3) return `あと${p.remaining}種で完成です。`;
  if (p.percent >= 50) return `折り返しです。あと${p.remaining}種。`;
  if (p.discovered === 0) return "スキャンして最初の1種を見つけましょう。";
  return `あと${p.remaining}種。`;
};

/**
 * ワールド完成演出を出すべきか。
 * 完成しており、かつまだそのワールドの完成演出を見せていないときだけ true。
 */
export const shouldCelebrateWorldComplete = (
  progress: DexProgress,
  worldGroup: string,
  celebrated: ReadonlySet<string>
): boolean => progress.isComplete && !celebrated.has(worldGroup);
