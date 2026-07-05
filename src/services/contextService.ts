import { getRegionOption } from "../data/regions";
import type { ContextVariant, Season, SourceType, TimeSlot } from "../types/monster";
import type { RegionKey } from "../types/region";

export const getTimeSlot = (date = new Date()): TimeSlot => {
  const hour = date.getHours();

  if (hour >= 5 && hour <= 10) {
    return "morning";
  }

  if (hour >= 11 && hour <= 15) {
    return "day";
  }

  if (hour >= 16 && hour <= 18) {
    return "evening";
  }

  return "night";
};

export const getSeason = (date = new Date()): Season => {
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 5) {
    return "spring";
  }

  if (month >= 6 && month <= 8) {
    return "summer";
  }

  if (month >= 9 && month <= 11) {
    return "autumn";
  }

  return "winter";
};

const timeVariantWords: Record<TimeSlot, string> = {
  morning: "朝露",
  day: "陽光",
  evening: "夕風",
  night: "夜影"
};

const seasonVariantWords: Record<Season, string> = {
  spring: "花芽",
  summer: "夏潮",
  autumn: "月影",
  winter: "冬星"
};

const regionVariantWords: Record<RegionKey, string> = {
  hokkaido: "雪原",
  tohoku: "白森",
  kanto: "都市光",
  chubu: "山風",
  kansai: "古都",
  chugoku: "瀬戸影",
  shikoku: "巡礼",
  kyushu: "火山",
  okinawa: "潮風",
  unknown: "未明"
};

export const createContextTags = (
  timeSlot: TimeSlot,
  season: Season,
  regionKey: RegionKey,
  sourceType: SourceType
): string[] => {
  const sourceTag = sourceType === "qr" ? "QR由来" : "バーコード由来";
  return [timeVariantWords[timeSlot], seasonVariantWords[season], regionVariantWords[regionKey], sourceTag];
};

export const createVariantName = (timeSlot: TimeSlot, season: Season, regionKey: RegionKey): string => {
  const regionWord = regionVariantWords[regionKey];
  const seasonalWord = season === "winter" || timeSlot === "night" ? seasonVariantWords[season] : timeVariantWords[timeSlot];
  return `${regionWord}・${seasonalWord}型`;
};

export const createContextVariant = (
  date: Date,
  regionKey: RegionKey,
  sourceType: SourceType
): ContextVariant => {
  const timeSlot = getTimeSlot(date);
  const season = getSeason(date);
  const region = getRegionOption(regionKey);

  return {
    timeSlot,
    season,
    regionKey,
    regionName: region.name,
    variantName: createVariantName(timeSlot, season, regionKey),
    tags: createContextTags(timeSlot, season, regionKey, sourceType)
  };
};
