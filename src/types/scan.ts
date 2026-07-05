import type { ScanSource, Season, SourceType, TimeSlot } from "./monster";
import type { RegionKey } from "./region";

export type ScanHistory = {
  id: string;
  sourceType: SourceType;
  scanSource: ScanSource;
  barcodeType: string;
  /** 生のバーコード値は保存しない。ハッシュのみ保存する。 */
  sourceHash: string;
  variantSeedHash: string;
  resultMonsterId: string;
  scannedAt: string;
  /** ローカル日付 "YYYY-MM-DD"。1日1回制限・連続日数に使用。 */
  scanDate: string;
  /** 粗い時間帯バケット。正確なスキャン時刻は保存しない。 */
  scanTimeBucket: string;
  timeSlot: TimeSlot;
  season: Season;
  regionKey: RegionKey;
  regionName: string;
};

export type ScanInput = {
  rawValue: string;
  barcodeType: string;
};

export type HashedScanInput = {
  sourceHash: string;
  sourceType: SourceType;
  barcodeType: string;
  scannedAt: Date;
  regionKey: RegionKey;
};

/** 同じバーコードからの1日1回新規発見制限の記録。 */
export type DailySourceLimit = {
  /** sourceHash:YYYY-MM-DD */
  key: string;
  sourceHash: string;
  scanDate: string;
  recordedAt: string;
};
