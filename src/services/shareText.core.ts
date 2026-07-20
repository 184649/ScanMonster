/**
 * SNS 共有テキストの生成（純粋・テスト可能）。
 *
 * プライバシー方針（テストで固定する）：
 *  - バーコード/QRの値、sourceHash、正確なスキャン時刻、位置座標は**絶対に含めない**。
 *  - 都道府県は「発見した地域名」までにとどめ、座標は出さない。
 *  - 未解放の伝説・未発見種の名前を漏らさない（呼び出し側が渡さない前提だが、ここでも受け取らない）。
 *
 * 体験方針：
 *  - レア以上は「見せたくなる」文面にする。
 *  - 図鑑の進捗を必ず添えて、コンプリート欲と他人の参加動機をつくる。
 */
import type { DexClass } from "../data/characterCatalog.generated";
import type { DexProgress } from "./dexPresentation.core";

/**
 * 共有文面に使う分類ラベルと見出し。
 *
 * dexPresentation.core と同じ値を持つ（純粋モジュール同士の実行時 import を避けるため）。
 * ずれないよう tests/dexPresentationAndShare.test.ts が両者の一致を検証する。
 */
const SHARE_LABELS: Record<DexClass, { badgeLabel: string; revealHeadline: string }> = {
  NORMAL: { badgeLabel: "現生", revealHeadline: "発見！" },
  RARE: { badgeLabel: "希少形態", revealHeadline: "希少な個体を発見！" },
  LEGEND: { badgeLabel: "絶滅生物", revealHeadline: "失われた生きものの記録" },
  SECRET: { badgeLabel: "未確認の存在", revealHeadline: "未知の存在との遭遇" }
};

const labelsOf = (dexClass: DexClass) => SHARE_LABELS[dexClass] ?? SHARE_LABELS.NORMAL;

/** 進捗計算（dexProgressOf と同じ規則。100% は全件発見時のみ）。 */
const progressOf = (discovered: number, total: number): DexProgress => {
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

export const SHARE_HASHTAG = "#WORLDAWN";

export type ShareSubject = {
  /** 表示名（発見済みのもののみ）。 */
  name: string;
  /** 和名。無ければ省略。 */
  speciesJa?: string;
  dexClass: DexClass;
  /** 公式発見番号。未採番なら省略。 */
  officialNo?: string;
  /** ワールド表示名。 */
  worldLabel?: string;
  isFirstDiscovery: boolean;
};

/** 1体の発見を共有する文面。 */
export const buildDiscoveryShareText = (subject: ShareSubject, progress?: DexProgress): string => {
  const p = labelsOf(subject.dexClass);
  const lines: string[] = [];

  lines.push(subject.isFirstDiscovery ? `${p.revealHeadline}` : "また会えました。");

  const species = subject.speciesJa && subject.speciesJa !== subject.name ? `（${subject.speciesJa}）` : "";
  lines.push(`${subject.name}${species}`);

  const meta: string[] = [p.badgeLabel];
  if (subject.worldLabel) meta.push(subject.worldLabel);
  if (subject.officialNo) meta.push(`No.${subject.officialNo}`);
  lines.push(meta.join(" / "));

  if (progress && progress.total > 0) {
    lines.push(`図鑑 ${progress.discovered}/${progress.total}（${progress.percent}%）`);
  }

  lines.push(SHARE_HASHTAG);
  return lines.join("\n");
};

/** ワールド完成を共有する文面。 */
export const buildWorldCompleteShareText = (worldLabel: string, total: number): string =>
  [`${worldLabel}の図鑑が完成しました。`, `${total}種すべて発見`, SHARE_HASHTAG].join("\n");

/** 「今日の発見」まとめの共有文面。件数が0なら undefined（共有導線を出さない）。 */
export const buildTodayShareText = (
  discoveries: Array<{ name: string; dexClass: DexClass }>,
  progress?: DexProgress
): string | undefined => {
  if (discoveries.length === 0) return undefined;
  const lines: string[] = [`今日の発見（${discoveries.length}種）`];
  for (const d of discoveries.slice(0, 5)) {
    lines.push(`・${d.name}（${labelsOf(d.dexClass).badgeLabel}）`);
  }
  if (discoveries.length > 5) lines.push(`ほか${discoveries.length - 5}種`);
  if (progress && progress.total > 0) lines.push(`図鑑 ${progress.discovered}/${progress.total}（${progress.percent}%）`);
  lines.push(SHARE_HASHTAG);
  return lines.join("\n");
};

/** 「今週のコレクション」の共有文面。件数が0なら undefined。 */
export const buildWeeklyShareText = (
  weeklyCount: number,
  streakDays: number,
  progress?: DexProgress
): string | undefined => {
  if (weeklyCount <= 0) return undefined;
  const lines: string[] = [`今週は${weeklyCount}種を発見しました。`];
  if (streakDays >= 2) lines.push(`${streakDays}日連続で発見中`);
  if (progress && progress.total > 0) lines.push(`図鑑 ${progress.discovered}/${progress.total}（${progress.percent}%）`);
  lines.push(SHARE_HASHTAG);
  return lines.join("\n");
};

/**
 * 共有文面に機微情報が含まれていないかの検査。
 * 呼び出し側の実装ミスを検出するための最終防衛線。テストでも使う。
 */
const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b\d{8,}\b/, reason: "バーコード値らしき長い数字列" },
  { pattern: /\b[0-9a-f]{16,}\b/i, reason: "ハッシュらしき16進文字列" },
  { pattern: /\b\d{1,3}\.\d{4,}\b/, reason: "緯度経度らしき座標" },
  { pattern: /\d{1,2}:\d{2}:\d{2}/, reason: "秒単位の時刻" }
];

export const findShareTextLeaks = (text: string): string[] =>
  FORBIDDEN_PATTERNS.filter((f) => f.pattern.test(text)).map((f) => f.reason);

/** 進捗つき共有文面を作るときの補助。 */
export const shareProgressOf = (discovered: number, total: number): DexProgress => progressOf(discovered, total);
