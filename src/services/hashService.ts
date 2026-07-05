import * as Crypto from "expo-crypto";

import type { Season, TimeSlot } from "../types/monster";
import type { RegionKey } from "../types/region";

/**
 * sourceHash = hash(barcodeType + normalizedBarcode)
 * 種族傾向を決めるためのハッシュ。生のバーコード値は保存しない。
 */
export const createSourceHash = async (barcodeType: string, normalizedBarcode: string): Promise<string> => {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${barcodeType}|${normalizedBarcode}`);
};

/**
 * 任意文字列の SHA-256。
 */
export const createHash = async (value: string): Promise<string> => {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
};

type VariantSeedParts = {
  sourceHash: string;
  userSalt: string;
  localDate: string;
  localTime: string;
  timeSlot: TimeSlot;
  season: Season;
  regionKey: RegionKey;
};

/**
 * variantSeed = hash(sourceHash + userSalt + localDate + localTimeHHmmss + timeSlot + season + regionKey)
 * 個体差・色・模様・性格・レア度・称号を決めるためのハッシュ。
 * 秒単位の時刻を含むため、同じバーコードでも個体差が変わる。
 */
export const createVariantSeed = async (parts: VariantSeedParts): Promise<string> => {
  const composite = [
    parts.sourceHash,
    parts.userSalt,
    parts.localDate,
    parts.localTime,
    parts.timeSlot,
    parts.season,
    parts.regionKey
  ].join("|");

  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, composite);
};

/** ランダムな userSalt を生成する（端末ごとに一度だけ作成して保存する）。 */
export const createUserSalt = async (): Promise<string> => {
  const random = `${Date.now()}-${Math.random()}-${Math.random()}`;
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, random);
};
