import * as Location from "expo-location";

import { REGIONS, getRegionOption } from "../data/regions";
import type { RegionDetectionInfo, RegionKey, RegionOption } from "../types/region";
import { storageService } from "./storageService";

type RegionDetectionResult = {
  regionKey: RegionKey;
  detection: RegionDetectionInfo;
};

type Coordinate = {
  latitude: number;
  longitude: number;
};

const PREFECTURE_TO_REGION: Array<{ regionKey: RegionKey; aliases: string[] }> = [
  { regionKey: "hokkaido", aliases: ["北海道", "hokkaido"] },
  { regionKey: "tohoku", aliases: ["青森", "青森県", "aomori", "岩手", "岩手県", "iwate", "宮城", "宮城県", "miyagi", "秋田", "秋田県", "akita", "山形", "山形県", "yamagata", "福島", "福島県", "fukushima"] },
  { regionKey: "kanto", aliases: ["茨城", "茨城県", "ibaraki", "栃木", "栃木県", "tochigi", "群馬", "群馬県", "gunma", "埼玉", "埼玉県", "saitama", "千葉", "千葉県", "chiba", "東京", "東京都", "tokyo", "神奈川", "神奈川県", "kanagawa"] },
  { regionKey: "chubu", aliases: ["新潟", "新潟県", "niigata", "富山", "富山県", "toyama", "石川", "石川県", "ishikawa", "福井", "福井県", "fukui", "山梨", "山梨県", "yamanashi", "長野", "長野県", "nagano", "岐阜", "岐阜県", "gifu", "静岡", "静岡県", "shizuoka", "愛知", "愛知県", "aichi"] },
  { regionKey: "kansai", aliases: ["三重", "三重県", "mie", "滋賀", "滋賀県", "shiga", "京都", "京都府", "kyoto", "大阪", "大阪府", "osaka", "兵庫", "兵庫県", "hyogo", "奈良", "奈良県", "nara", "和歌山", "和歌山県", "wakayama"] },
  { regionKey: "chugoku", aliases: ["鳥取", "鳥取県", "tottori", "島根", "島根県", "shimane", "岡山", "岡山県", "okayama", "広島", "広島県", "hiroshima", "山口", "山口県", "yamaguchi"] },
  { regionKey: "shikoku", aliases: ["徳島", "徳島県", "tokushima", "香川", "香川県", "kagawa", "愛媛", "愛媛県", "ehime", "高知", "高知県", "kochi"] },
  { regionKey: "kyushu", aliases: ["福岡", "福岡県", "fukuoka", "佐賀", "佐賀県", "saga", "長崎", "長崎県", "nagasaki", "熊本", "熊本県", "kumamoto", "大分", "大分県", "oita", "宮崎", "宮崎県", "miyazaki", "鹿児島", "鹿児島県", "kagoshima"] },
  { regionKey: "okinawa", aliases: ["沖縄", "沖縄県", "okinawa"] }
];

const createDetectionInfo = (
  status: RegionDetectionInfo["status"],
  source: RegionDetectionInfo["source"],
  extra?: Omit<RegionDetectionInfo, "status" | "source">
): RegionDetectionInfo => ({
  status,
  source,
  detectedAt: new Date().toISOString(),
  ...extra
});

const getAddressLabel = (address?: Location.LocationGeocodedAddress): string | undefined => {
  if (!address) {
    return undefined;
  }

  return [address.region, address.subregion, address.city, address.district].filter(Boolean).join(" / ") || undefined;
};

const detectRegionFromAddress = (address?: Location.LocationGeocodedAddress): RegionKey | undefined => {
  if (!address) {
    return undefined;
  }

  const haystack = [
    address.country,
    address.isoCountryCode,
    address.region,
    address.subregion,
    address.city,
    address.district,
    address.street
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  for (const item of PREFECTURE_TO_REGION) {
    if (item.aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      return item.regionKey;
    }
  }

  return undefined;
};

const isInRange = (value: number, min: number, max: number): boolean => value >= min && value <= max;

const detectRegionFromCoordinate = ({ latitude, longitude }: Coordinate): RegionKey => {
  if (isInRange(latitude, 24.0, 28.8) && isInRange(longitude, 122.0, 132.2)) {
    return "okinawa";
  }

  if (isInRange(latitude, 41.0, 45.8) && isInRange(longitude, 139.0, 146.5)) {
    return "hokkaido";
  }

  if (isInRange(latitude, 36.8, 41.7) && isInRange(longitude, 139.0, 142.5)) {
    return "tohoku";
  }

  if (isInRange(latitude, 34.7, 37.3) && isInRange(longitude, 138.3, 141.2)) {
    return "kanto";
  }

  if (isInRange(latitude, 34.0, 38.8) && isInRange(longitude, 136.0, 139.5)) {
    return "chubu";
  }

  if (isInRange(latitude, 33.3, 36.3) && isInRange(longitude, 134.3, 136.9)) {
    return "kansai";
  }

  if (isInRange(latitude, 33.3, 36.0) && isInRange(longitude, 130.6, 134.8)) {
    return "chugoku";
  }

  if (isInRange(latitude, 32.4, 34.8) && isInRange(longitude, 132.0, 134.8)) {
    return "shikoku";
  }

  if (isInRange(latitude, 30.0, 34.7) && isInRange(longitude, 128.0, 132.4)) {
    return "kyushu";
  }

  return "unknown";
};

export const detectCurrentRegion = async (): Promise<RegionDetectionResult> => {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== "granted") {
    return {
      regionKey: "unknown",
      detection: createDetectionInfo("denied", "fallback", {
        errorMessage: "位置情報の利用が許可されていません。"
      })
    };
  }

  try {
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced
    });
    const coordinate = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude
    };
    let address: Location.LocationGeocodedAddress | undefined;

    try {
      address = (await Location.reverseGeocodeAsync(coordinate))[0];
    } catch {
      address = undefined;
    }

    const regionKey = detectRegionFromAddress(address) ?? detectRegionFromCoordinate(coordinate);

    return {
      regionKey,
      detection: createDetectionInfo(regionKey === "unknown" ? "unavailable" : "granted", "location", {
        addressLabel: getAddressLabel(address),
        errorMessage: regionKey === "unknown" ? "現在地から日本の地方区分を判定できませんでした。" : undefined
      })
    };
  } catch {
    return {
      regionKey: "unknown",
      detection: createDetectionInfo("error", "fallback", {
        errorMessage: "現在地を取得できませんでした。"
      })
    };
  }
};

export const getSelectedRegion = async (): Promise<RegionKey | undefined> => {
  const settings = await storageService.getSettings();
  return settings.selectedRegionKey;
};

export const saveSelectedRegion = async (regionKey: RegionKey, detection?: RegionDetectionInfo): Promise<void> => {
  const settings = await storageService.getSettings();
  await storageService.saveSettings({ ...settings, selectedRegionKey: regionKey, regionDetection: detection });
};

export const getRegionOptions = (): RegionOption[] => REGIONS;

export const getRegionName = (regionKey: RegionKey): string => getRegionOption(regionKey).name;
