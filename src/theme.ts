/**
 * WORLDAWN デザイントークン（唯一の正本）。
 *
 * 目的：各画面にハードコードで散在していた色・角丸・余白・字体を意味単位で一元化し、
 * 数百キャラを並べても「同じゲームの画面」に見える統一感を担保する。
 * 近似の重複値（濃紺 #071B46/#0B1B3B/#16324F、青 #1D4ED8/#2563EB、灰の各段階など）は
 * ここで1つの canonical 値へ集約する。新規UIは生ヘックスを書かず必ずこのトークンを参照すること。
 *
 * ブランド署名：濃紺 navy #0B1B3B ／ 金 gold #C6A15B（設計書のWORLDAWNブランド）。
 */

export const colors = {
  // --- ブランド署名 ---
  // navy は既存実装の主流値 #071B46 に合わせて集約（視覚回帰なし。旧 #16324F 等の近似濃紺もこれへ寄せる）。
  navy: "#071B46", // 濃紺（見出し・強調・暗色面）
  brandNavy: "#0B1B3B", // 設計書のブランド濃紺（将来のリブランド用。現状UIは navy を使用）
  gold: "#C6A15B", // 金（ブランドアクセント・暁紋等）

  // --- 背景・面 ---
  screenBg: "#F7FAFF", // 画面全体の淡い背景
  surface: "#FFFFFF", // カード面
  surfaceMuted: "#F8FAFC", // 押下・淡いゾーン

  // --- テキスト ---
  ink: "#0F172A", // 主要テキスト（slate-900）
  textBody: "#334155", // 本文（slate-700）
  textMuted: "#64748B", // 補助（slate-500）
  textSlate: "#52627A", // やや青みの濃灰（本文・補足で多用。既存値を厳密保持）
  textFaint: "#94A3B8", // 最も淡い・見出しラベル（slate-400）

  // --- 罫線 ---
  border: "#E2E8F0", // 標準罫線（slate-200）
  borderFaint: "#EEF2F7", // 淡い罫線・区切り

  // --- アクション（青系） ---
  primary: "#1D4ED8", // 主要アクション（旧 #2563EB を統一）
  primaryInk: "#1E40AF", // 青文字・ghost文字
  primarySoft: "#EAF2FF", // ghost背景・淡い青面

  // --- 状態 ---
  success: "#2FA84F", // 成功・DP・発見
  successDark: "#166534",
  successSoft: "#DCFCE7",
  danger: "#DC2626", // 削除・お気に入りハート等の警告赤
  warn: "#FACC15", // 注意・secondaryボタン（旧 #FCD34D と併用可: accentGold）
  accentGold: "#FCD34D", // レア/金アクセント（明るい金）
  accentGoldInk: "#92400E",
  accentGoldSoft: "#FFFBEB",

  // --- レアリティ演出（図鑑分類ごとの枠・ヘッダ・記念カード）---
  // 画像へは焼き込まず、UIレイヤーだけで特別感を作るための色。
  // 「豪華」ではなく「特別」。リアルイラストの上品さを壊さない範囲に留める。
  // RARE：シルバー〜淡い虹彩
  rareSilver: "#C7CDD6",
  rareSilverSoft: "#F3F5F8",
  rareIridescent: "#AFC6E9",
  rareInk: "#41506B",
  // LEGEND：ブロンズ／ダークゴールド／アンバー（化石・地層・古代図鑑）
  legendBronze: "#9C6B3F",
  legendDarkGold: "#B08542",
  legendAmber: "#D9A05B",
  legendDeep: "#2B1E12",
  legendSoft: "#F6EFE4",
  // SECRET：深い紫／濃紺／青緑／黒金（伝承・禁書）
  secretPurple: "#3B2A5A",
  secretNavy: "#111B34",
  secretTeal: "#1F4A4A",
  secretBlackGold: "#C9A14A",
  secretSoft: "#EDEAF3",

  // --- 汎用 ---
  white: "#FFFFFF"
} as const;

/** 角丸スケール。chip=sm / ボタン・入力=md / カード=lg / 円・ピル=pill。 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999
} as const;

/** 余白スケール（4の倍数）。 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
} as const;

/** カード共通の影（iOS/Android）。 */
export const cardShadow = {
  shadowColor: colors.ink,
  shadowOpacity: 0.05,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 1
} as const;

export type ThemeColor = keyof typeof colors;
