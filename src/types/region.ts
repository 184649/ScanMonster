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
  /** 効果音(SE) ON/OFF（未設定＝ON）。docs/SOUND_SPEC.md 準拠。 */
  seEnabled?: boolean;
  /** 効果音音量 0.0〜1.0（未設定＝0.8）。 */
  seVolume?: number;
  /** 触覚フィードバック(ハプティクス) ON/OFF（未設定＝ON）。 */
  hapticsEnabled?: boolean;
  /** スキャン演出を簡易化（未設定＝OFF）。Reduce Motion 時も自動で簡易化。docs/SCAN_PRESENTATION.md */
  simpleScanFx?: boolean;
};
