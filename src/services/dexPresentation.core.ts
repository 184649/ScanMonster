/**
 * 図鑑分類ごとの提示・レア演出ルール（純粋・テスト可能）。
 *
 * 方針：画像はリアルイラストで統一し、**イラスト自体に過剰なエフェクトを描き込まない**。
 * 特別感は UI レイヤー（枠・ヘッダ・発見演出・SE・共有導線）で付与する。
 * 一覧画面・発見演出・詳細画面・シェアカードで**一貫したトーン**を保つ。
 *
 * 「豪華」ではなく「特別」。SECRET だけが過剰に浮かないよう全体トーンを揃える。
 *
 * このモジュールは表示専用。抽選・出現確率・解放条件へは一切影響しない。
 */
import type { DexClass } from "../data/characterCatalog.generated";
import type { SoundId } from "../types/sound";

/**
 * ここで使う色。src/theme.ts の同名トークンと同じ値を持つ。
 *
 * このモジュールは純粋（実行時 import を持たない）に保つため、theme を直接読み込まず値を持つ。
 * theme.ts 側で値が変わったまま放置されないよう、tests/dexPresentationAndShare.test.ts が
 * theme.ts の実ファイルと突き合わせて不一致を検出する。
 */
const colors = {
  border: "#E2E8F0",
  borderFaint: "#EEF2F7",
  surface: "#FFFFFF",
  surfaceMuted: "#F8FAFC",
  ink: "#0F172A",
  textSlate: "#52627A",
  white: "#FFFFFF",
  // RARE：シルバー〜淡い虹彩
  rareSilver: "#C7CDD6",
  rareSilverSoft: "#F3F5F8",
  rareIridescent: "#AFC6E9",
  rareInk: "#41506B",
  // LEGEND：ブロンズ／ダークゴールド／アンバー
  legendBronze: "#9C6B3F",
  legendDarkGold: "#B08542",
  legendAmber: "#D9A05B",
  legendDeep: "#2B1E12",
  legendSoft: "#F6EFE4",
  // SECRET：深い紫／濃紺／青緑／黒金
  secretPurple: "#3B2A5A",
  secretNavy: "#111B34",
  secretTeal: "#1F4A4A",
  secretBlackGold: "#C9A14A",
  secretSoft: "#EDEAF3"
} as const;

/** 発見演出の強度。数値が大きいほど重い演出になる。 */
export type RevealIntensity = 0 | 1 | 2 | 3;

/** 発見演出の入り方。 */
export type RevealEntrance =
  | "fade" // 短めのフェードイン（NORMAL）
  | "glow" // 枠の発光（RARE）
  | "dim_then_rise" // 暗転からゆっくり出現（LEGEND）
  | "silhouette_then_reveal"; // シルエット → イラスト（SECRET）

export type DexPresentation = {
  // ---- 一覧カード ----
  /** カード枠の色。 */
  frameColor: string;
  /** カード背景（淡い面）。 */
  backgroundColor: string;
  /** 枠の太さ。格上ほど太くする。 */
  frameWidth: number;
  /** カード内側の subtle glow を出すか（RARE 以上）。 */
  hasInnerGlow: boolean;
  /** glow の色。 */
  glowColor: string;

  // ---- ラベル ----
  /** 一覧・詳細に出す日本語ラベル。 */
  badgeLabel: string;
  /** 一覧に出す英字ラベル。NORMAL は出さない（undefined）。 */
  rarityTag: string | undefined;
  badgeTextColor: string;
  badgeBackgroundColor: string;

  // ---- 詳細画面 ----
  /** 詳細ヘッダの背景。 */
  headerBackgroundColor: string;
  /** 詳細ヘッダの文字色。**本文の可読性を最優先**するため、本文には使わない。 */
  headerTextColor: string;

  // ---- 発見演出 ----
  revealIntensity: RevealIntensity;
  revealEntrance: RevealEntrance;
  /** 発見時の日本語見出し。 */
  revealHeadline: string;
  /** 発見時の英字表示（"RARE DISCOVERED" 等）。NORMAL は出さない。 */
  revealTag: string | undefined;
  /** 演出のおおよその長さ（ミリ秒）。 */
  revealDurationMs: number;
  /** 発見時に鳴らす SE。 */
  revealSound: SoundId;
  /** 発見日時と図鑑番号を目立たせるか（LEGEND 以上）。 */
  emphasizeRecordMeta: boolean;

  // ---- 共有導線 ----
  /** 共有ボタンを強調するか。 */
  emphasizeShare: boolean;
  /** 共有導線の優先度。大きいほど上に置く。SECRET が最優先。 */
  sharePriority: 0 | 1 | 2 | 3;
};

const PRESENTATION: Record<DexClass, DexPresentation> = {
  // 現生生物の通常形態：シンプルな枠・ナチュラルな背景・控えめな情報量。
  NORMAL: {
    frameColor: colors.border,
    backgroundColor: colors.surface,
    frameWidth: 1.2,
    hasInnerGlow: false,
    glowColor: "transparent",
    badgeLabel: "現生",
    rarityTag: undefined,
    badgeTextColor: colors.textSlate,
    badgeBackgroundColor: colors.surfaceMuted,
    headerBackgroundColor: colors.surfaceMuted,
    headerTextColor: colors.ink,
    revealIntensity: 0,
    revealEntrance: "fade",
    revealHeadline: "発見！",
    revealTag: undefined,
    revealDurationMs: 600,
    revealSound: "discovery_normal",
    emphasizeRecordMeta: false,
    emphasizeShare: false,
    sharePriority: 0
  },
  // 実在する希少形態：光沢感のあるシルバー〜淡い虹彩。ひと目で分かるが派手にしない。
  RARE: {
    frameColor: colors.rareSilver,
    backgroundColor: colors.rareSilverSoft,
    frameWidth: 2,
    hasInnerGlow: true,
    glowColor: colors.rareIridescent,
    badgeLabel: "希少形態",
    rarityTag: "RARE",
    badgeTextColor: colors.rareInk,
    badgeBackgroundColor: colors.rareSilverSoft,
    headerBackgroundColor: colors.rareSilverSoft,
    headerTextColor: colors.rareInk,
    revealIntensity: 2,
    revealEntrance: "glow",
    revealHeadline: "希少な個体を発見！",
    revealTag: "RARE DISCOVERED",
    revealDurationMs: 1400,
    revealSound: "discovery_rare",
    emphasizeRecordMeta: false,
    emphasizeShare: true,
    sharePriority: 1
  },
  // 絶滅した実在生物：化石・地層・古代図鑑を想起するブロンズ／ダークゴールド／アンバー。
  LEGEND: {
    frameColor: colors.legendDarkGold,
    backgroundColor: colors.legendSoft,
    frameWidth: 2.5,
    hasInnerGlow: true,
    glowColor: colors.legendAmber,
    badgeLabel: "絶滅生物",
    rarityTag: "LEGEND",
    badgeTextColor: colors.legendSoft,
    badgeBackgroundColor: colors.legendBronze,
    headerBackgroundColor: colors.legendDeep,
    headerTextColor: colors.legendAmber,
    revealIntensity: 3,
    revealEntrance: "dim_then_rise",
    revealHeadline: "失われた生きものの記録",
    revealTag: "LEGEND DISCOVERED",
    revealDurationMs: 2400,
    revealSound: "discovery_legend",
    emphasizeRecordMeta: true,
    emphasizeShare: true,
    sharePriority: 2
  },
  // 神話・伝承・空想：深い紫／濃紺／青緑／黒金。伝承・禁書感。共有導線の主役。
  SECRET: {
    frameColor: colors.secretBlackGold,
    backgroundColor: colors.secretSoft,
    frameWidth: 2.5,
    hasInnerGlow: true,
    glowColor: colors.secretPurple,
    badgeLabel: "未確認の存在",
    rarityTag: "SECRET",
    badgeTextColor: colors.secretBlackGold,
    badgeBackgroundColor: colors.secretNavy,
    headerBackgroundColor: colors.secretPurple,
    headerTextColor: colors.secretBlackGold,
    revealIntensity: 3,
    revealEntrance: "silhouette_then_reveal",
    revealHeadline: "未知の存在との遭遇",
    revealTag: "SECRET DISCOVERED",
    revealDurationMs: 2800,
    revealSound: "discovery_secret",
    emphasizeRecordMeta: true,
    emphasizeShare: true,
    sharePriority: 3
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

/**
 * 発見時の英字表示。**初発見のときだけ出す。**
 * 再発見で毎回 "SECRET DISCOVERED" が出ると特別感が薄れる。
 */
export const revealTagFor = (dexClass: DexClass, isFirstDiscovery: boolean): string | undefined =>
  isFirstDiscovery ? getDexPresentation(dexClass).revealTag : undefined;

/** 発見時の入り方。再発見は常に短いフェード。 */
export const revealEntranceFor = (dexClass: DexClass, isFirstDiscovery: boolean): RevealEntrance =>
  isFirstDiscovery ? getDexPresentation(dexClass).revealEntrance : "fade";

/** 発見時の演出長。再発見は短縮する。 */
export const revealDurationFor = (dexClass: DexClass, isFirstDiscovery: boolean): number =>
  isFirstDiscovery ? getDexPresentation(dexClass).revealDurationMs : 600;

/** 発見時の SE。再発見は共通の再発見音。 */
export const revealSoundFor = (dexClass: DexClass, isFirstDiscovery: boolean): SoundId =>
  isFirstDiscovery ? getDexPresentation(dexClass).revealSound : "rediscovery";

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

// ---- 完成演出 ----

/** 完成演出の種類。通常の発見より大きい演出にする。 */
export type CompletionKind =
  | "world" // ワールド完成
  | "dexClass" // 分類完成（その分類を全発見）
  | "firstComplete" // 初回コンプリート（最初にどれか1つを完成させた）
  | "full"; // 図鑑100%達成

export type CompletionCelebration = {
  kind: CompletionKind;
  title: string;
  subtitle: string;
  /** 記念カードに代表イラストを並べるか。ワールド完成のみ。 */
  showsRepresentativeGallery: boolean;
  /** 演出強度。図鑑100%が最大。 */
  intensity: RevealIntensity;
  sound: SoundId;
  /** 共有導線を出すか。 */
  offersShare: boolean;
};

/**
 * 完成演出の内容を決める。
 * 通常の発見（強度0〜3）より大きく見せるため、いずれも intensity 3 以上の扱いにする。
 */
export const completionCelebrationOf = (kind: CompletionKind, label: string): CompletionCelebration => {
  switch (kind) {
    case "world":
      return {
        kind,
        title: `${label}の図鑑が完成`,
        subtitle: "このワールドの生きものをすべて発見しました。",
        showsRepresentativeGallery: true, // 代表生物を並べた記念カード
        intensity: 3,
        sound: "dex_complete",
        offersShare: true
      };
    case "dexClass":
      return {
        kind,
        title: `${label}をすべて発見`,
        subtitle: "この分類の図鑑が完成しました。",
        showsRepresentativeGallery: false,
        intensity: 3,
        sound: "dex_complete",
        offersShare: true
      };
    case "firstComplete":
      return {
        kind,
        title: "はじめてのコンプリート",
        subtitle: `${label}を最後まで埋めました。`,
        showsRepresentativeGallery: true,
        intensity: 3,
        sound: "dex_complete",
        offersShare: true
      };
    case "full":
    default:
      return {
        kind: "full",
        title: "図鑑 100% 達成",
        subtitle: "すべての生きものを発見しました。",
        showsRepresentativeGallery: true,
        intensity: 3,
        sound: "dex_complete",
        offersShare: true
      };
  }
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

/**
 * 今回出すべき完成演出を1つだけ選ぶ。
 * 複数同時に成立した場合は「大きい方」を優先する（full > firstComplete > dexClass > world）。
 * 何も成立しなければ undefined。
 */
export const pickCompletionCelebration = (input: {
  worldComplete: boolean;
  worldLabel: string;
  dexClassComplete: boolean;
  dexClassLabel: string;
  isFirstEverComplete: boolean;
  fullDexComplete: boolean;
}): CompletionCelebration | undefined => {
  if (input.fullDexComplete) return completionCelebrationOf("full", "");
  if (input.isFirstEverComplete && (input.worldComplete || input.dexClassComplete)) {
    return completionCelebrationOf("firstComplete", input.worldComplete ? input.worldLabel : input.dexClassLabel);
  }
  if (input.dexClassComplete) return completionCelebrationOf("dexClass", input.dexClassLabel);
  if (input.worldComplete) return completionCelebrationOf("world", input.worldLabel);
  return undefined;
};
