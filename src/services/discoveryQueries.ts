/**
 * 発見記録の集計クエリ（今日の一番・カレンダー・番号コレクション）。§24/§25/§26。
 */
import type { DiscoveryRecord, NumberTag } from "../types/discoveryRecord";
import { representativeScore } from "./discoveryRecordService";

/** その日の「一番発見」（representativeScore 最大、同点は先頭＝新しい方）。 */
export const topDiscoveryOfDay = (records: DiscoveryRecord[], localDate: string): DiscoveryRecord | undefined => {
  let best: DiscoveryRecord | undefined;
  let bestScore = -1;
  for (const record of records) {
    if (record.localDate !== localDate) continue;
    const score = representativeScore(record);
    if (score > bestScore) {
      best = record;
      bestScore = score;
    }
  }
  return best;
};

export type CalendarDay = {
  date: string;
  top: DiscoveryRecord;
  count: number;
  hasRare: boolean;
  hasStrongestProof: boolean;
  hasNumberValue: boolean;
};

/** 日付ごとにまとめ、その日の一番発見と特別フラグを付ける（新しい日付順）。 */
export const groupDiscoveriesByDate = (records: DiscoveryRecord[]): CalendarDay[] => {
  const byDate = new Map<string, DiscoveryRecord[]>();
  for (const record of records) {
    const list = byDate.get(record.localDate) ?? [];
    list.push(record);
    byDate.set(record.localDate, list);
  }

  const days: CalendarDay[] = [];
  for (const [date, list] of byDate) {
    const top = topDiscoveryOfDay(list, date);
    if (!top) continue;
    days.push({
      date,
      top,
      count: list.length,
      hasRare: list.some((r) => r.rarity === "rare"),
      hasStrongestProof: list.some((r) => r.strongestProof),
      hasNumberValue: list.some((r) => (r.primaryNumberBadge?.valueRank ?? "normal") !== "normal")
    });
  }

  return days.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
};

export type NumberCollectionEntry = {
  tag: NumberTag;
  label: string;
  count: number;
};

const TAG_LABELS: { tag: NumberTag; label: string }[] = [
  { tag: "lucky7", label: "ラッキー7" },
  { tag: "repdigit", label: "ゾロ目" },
  { tag: "round", label: "キリ番" },
  { tag: "sequential", label: "連番" },
  { tag: "reverse_sequential", label: "逆連番" },
  { tag: "palindrome", label: "ミラー番号" },
  { tag: "year", label: "年号番号" },
  { tag: "early", label: "若い番号" }
];

/** 番号コレクション：タグ別に「集めた固有番号」の数を数える（§24）。 */
export const numberCollectionSummary = (records: DiscoveryRecord[]): NumberCollectionEntry[] => {
  const sets = new Map<NumberTag, Set<string>>();
  for (const record of records) {
    const badge = record.primaryNumberBadge;
    if (!badge) continue;
    const key = `${record.characterId}:${badge.number}`;
    for (const tag of badge.tags) {
      const set = sets.get(tag) ?? new Set<string>();
      set.add(key);
      sets.set(tag, set);
    }
  }
  return TAG_LABELS.map(({ tag, label }) => ({ tag, label, count: sets.get(tag)?.size ?? 0 }));
};
