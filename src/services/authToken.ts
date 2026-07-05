/**
 * Bearer 認証トークンの管理（Phase 1）。
 *  - 初回起動で匿名アカウントを作成し、トークンを SecureStore に保存。
 *  - API 呼び出しは Authorization: Bearer <token>。x-user-id は使わない。
 *  - アカウント連携/引継ぎ後は override トークン（account.token）を優先。
 * authStore を import しない（循環回避）。override は authStore から setter で渡す。
 */
import * as SecureStore from "expo-secure-store";

import { API_BASE_URL, API_TIMEOUT_MS, isServerMode } from "../config/apiConfig";

const TOKEN_KEY = "worldawn.anonToken.v1";
const USER_KEY = "worldawn.anonUserId.v1";

let anonToken: string | null = null;
let anonUserId: string | null = null;
let overrideToken: string | null = null; // account.token（連携/引継ぎ後）
let loaded = false;

const safeGet = async (key: string): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
};
const safeSet = async (key: string, value: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    /* 保存不可でもメモリキャッシュで当面動作 */
  }
};

const loadFromStore = async (): Promise<void> => {
  if (loaded) return;
  anonToken = await safeGet(TOKEN_KEY);
  anonUserId = await safeGet(USER_KEY);
  loaded = true;
};

/** 初回起動で匿名アカウントを作成（既にあれば何もしない）。オフライン時は次回に持ち越し。 */
export const ensureAnonToken = async (): Promise<void> => {
  if (!isServerMode) return;
  await loadFromStore();
  if (anonToken && anonUserId) return;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/anon`, { method: "POST", signal: controller.signal });
    if (!res.ok) return;
    const body = (await res.json()) as { token?: string; userId?: string };
    if (body.token && body.userId) {
      anonToken = body.token;
      anonUserId = body.userId;
      await safeSet(TOKEN_KEY, body.token);
      await safeSet(USER_KEY, body.userId);
    }
  } catch {
    /* オフラインは後で再試行 */
  } finally {
    clearTimeout(timer);
  }
};

/** リクエストに載せる有効なトークン（override＝アカウント優先）。 */
export const getActiveToken = (): string | null => overrideToken ?? anonToken;

/** 表示・QR 用の現在のサーバー userId（override があればそのアカウント、なければ匿名）。 */
export const getAnonServerUserId = (): string | null => anonUserId;

/** アカウント連携/ログイン/引継ぎ後にトークンを差し替える。 */
export const setOverrideToken = (token: string | null | undefined): void => {
  overrideToken = token && token.length > 0 ? token : null;
};
export const clearOverrideToken = (): void => {
  overrideToken = null;
};
