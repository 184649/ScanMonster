/**
 * サーバー連携の設定。EXPO_PUBLIC_API_BASE_URL が設定されていればサーバーモード。
 *   development: EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
 *   preview:     https://staging-api.example.com
 *   production:  https://api.example.com
 *
 * サーバーモードでは公式発見番号はサーバー採番。未設定（ローカルモード）は閲覧/開発用で、
 * 発行される番号は「暫定（非公式）」として扱う（§1.2/§7）。
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? "").trim().replace(/\/$/, "");

/** サーバー連携が有効か（公式発見処理をサーバーで行うか）。 */
export const isServerMode = API_BASE_URL.length > 0;

/** ネットワーク要求のタイムアウト（ms）。 */
export const API_TIMEOUT_MS = 8000;
