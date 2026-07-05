/**
 * 発見記録ドメインの表示ラベル・配色（UI共通）。
 */
import type { CharacterTitle, DifficultyRank, NumberValueRank } from "../types/discoveryRecord";

export const DIFFICULTY_LABELS: Record<DifficultyRank, string> = {
  C: "C",
  B: "B",
  A: "A",
  S: "S",
  SS: "SS",
  SSS: "SSS"
};

/** 発見難度の配色（バッジ背景/文字）。 */
export const DIFFICULTY_COLORS: Record<DifficultyRank, { bg: string; fg: string }> = {
  C: { bg: "#E2E8F0", fg: "#475569" },
  B: { bg: "#DCFCE7", fg: "#166534" },
  A: { bg: "#DBEAFE", fg: "#1D4ED8" },
  S: { bg: "#EDE9FE", fg: "#6D28D9" },
  SS: { bg: "#FEF3C7", fg: "#B45309" },
  SSS: { bg: "#FFE4E6", fg: "#BE123C" }
};

export const CHARACTER_TITLE_LABELS: Record<CharacterTitle, string> = {
  strongest_proof: "最強の証",
  early_discoverer: "早期発見者",
  lucky_number: "幸運の番号",
  repdigit_number: "ゾロ目マスター",
  round_number: "キリ番ハンター",
  reunion_10: "10回再会",
  reunion_50: "50回再会",
  reunion_100: "100回再会"
};

// 番号の「レア度」表現。称号ではなく番号のレア度なので、"伝説" のような称号語は使わない。
export const NUMBER_VALUE_RANK_LABELS: Record<NumberValueRank, string> = {
  normal: "通常",
  memorial: "記念",
  rare: "レア",
  premium: "激レア",
  legend: "超激レア"
};

export const characterTitleLabel = (title: CharacterTitle): string => CHARACTER_TITLE_LABELS[title] ?? title;
