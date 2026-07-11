/**
 * レート制限・番号farming対策（Phase 3）。プロセス内メモリのカウンタ（固定ウィンドウ）。
 *
 * 方針：
 *  - IP 単位はNAT配下の対面イベント（同一WiFiに多数）を考慮して緩め。主に大量アカウント作成/総当たり対策。
 *  - user 単位（Bearer 確定後）が主要な farming 対策。owner が100人に読まれても各 reader は別バケットなので影響なし。
 *  - しきい値は環境変数 RL_<NAME>_MAX / RL_<NAME>_WINDOW_MS で上書き可能。
 *  - ブロック時は 429 + Retry-After。ログは必要最小限（IP/endpoint/user/理由）で長期保存しない。
 *
 * 注意：メモリ実装のため単一プロセス前提。水平スケール時は共有ストア（Redis 等）が必要（未実装）。
 */
import type { NextFunction, Request, Response } from "express";

export type RateRule = { max: number; windowMs: number };
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;
const sweep = (now: number): void => {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
};

/** 純粋なレート判定（テスト可能）。超過時 allowed=false と retryAfterMs を返す。 */
export const hitRateLimit = (key: string, rule: RateRule, now: number = Date.now()): { allowed: boolean; retryAfterMs: number } => {
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + rule.windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  if (b.count > rule.max) return { allowed: false, retryAfterMs: Math.max(0, b.resetAt - now) };
  return { allowed: true, retryAfterMs: 0 };
};

/** テスト用リセット。 */
export const _resetRateLimits = (): void => {
  buckets.clear();
  lastSweep = 0;
};

export const clientIp = (req: Request): string => {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) return xff.split(",")[0]!.trim();
  return req.socket?.remoteAddress || req.ip || "unknown";
};

const uidOf = (req: Request): string | undefined => (req as Request & { userId?: string }).userId;

const envRule = (name: string, defMax: number, defWindowMs: number): RateRule => ({
  max: Number(process.env[`RL_${name}_MAX`]) || defMax,
  windowMs: Number(process.env[`RL_${name}_WINDOW_MS`]) || defWindowMs
});

const logBlock = (name: string, req: Request): void => {
  console.warn(
    `[rate-limit] blocked name=${name} ip=${clientIp(req)} user=${uidOf(req) ?? "-"} at=${new Date().toISOString()}`
  );
};

const makeLimiter =
  (name: string, defMax: number, defWindowMs: number, keyOf: (req: Request) => string) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    sweep(now);
    const { allowed, retryAfterMs } = hitRateLimit(`${name}:${keyOf(req)}`, envRule(name, defMax, defWindowMs), now);
    if (!allowed) {
      res.setHeader("Retry-After", String(Math.ceil(retryAfterMs / 1000)));
      logBlock(name, req);
      res.status(429).json({ error: "rate_limited" });
      return;
    }
    next();
  };

/** IP 単位（認証前の入口用・NAT配下の対面イベントを考慮して緩め）。 */
export const perIp = (name: string, defMax: number, defWindowMs: number) => makeLimiter(name, defMax, defWindowMs, clientIp);

/** 認証ユーザー単位（requireAuth の後に置く・主要な farming 対策）。未認証時は IP にフォールバック。 */
export const perUser = (name: string, defMax: number, defWindowMs: number) =>
  makeLimiter(name, defMax, defWindowMs, (req) => uidOf(req) ?? clientIp(req));
