export type RegionKey =
  | "hokkaido"
  | "tohoku"
  | "kanto"
  | "chubu"
  | "kansai"
  | "chugoku"
  | "shikoku"
  | "kyushu"
  | "okinawa"
  | "unknown";

export type RegionOption = {
  key: RegionKey;
  name: string;
  shortName: string;
  description: string;
};

export type RegionDetectionStatus = "idle" | "detecting" | "granted" | "denied" | "unavailable" | "error";

export type RegionDetectionInfo = {
  status: RegionDetectionStatus;
  source: "location" | "saved" | "fallback";
  detectedAt?: string;
  addressLabel?: string;
  errorMessage?: string;
};

export type AppSettings = {
  selectedRegionKey?: RegionKey;
  regionDetection?: RegionDetectionInfo;
  scannerCooldownMs: number;
  showScanDebug?: boolean;
  showMonsterImageDebug?: boolean;
  /** デバッグ用：出現のノーマル/レアを固定する（未設定＝通常の抽選）。 */
  debugForceRarity?: "normal" | "rare";
};
