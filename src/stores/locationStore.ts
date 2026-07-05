/**
 * 現在地の都道府県キャッシュ。スキャン時に prefectureCode/Name をサーバーへ送るために使う。
 * 座標や住所は保持しない（都道府県のみ）。§8
 */
import { create } from "zustand";

import { resolveCurrentPrefecture, type PrefectureResult } from "../services/prefectureService";

const THROTTLE_MS = 5 * 60 * 1000; // 5分に1回まで再取得。

type LocationStore = {
  prefecture: PrefectureResult;
  checkedAt: number;
  refreshing: boolean;
  /** 都道府県を再取得（スロットリング）。force=true で即取得。 */
  refresh: (force?: boolean) => Promise<void>;
};

export const useLocationStore = create<LocationStore>((set, get) => ({
  prefecture: null,
  checkedAt: 0,
  refreshing: false,

  async refresh(force = false) {
    const { checkedAt, refreshing } = get();
    if (refreshing) return;
    if (!force && Date.now() - checkedAt < THROTTLE_MS) return;
    set({ refreshing: true });
    try {
      const prefecture = await resolveCurrentPrefecture();
      set({ prefecture, checkedAt: Date.now() });
    } finally {
      set({ refreshing: false });
    }
  }
}));

/** スキャン時に送る現在の都道府県（未取得/未許可なら null）。 */
export const getActivePrefecture = (): PrefectureResult => useLocationStore.getState().prefecture;
