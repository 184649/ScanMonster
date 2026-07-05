/**
 * 番号価値の判定（純粋ロジック・仕様 §16）。BIGINT 相当の string を Number 化せず、
 * 主に桁パターンで判定する（4桁以内の限定比較のみ Number を内部使用）。
 */
import type { DiscoveryNumberBadge, NumberTag, NumberValueRank } from "../types/discoveryRecord";

const VALUE_ORDER: NumberValueRank[] = ["normal", "memorial", "rare", "premium", "legend"];
const rankIndex = (rank: NumberValueRank): number => VALUE_ORDER.indexOf(rank);

/** 前ゼロを除いた10進表現。数字以外は除去。全ゼロは "0"。 */
export const normalizeDigits = (noStr: string): string => {
  const only = (noStr ?? "").replace(/[^0-9]/g, "");
  const trimmed = only.replace(/^0+/, "");
  return trimmed.length > 0 ? trimmed : only.length > 0 ? "0" : "";
};

const isRepdigit = (s: string): boolean => s.length >= 2 && /^(\d)\1+$/.test(s);
const isLucky7 = (s: string): boolean => /^7+$/.test(s);
const isRound = (s: string): boolean => /^[1-9]0+$/.test(s);
const isSequential = (s: string): boolean => {
  if (s.length < 3) return false;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) !== s.charCodeAt(i - 1) + 1) return false;
  }
  return true;
};
const isReverseSequential = (s: string): boolean => {
  if (s.length < 3) return false;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) !== s.charCodeAt(i - 1) - 1) return false;
  }
  return true;
};
const isPalindrome = (s: string): boolean => s.length >= 3 && s === s.split("").reverse().join("");
const isYear = (s: string): boolean => {
  if (s.length !== 4) return false;
  const n = Number(s);
  return n >= 1900 && n <= 2099;
};
const isEarly = (s: string): boolean => s.length <= 2 && Number(s) <= 10;

/** 番号の特徴タグを収集する。 */
export const collectNumberTags = (noStr: string): NumberTag[] => {
  const s = normalizeDigits(noStr);
  if (s.length === 0 || s === "0") return [];
  const tags: NumberTag[] = [];
  if (isEarly(s)) tags.push("early");
  if (isRound(s)) tags.push("round");
  if (isRepdigit(s)) tags.push("repdigit");
  if (isSequential(s)) tags.push("sequential");
  if (isReverseSequential(s)) tags.push("reverse_sequential");
  if (isPalindrome(s) && !isRepdigit(s)) tags.push("palindrome");
  if (isLucky7(s)) tags.push("lucky7");
  if (isYear(s)) tags.push("year");
  return tags;
};

/** 番号価値ランクを判定する（最も高い価値を採用）。 */
export const judgeNumberValueRank = (noStr: string): NumberValueRank => {
  const s = normalizeDigits(noStr);
  if (s.length === 0 || s === "0") return "normal";
  const len = s.length;
  const value = len <= 4 ? Number(s) : NaN;

  let rank: NumberValueRank = "normal";
  const bump = (r: NumberValueRank) => {
    if (rankIndex(r) > rankIndex(rank)) rank = r;
  };

  // legend
  if (value === 1) bump("legend"); // No.001
  if (isLucky7(s) && len === 1) bump("legend"); // No.007
  if (isYear(s)) bump("legend"); // No.2026
  // 他の1桁低番号
  if (value >= 2 && value <= 9) bump("premium");

  // lucky7（複数桁）
  if (isLucky7(s) && len >= 2) bump("premium"); // 77, 777

  // キリ番
  if (isRound(s)) {
    if (value === 100) bump("rare");
    else if (len >= 4) bump("premium"); // 1000, 2000...
    else bump("memorial"); // 10,20,...,90
  }

  // ゾロ目（7以外）
  if (isRepdigit(s) && !isLucky7(s)) {
    if (len === 2) bump("memorial"); // 11,22
    else bump("rare"); // 111,222
  }

  // 連番/逆連番
  if (isSequential(s)) bump(len === 3 ? "rare" : "premium");
  if (isReverseSequential(s)) bump(len === 3 ? "rare" : "premium");

  // ミラー番号
  if (isPalindrome(s) && !isRepdigit(s)) bump("rare");

  return rank;
};

const LABEL_PRIORITY: { tag: NumberTag; label: string }[] = [
  { tag: "lucky7", label: "ラッキーセブン" },
  { tag: "year", label: "年号番号" },
  { tag: "early", label: "若い番号" },
  { tag: "sequential", label: "連番" },
  { tag: "reverse_sequential", label: "逆連番" },
  { tag: "palindrome", label: "ミラー番号" },
  { tag: "repdigit", label: "ゾロ目" },
  { tag: "round", label: "キリ番" }
];

/** タグ集合から表示ラベルを1つ選ぶ。 */
export const numberValueLabel = (tags: NumberTag[]): string => {
  for (const entry of LABEL_PRIORITY) {
    if (tags.includes(entry.tag)) return entry.label;
  }
  return "通常番号";
};

/** キャラ別発見番号から DiscoveryNumberBadge を組み立てる。 */
export const buildCharacterNumberBadge = (noStr: string): DiscoveryNumberBadge => {
  const tags = collectNumberTags(noStr);
  const valueRank = judgeNumberValueRank(noStr);
  return {
    numberScope: "character",
    number: noStr,
    label: numberValueLabel(tags),
    tags,
    valueRank
  };
};

/** 表示用: "No.007" のようにゼロ埋め（最低3桁）。Number 変換しない。 */
export const formatDiscoveryNo = (noStr: string): string => {
  const s = normalizeDigits(noStr);
  const body = s.length === 0 ? "0" : s;
  return `No.${body.padStart(3, "0")}`;
};
