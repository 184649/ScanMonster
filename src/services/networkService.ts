/**
 * 到達性チェック（オフライン判定・§3）。NetInfo 非導入のため、health への軽い fetch で判定する。
 */
import { isServerMode } from "../config/apiConfig";
import { ApiUnavailableError, getHealth } from "./apiClient";

/** サーバーに到達できるか。ローカルモード（API未設定）では常に false。 */
export const isApiReachable = async (): Promise<boolean> => {
  if (!isServerMode) {
    return false;
  }
  try {
    const health = await getHealth();
    return health.status === "ok";
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return false;
    }
    return false;
  }
};

/** オフライン時に新規スキャンできない旨の文言（§3）。 */
export const OFFLINE_SCAN_MESSAGE = "公式発見番号を発行するには通信が必要です。\nオンライン状態で再度スキャンしてください。";
