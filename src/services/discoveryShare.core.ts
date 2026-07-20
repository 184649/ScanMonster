/**
 * 共有導線のための発見集計（純粋・型のみ依存・テスト可能）。
 *
 * discoveryQueries.ts はストレージ層へ依存するため、共有導線で使う集計だけを
 * ここへ分離して純粋に保つ（他の *.core.ts と同じ方針）。
 */
import type { DiscoveryRecord } from "../types/discoveryRecord";

/**
 * その日の発見（新しい順・同じ種は1回だけ）。共有導線の「今日の発見」に使う。
 * 未発見のものは記録が存在しないため、ここから漏れることはない。
 */
export const discoveriesOfDay = (records: DiscoveryRecord[], localDate: string): DiscoveryRecord[] => {
  const seen = new Set<string>();
  const out: DiscoveryRecord[] = [];
  for (const record of records) {
    if (record.localDate !== localDate) continue;
    if (seen.has(record.characterId)) continue;
    seen.add(record.characterId);
    out.push(record);
  }
  return out;
};

/**
 * 直近 days 日（当日を含む）に発見した種の数。共有導線の「今週のコレクション」に使う。
 * 同じ種を複数回発見しても1種として数える。
 */
export const discoveredSpeciesWithinDays = (
  records: DiscoveryRecord[],
  todayLocalDate: string,
  days: number
): number => {
  const today = new Date(`${todayLocalDate}T00:00:00`);
  if (Number.isNaN(today.getTime()) || days <= 0) return 0;
  const oldest = new Date(today);
  oldest.setDate(oldest.getDate() - (days - 1));

  const seen = new Set<string>();
  for (const record of records) {
    const d = new Date(`${record.localDate}T00:00:00`);
    if (Number.isNaN(d.getTime())) continue;
    if (d < oldest || d > today) continue;
    seen.add(record.characterId);
  }
  return seen.size;
};
