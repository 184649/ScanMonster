/**
 * 認証・アカウント連携・データ引継ぎ。
 * データは users.id をキーに保存されており、accounts.primary_user_id がその正規ID。
 *  - register: ゲスト(現在の user_id)にアカウントを紐づける（データはそのまま）。
 *  - login: 別端末から primary_user_id を取り戻す（＝引継ぎ）。
 *  - transfer code: アカウント無しでも user_id を別端末へ引き継ぐ。
 * パスワードは scrypt でハッシュ（ネイティブ依存なし）。
 */
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

import { getPool } from "./db.ts";

export class AuthError extends Error {
  status: number;
  constructor(code: string) {
    super(code);
    this.name = "AuthError";
    this.status = code === "email_taken" ? 409 : code === "invalid_credentials" ? 401 : code === "not_found" ? 404 : 400;
  }
}

const normEmail = (email: string): string => email.trim().toLowerCase();

const hashPassword = (password: string): string => {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password: string, stored: string): boolean => {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return computed.length === expected.length && timingSafeEqual(computed, expected);
};

/**
 * 認証トークンは「平文の生トークン」をクライアントに返し、DBには SHA-256 ハッシュだけを保存する。
 * DB が漏れても生トークンは復元できない。生トークンは 32byte(256bit) で推測困難。無効化は行削除で可能。
 */
const sha256 = (raw: string): string => createHash("sha256").update(raw).digest("hex");

/** 生トークンを発行し、ハッシュを auth_tokens に保存する（account_id は匿名なら `anon:<userId>`）。 */
export const issueToken = async (userId: string, accountId: string): Promise<string> => {
  const raw = randomBytes(32).toString("hex");
  await getPool().query("INSERT INTO auth_tokens (token, account_id, user_id) VALUES ($1,$2,$3)", [
    sha256(raw),
    accountId,
    userId
  ]);
  return raw;
};

/** Bearer 生トークンから userId を解決する（無効なら null）。本人性の唯一の根拠。 */
export const resolveUserIdFromToken = async (rawToken: string | undefined | null): Promise<string | null> => {
  const raw = (rawToken ?? "").trim();
  if (raw.length < 16) return null;
  const res = await getPool().query<{ user_id: string }>("SELECT user_id FROM auth_tokens WHERE token = $1", [sha256(raw)]);
  return res.rows[0]?.user_id ?? null;
};

export type AuthResult = { token: string; userId: string; email: string; displayName?: string };

/** 匿名アカウント作成（1端末=1匿名アカウント）。users 行を作り、Bearer トークンを発行する。 */
export const createAnonymousAccount = async (): Promise<{ token: string; userId: string }> => {
  const userId = `usr_${randomUUID()}`;
  await getPool().query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [userId]);
  const token = await issueToken(userId, `anon:${userId}`);
  return { token, userId };
};

/** ゲスト(userId)にアカウントを作成して紐づける。 */
export const registerAccount = async (params: {
  email: string;
  password: string;
  userId: string;
  displayName?: string;
}): Promise<AuthResult> => {
  const pool = getPool();
  const email = normEmail(params.email);
  if (!email.includes("@") || email.length < 5) throw new AuthError("invalid_email");
  if (!params.password || params.password.length < 6) throw new AuthError("weak_password");

  const exists = await pool.query("SELECT 1 FROM accounts WHERE email = $1", [email]);
  if ((exists.rowCount ?? 0) > 0) throw new AuthError("email_taken");

  const id = `acc_${randomUUID()}`;
  await pool.query(
    "INSERT INTO accounts (id, email, password_hash, primary_user_id, display_name) VALUES ($1,$2,$3,$4,$5)",
    [id, email, hashPassword(params.password), params.userId, params.displayName ?? null]
  );
  const token = await issueToken(params.userId, id);
  return { token, userId: params.userId, email, displayName: params.displayName };
};

/** ログイン → そのアカウントの primary_user_id（引継ぎ先）を返す。 */
export const loginAccount = async (params: { email: string; password: string }): Promise<AuthResult> => {
  const pool = getPool();
  const email = normEmail(params.email);
  const res = await pool.query<{ id: string; password_hash: string; primary_user_id: string; display_name: string | null }>(
    "SELECT id, password_hash, primary_user_id, display_name FROM accounts WHERE email = $1",
    [email]
  );
  const row = res.rows[0];
  if (!row || !verifyPassword(params.password, row.password_hash)) throw new AuthError("invalid_credentials");
  const token = await issueToken(row.primary_user_id, row.id);
  return { token, userId: row.primary_user_id, email, displayName: row.display_name ?? undefined };
};

/** 現在の user_id に対する引継ぎコードを発行する（8文字）。 */
export const createTransferCode = async (userId: string): Promise<{ code: string; expiresAt: string }> => {
  const pool = getPool();
  const code = randomBytes(4).toString("hex").toUpperCase(); // 8 hex chars
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await pool.query("INSERT INTO transfer_codes (code, user_id, expires_at) VALUES ($1,$2,$3)", [code, userId, expiresAt]);
  return { code, expiresAt };
};

/**
 * 引継ぎコードを使って user_id を取り戻す（単回使用）。
 * 新端末が Bearer 認証できるよう、その userId 用のトークンも新規発行して返す。
 */
export const redeemTransferCode = async (rawCode: string): Promise<{ userId: string; token: string }> => {
  const pool = getPool();
  const code = rawCode.trim().toUpperCase();
  const res = await pool.query<{ user_id: string; used_at: string | null; expires_at: string | null }>(
    "SELECT user_id, used_at, expires_at FROM transfer_codes WHERE code = $1",
    [code]
  );
  const row = res.rows[0];
  if (!row) throw new AuthError("not_found");
  if (row.used_at) throw new AuthError("code_used");
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) throw new AuthError("code_expired");
  await pool.query("UPDATE transfer_codes SET used_at = NOW() WHERE code = $1", [code]);
  const token = await issueToken(row.user_id, `transfer:${row.user_id}`);
  return { userId: row.user_id, token };
};
