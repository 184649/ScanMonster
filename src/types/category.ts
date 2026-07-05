/**
 * スキャンした「生活カテゴリ」。
 *
 * 重要（プライバシー）: バーコード値・商品名・QRの中身・正確な購入場所は保存しない。
 * 保存するのは、この抽象的なカテゴリだけ。
 */
export type ScanCategory =
  | "drink"
  | "snack"
  | "food"
  | "daily_goods"
  | "book"
  | "cosmetics"
  | "medicine"
  | "stationery"
  | "toy"
  | "qr"
  | "other";

/** カテゴリごとの集計（個体一覧から導出する）。 */
export type CategoryDiscoveryRecord = {
  category: ScanCategory;
  discoveredIndividualIds: string[];
  discoveredSpeciesIds: string[];
  totalScanCount: number;
  firstDiscoveredAt?: string;
  lastDiscoveredAt?: string;
};
