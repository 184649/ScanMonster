/**
 * 動的フレンドQRトークン（Phase 2）。純粋・テスト可能。
 *
 * 設計：ステートレスな HMAC 署名トークン（新規テーブル不要）。
 *   token = base64url({o, iat, exp}) + "." + base64url(HMAC-SHA256(secret, body))
 *  - 短時間有効（既定60秒）。スクリーンショットを送っても exp 経過後は無効。
 *  - owner はサーバーが署名検証して解決（QR にクライアントの userId を直載せしない・改ざん検知）。
 *  - トークン自体は「世界全体で一度きり」にしない（同じ有効QRを60秒以内に複数人が読める）。
 *    同一相手・同日の重複は UNIQUE(reader,owner,local_date)＝friend_qr_reads で担保する（別レイヤ）。
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export const FRIEND_QR_TTL_SECONDS = 60;

/** リポジトリ公開の開発用フォールバック。本番でこの値のまま使うと署名を誰でも偽造できる。 */
export const DEFAULT_FRIEND_QR_SECRET = "worldawn-dev-friendqr-secret-change-me";

/** 本番起動ガード用：秘密鍵が未設定または開発用既定のままなら true（＝偽造可能な危険状態）。 */
export const isDefaultFriendQrSecret = (): boolean => {
  const s = process.env.FRIEND_QR_SECRET;
  return !s || s === DEFAULT_FRIEND_QR_SECRET;
};

const secret = (): string => process.env.FRIEND_QR_SECRET || DEFAULT_FRIEND_QR_SECRET;

const b64url = (buf: Buffer): string =>
  buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlDecode = (s: string): Buffer => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
const sign = (body: string): string => b64url(createHmac("sha256", secret()).update(body).digest());

/** owner 用の署名付き短期トークンを発行する。 */
export const issueFriendQrToken = (ownerUserId: string, nowMs: number = Date.now()): string => {
  const iat = Math.floor(nowMs / 1000);
  const body = b64url(Buffer.from(JSON.stringify({ o: ownerUserId, iat, exp: iat + FRIEND_QR_TTL_SECONDS })));
  return `${body}.${sign(body)}`;
};

export type FriendQrVerify =
  | { ok: true; ownerUserId: string }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" };

/** トークンを検証し owner を解決する。改ざん・期限切れ・不正形式は失敗。 */
export const verifyFriendQrToken = (token: string, nowMs: number = Date.now()): FriendQrVerify => {
  const parts = (token ?? "").split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;
  // 署名を定数時間比較（改ざん検知）。
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "bad_signature" };
  let payload: { o?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(b64urlDecode(body).toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (typeof payload.o !== "string" || typeof payload.exp !== "number") return { ok: false, reason: "malformed" };
  if (payload.exp * 1000 < nowMs) return { ok: false, reason: "expired" };
  return { ok: true, ownerUserId: payload.o };
};
