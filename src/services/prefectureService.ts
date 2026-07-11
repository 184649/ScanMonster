/**
 * GPS → 都道府県の解決。位置情報は都道府県判定にのみ使い、座標・住所は保存しない（§8）。
 */
import * as Location from "expo-location";

import { resolvePrefectureCode } from "../data/prefectures";

export type PrefectureResult = { code: string; name: string } | null;

/** 現在地の都道府県を解決する。許可なし/失敗時は null（＝prefecture 抽選なし）。 */
export const resolveCurrentPrefecture = async (): Promise<PrefectureResult> => {
  try {
    const current = await Location.getForegroundPermissionsAsync();
    let status = current.status;
    if (status !== "granted" && current.canAskAgain) {
      const requested = await Location.requestForegroundPermissionsAsync();
      status = requested.status;
    }
    if (status !== "granted") return null;

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    let regionName: string | undefined;
    try {
      const address = (
        await Location.reverseGeocodeAsync({ latitude: position.coords.latitude, longitude: position.coords.longitude })
      )[0];
      regionName = address?.region ?? address?.subregion ?? undefined;
    } catch {
      regionName = undefined;
    }
    // 座標は破棄し、都道府県コード/名のみ返す。
    return resolvePrefectureCode(regionName);
  } catch {
    return null;
  }
};
