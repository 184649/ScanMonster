import type { SourceType } from "../types/monster";

export type ScanSourceType = SourceType | "unknown";

export type ScanValidationResult = {
  isValid: boolean;
  ignoredReason?: string;
};

export type NormalizedScanResult = {
  sourceType: ScanSourceType;
  barcodeType: string;
  rawData: string;
  maskedData: string;
  normalizedData: string;
  isValid: boolean;
  ignoredReason?: string;
};

export type LastScanDetection = {
  normalizedData: string;
  barcodeType: string;
  detectedAt: number;
};

const QR_TYPE_KEYWORDS = ["qr", "qrcode"];
const NUMERIC_TYPES = new Set(["ean13", "ean_13", "org.gs1.ean-13", "ean8", "ean_8", "org.gs1.ean-8", "upc_a", "upca", "org.gs1.upc-a"]);
const TEXT_BARCODE_TYPES = new Set(["code128", "code_128", "code39", "code_39", "code93", "code_93", "codabar"]);

const normalizeBarcodeTypeLabel = (barcodeType?: string): string => {
  const trimmed = barcodeType?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "unknown";
};

const normalizeBarcodeTypeKey = (barcodeType?: string): string => {
  return normalizeBarcodeTypeLabel(barcodeType).toLowerCase();
};

export const classifySourceType = (barcodeType?: string): ScanSourceType => {
  const normalized = normalizeBarcodeTypeKey(barcodeType);

  if (normalized === "unknown") {
    return "unknown";
  }

  return QR_TYPE_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? "qr" : "barcode";
};

export const getSourceTypeFromBarcodeType = (barcodeType: string): SourceType => {
  return classifySourceType(barcodeType) === "qr" ? "qr" : "barcode";
};

export const maskScanData = (rawData: string): string => {
  const normalizedData = rawData.trim();
  const length = normalizedData.length;

  if (length === 0) {
    return "";
  }

  if (length <= 4) {
    return `${normalizedData.slice(0, 1)}${"*".repeat(Math.max(2, length - 1))}`;
  }

  const visibleStart = length >= 10 ? 6 : Math.min(4, Math.floor(length / 2));
  const visibleEnd = Math.min(4, Math.max(1, length - visibleStart - 1));
  return `${normalizedData.slice(0, visibleStart)}****${normalizedData.slice(length - visibleEnd)}`;
};

export const validateScanResult = (rawData: string, barcodeType?: string): ScanValidationResult => {
  const sourceType = classifySourceType(barcodeType);
  const normalizedData = rawData.trim();
  const normalizedLower = normalizedData.toLowerCase();
  const barcodeTypeKey = normalizeBarcodeTypeKey(barcodeType);

  if (sourceType === "unknown") {
    return { isValid: false, ignoredReason: "読み取り種別を判定できません" };
  }

  if (normalizedData.length === 0) {
    return { isValid: false, ignoredReason: "読み取り値が空です" };
  }

  if (normalizedLower === "undefined" || normalizedLower === "null") {
    return { isValid: false, ignoredReason: "読み取り値が無効な文字列です" };
  }

  if (sourceType === "qr") {
    if (normalizedData.length < 4) {
      return { isValid: false, ignoredReason: "QRコードとして短すぎます" };
    }

    return { isValid: true };
  }

  if (normalizedData.length < 8 && barcodeTypeKey !== "upc_e") {
    return { isValid: false, ignoredReason: "バーコードとして短すぎます" };
  }

  if (NUMERIC_TYPES.has(barcodeTypeKey)) {
    if (!/^\d+$/.test(normalizedData)) {
      return { isValid: false, ignoredReason: "EAN/UPCは数字のみ対応です" };
    }

    if ((barcodeTypeKey === "ean13" || barcodeTypeKey === "ean_13" || barcodeTypeKey === "org.gs1.ean-13") && normalizedData.length !== 13) {
      return { isValid: false, ignoredReason: "EAN-13は13桁が必要です" };
    }

    if ((barcodeTypeKey === "ean8" || barcodeTypeKey === "ean_8" || barcodeTypeKey === "org.gs1.ean-8") && normalizedData.length !== 8) {
      return { isValid: false, ignoredReason: "EAN-8は8桁が必要です" };
    }

    if ((barcodeTypeKey === "upc_a" || barcodeTypeKey === "upca" || barcodeTypeKey === "org.gs1.upc-a") && normalizedData.length !== 12) {
      return { isValid: false, ignoredReason: "UPC-Aは12桁が必要です" };
    }
  }

  if (barcodeTypeKey === "upc_e") {
    if (!/^\d+$/.test(normalizedData) || (normalizedData.length !== 6 && normalizedData.length !== 8)) {
      return { isValid: false, ignoredReason: "UPC-Eは6桁または8桁の数字が必要です" };
    }
  }

  if (TEXT_BARCODE_TYPES.has(barcodeTypeKey) && !/^[A-Za-z0-9 .$/+%:-]+$/.test(normalizedData)) {
    return { isValid: false, ignoredReason: "英数字系バーコードとして扱えない値です" };
  }

  return { isValid: true };
};

export const normalizeScanResult = (rawData: string, barcodeType?: string): NormalizedScanResult => {
  const normalizedData = rawData.trim();
  const normalizedBarcodeType = normalizeBarcodeTypeLabel(barcodeType);
  const validation = validateScanResult(normalizedData, normalizedBarcodeType);

  return {
    sourceType: classifySourceType(normalizedBarcodeType),
    barcodeType: normalizedBarcodeType,
    rawData,
    maskedData: maskScanData(normalizedData),
    normalizedData,
    isValid: validation.isValid,
    ignoredReason: validation.ignoredReason
  };
};

export const shouldIgnoreDuplicateScan = (
  current: Pick<NormalizedScanResult, "normalizedData" | "barcodeType">,
  previous: LastScanDetection | null | undefined,
  cooldownMs = 3000,
  now = Date.now()
): boolean => {
  if (!previous) {
    return false;
  }

  return (
    previous.normalizedData === current.normalizedData &&
    previous.barcodeType === current.barcodeType &&
    now - previous.detectedAt < cooldownMs
  );
};

export const getReadableBarcodeType = (barcodeType: string): string => {
  const normalized = normalizeBarcodeTypeKey(barcodeType);
  const labels: Record<string, string> = {
    qr: "QRコード",
    "org.iso.qrcode": "QRコード",
    qrcode: "QRコード",
    ean13: "EAN-13",
    ean_13: "EAN-13",
    "org.gs1.ean-13": "EAN-13",
    ean8: "EAN-8",
    ean_8: "EAN-8",
    "org.gs1.ean-8": "EAN-8",
    upc_a: "UPC-A",
    upca: "UPC-A",
    "org.gs1.upc-a": "UPC-A",
    upc_e: "UPC-E",
    code39: "Code 39",
    code_39: "Code 39",
    code93: "Code 93",
    code_93: "Code 93",
    code128: "Code 128",
    code_128: "Code 128",
    codabar: "Codabar",
    itf14: "ITF-14",
    pdf417: "PDF417",
    aztec: "Aztec",
    datamatrix: "Data Matrix"
  };

  return labels[normalized] ?? barcodeType;
};
