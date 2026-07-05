import { SEASON_LABELS, TIME_SLOT_LABELS } from "../data/elements";
import type { Season, TimeSlot } from "../types/monster";

export const formatDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const formatFullDateTime = (isoString: string): string => {
  const date = new Date(isoString);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export const isSameLocalDate = (a: Date, b: Date): boolean => {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

export const getLocalDateKey = (date: Date): string => {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
};

/** 秒単位のローカル時刻 "HHmmss"。variantSeed の生成に使用（個体差を秒単位で変える）。 */
export const getLocalTimeString = (date: Date): string => {
  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join("");
};

/** 保存用の粗い時間帯バケット。正確なスキャン時刻は保存しない。 */
export const getScanTimeBucket = (date: Date): string => {
  const hour = date.getHours();
  return `${String(hour).padStart(2, "0")}:00-${String(hour).padStart(2, "0")}:59`;
};

export const calculateConsecutiveScanDays = (scannedAtValues: string[], today = new Date()): number => {
  const scannedDates = new Set(scannedAtValues.map((value) => getLocalDateKey(new Date(value))));
  let cursor = new Date(today);
  let count = 0;

  while (scannedDates.has(getLocalDateKey(cursor))) {
    count += 1;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }

  return count;
};

export const getTimeSlotLabel = (slot: TimeSlot): string => TIME_SLOT_LABELS[slot];

export const getSeasonLabel = (season: Season): string => SEASON_LABELS[season];
