/**
 * サーバー上の現在の user_id を解決する（表示・フレンドQRの owner 用）。
 * アカウント連携/引継ぎ済みならそのアカウント、無ければ匿名アカウント（Bearer 発行時の userId）。
 * どちらも無い（初回接続前）場合のみ端末フォールバック。
 */
import { useAuthStore } from "../stores/authStore";
import { getAnonServerUserId } from "./authToken";

export const getActiveServerUserId = (fallbackDeviceUserId: string): string =>
  useAuthStore.getState().account?.userId || getAnonServerUserId() || fallbackDeviceUserId;
