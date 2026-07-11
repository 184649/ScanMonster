/**
 * WORLDAWN API クライアント。公式発見処理はサーバーが確定する（§2.3）。
 * アプリは sourceHash を送るだけで、公式発見番号を採番しない。
 */
import { API_BASE_URL, API_TIMEOUT_MS } from "../config/apiConfig";
import { ensureAnonToken, getActiveToken } from "./authToken";
import type { CharacterTitle, DifficultyRank, DiscoveryNumberBadge, DiscoveryRarity } from "../types/discoveryRecord";

/** サーバー /api/scan の発見証明DTO（characterDiscoveryNo は必ず string）。 */
export type ServerDiscoveryRecord = {
  id: string;
  characterId: string;
  characterName: string;
  rarity: DiscoveryRarity;
  worldGroup: string;
  characterDiscoveryNo: string;
  difficultyRank: DifficultyRank;
  discoveryRankLabel: string;
  isNewForUser: boolean;
  isRediscovery: boolean;
  numberBadges: DiscoveryNumberBadge[];
  primaryNumberBadge?: DiscoveryNumberBadge;
  grantedCharacterTitles: CharacterTitle[];
  strongestProof: boolean;
  dpGained: number;
  dpBalanceAfter: number;
  certificateId: string;
  discoveredAt: string;
  prefectureCode?: string;
  prefectureName?: string;
  /** この発見で伝説が解放されたワールド（解放演出のトリガ）。それ以外は未設定。 */
  legendaryUnlockedNow?: string;
};

export type ServerScanResponse =
  | { status: "discovered"; discoveryRecord: ServerDiscoveryRecord }
  | { status: "duplicate"; message: string };

/** オフライン/通信不可を表す専用エラー（呼び出し側で判別する）。 */
export class ApiUnavailableError extends Error {
  constructor(message = "network_unavailable") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

const request = async <T>(path: string, init: RequestInit & { userId?: string }): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    // 本人性は Bearer トークンのみ（クライアントの userId は認証根拠にしない）。
    if (!getActiveToken()) await ensureAnonToken();
    const token = getActiveToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {})
      }
    });
    if (!res.ok) {
      throw new Error(`api_error_${res.status}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    // タイムアウト/接続失敗はオフライン扱い。
    if (error instanceof TypeError || (error as Error)?.name === "AbortError") {
      throw new ApiUnavailableError();
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

/** サーバーに発見処理を要求する（§4.1）。 */
export const postScan = (params: {
  userId: string;
  sourceHash: string;
  scanType: "barcode" | "qr" | "player_qr";
  localDate: string;
  prefectureCode?: string;
  prefectureName?: string;
}): Promise<ServerScanResponse> =>
  request<ServerScanResponse>("/api/scan", {
    method: "POST",
    userId: params.userId,
    body: JSON.stringify({
      sourceHash: params.sourceHash,
      scanType: params.scanType,
      localDate: params.localDate,
      prefectureCode: params.prefectureCode,
      prefectureName: params.prefectureName
    })
  });

/** ヘルスチェック（到達性確認）。 */
export const getHealth = (): Promise<{ status: string }> => request<{ status: string }>("/api/health", { method: "GET" });

// ===== 認証・アカウント連携・引継ぎ =====
export type AuthResponse = { token: string; userId: string; email: string; displayName?: string };

/** ゲスト(userId)にアカウントを紐づける。 */
export const postRegister = (userId: string, body: { email: string; password: string; displayName?: string }): Promise<AuthResponse> =>
  request<AuthResponse>("/api/auth/register", { method: "POST", userId, body: JSON.stringify(body) });

/** ログイン → 引継ぎ先 userId を返す。 */
export const postLogin = (body: { email: string; password: string }): Promise<AuthResponse> =>
  request<AuthResponse>("/api/auth/login", { method: "POST", body: JSON.stringify(body) });

/** 引継ぎコードを発行（現在の userId）。 */
export const postTransferCreate = (userId: string): Promise<{ code: string; expiresAt: string }> =>
  request<{ code: string; expiresAt: string }>("/api/transfer/create", { method: "POST", userId, body: "{}" });

/** 引継ぎコードで userId を取り戻す（新端末用の Bearer トークンも受け取る）。 */
export const postTransferRedeem = (code: string): Promise<{ userId: string; token: string }> =>
  request<{ userId: string; token: string }>("/api/transfer/redeem", { method: "POST", body: JSON.stringify({ code }) });

// ===== 要望掲示板 =====
export type FeatureRequestItem = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  reactionCount: number;
  reactedByMe: boolean;
  mine: boolean;
};

export const getFeatureRequests = (userId: string, sort: "top" | "new"): Promise<{ requests: FeatureRequestItem[] }> =>
  request<{ requests: FeatureRequestItem[] }>(`/api/feature-requests?sort=${sort}`, { method: "GET", userId });

export const postFeatureRequest = (userId: string, body: { title: string; body: string }): Promise<{ id: string }> =>
  request<{ id: string }>("/api/feature-requests", { method: "POST", userId, body: JSON.stringify(body) });

export const postReaction = (userId: string, id: string): Promise<{ reacted: boolean; count: number }> =>
  request<{ reacted: boolean; count: number }>(`/api/feature-requests/${id}/react`, { method: "POST", userId, body: "{}" });

/** 引継ぎ時の同期用：サーバーの発見証明（DB行・snake_case）を取得。 */
export type ServerDiscoveryRow = {
  id: string;
  character_id: string;
  world_group: string;
  rarity: string;
  character_discovery_no: string;
  discovered_at: string;
  local_date: string;
  is_new_for_user: boolean;
  is_rediscovery: boolean;
  difficulty_rank: string;
  discovery_rank_label: string;
  number_badges: unknown;
  primary_number_badge: unknown;
  granted_character_titles: unknown;
  strongest_proof: boolean;
  dp_gained: number;
  certificate_id: string;
};

export const getDiscoveries = (userId: string): Promise<{ discoveries: ServerDiscoveryRow[] }> =>
  request<{ discoveries: ServerDiscoveryRow[] }>("/api/discoveries", { method: "GET", userId });

// ===== フレンドQR・フレンド効果（数値・secret は返さない・段2） =====
// effectLevel はその日の有効フレンド人数から算出する大分類（0〜5）。具体数値は返さない。
export type FriendEffect = { effectLevel: number; message: string };

export const getFriendEffect = (userId: string, localDate: string): Promise<FriendEffect> =>
  request<FriendEffect>(`/api/friend-effect?localDate=${encodeURIComponent(localDate)}`, { method: "GET", userId });

/** 自分（owner）用の短期QRトークンを取得（Phase 2・動的QR）。約60秒有効。 */
export const postFriendQrToken = (): Promise<{ token: string; expiresInSeconds: number }> =>
  request<{ token: string; expiresInSeconds: number }>("/api/friend-qr/token", { method: "POST", body: "{}" });

/**
 * フレンドQR読み込み結果（段2）。
 *  - friend_found: 正式な発見（新規は未発見確定 / 既存は通常発見）。discoveryRecord は通常スキャンと同一DTO。
 *  - duplicate: 同一相手・同日2回目（発見なし）。
 */
export type FriendQrScanResult =
  | {
      status: "friend_found";
      isNewFriend: boolean;
      effectLevel: number;
      message: string;
      discoveryRecord: ServerDiscoveryRecord;
    }
  | { status: "duplicate"; message: string };

/** 読み取った動的QRトークンで発見（Phase 2）。owner はサーバーがトークンから解決する。 */
export const postFriendQrScan = (qrToken: string, localDate: string): Promise<FriendQrScanResult> =>
  request<FriendQrScanResult>("/api/friend-qr/scan", { method: "POST", body: JSON.stringify({ token: qrToken, localDate }) });
