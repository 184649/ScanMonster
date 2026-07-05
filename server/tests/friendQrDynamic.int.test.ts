import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { getPool, setPool } from "../src/db.ts";
import { issueFriendQrToken } from "../src/friendQrToken.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト（Phase 2）: 動的フレンドQR を HTTP 経由で検証する（Bearer 認証込み）。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `fqd_${Date.now()}`;
const world = `${RUN}_w`;
const char = `${RUN}_c`;

let server: Server;
let base = "";

const anon = async (): Promise<{ token: string; userId: string }> => {
  const res = await fetch(`${base}/api/auth/anon`, { method: "POST" });
  return (await res.json()) as { token: string; userId: string };
};
const unlock = async (userId: string) =>
  getPool().query(
    "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
    [`uw_${userId}`, userId, world]
  );
const issueQrToken = async (bearer: string): Promise<string> => {
  const res = await fetch(`${base}/api/friend-qr/token`, { method: "POST", headers: { Authorization: `Bearer ${bearer}` } });
  return ((await res.json()) as { token: string }).token;
};
const scan = (bearer: string, qrToken: string, localDate: string) =>
  fetch(`${base}/api/friend-qr/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({ token: qrToken, localDate })
  });

before(async () => {
  if (!hasRealDb) {
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    applyAllMigrations(mem);
    const { Pool } = mem.adapters.createPg();
    setPool(new Pool() as unknown as import("pg").Pool);
  }
  const pool = getPool();
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','W',TRUE) ON CONFLICT (world_group) DO NOTHING", [world]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [char, world]);
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server?.close());

describe("動的フレンドQR（HTTP・Phase 2）", () => {
  it("owner のQRトークンを reader が読むと発見（friend_found）", async () => {
    const owner = await anon();
    const reader = await anon();
    await unlock(reader.userId);
    const qr = await issueQrToken(owner.token);
    const res = await scan(reader.token, qr, "2026-07-07");
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string; discoveryRecord?: { characterDiscoveryNo: string } };
    assert.equal(body.status, "friend_found");
    assert.equal(typeof body.discoveryRecord?.characterDiscoveryNo, "string");
  });

  it("自己QRは無効（owner 自身が自分のトークンを読む→400）", async () => {
    const me = await anon();
    await unlock(me.userId);
    const qr = await issueQrToken(me.token);
    const res = await scan(me.token, qr, "2026-07-07");
    assert.equal(res.status, 400); // self_qr
  });

  it("期限切れQRは無効（400 qr_expired）", async () => {
    const owner = await anon();
    const reader = await anon();
    await unlock(reader.userId);
    // 過去に発行された（=期限切れ）トークンを直接作る。
    const expired = issueFriendQrToken(owner.userId, Date.now() - 120_000);
    const res = await scan(reader.token, expired, "2026-07-07");
    assert.equal(res.status, 400);
  });

  it("改ざんQRは無効（400）", async () => {
    const reader = await anon();
    await unlock(reader.userId);
    const res = await scan(reader.token, "tampered.signature", "2026-07-07");
    assert.equal(res.status, 400);
  });

  it("同一相手・同日2回目は無効（duplicate）／翌日は再有効", async () => {
    const owner = await anon();
    const reader = await anon();
    await unlock(reader.userId);
    assert.equal((await scan(reader.token, await issueQrToken(owner.token), "2026-08-01")).status, 200);
    const dup = await scan(reader.token, await issueQrToken(owner.token), "2026-08-01");
    const dupBody = (await dup.json()) as { status: string };
    assert.equal(dupBody.status, "duplicate");
    assert.equal((await scan(reader.token, await issueQrToken(owner.token), "2026-08-02")).status, 200); // 翌日
  });

  it("A→B と B→A は両方有効（別方向）", async () => {
    const a = await anon();
    const b = await anon();
    await unlock(a.userId);
    await unlock(b.userId);
    const ab = await scan(a.token, await issueQrToken(b.token), "2026-09-01"); // A が B を読む
    const ba = await scan(b.token, await issueQrToken(a.token), "2026-09-01"); // B が A を読む
    assert.equal(((await ab.json()) as { status: string }).status, "friend_found");
    assert.equal(((await ba.json()) as { status: string }).status, "friend_found");
  });

  it("同じ有効QRを別の reader が読むのは正常利用（両方成功）", async () => {
    const owner = await anon();
    const r1 = await anon();
    const r2 = await anon();
    await unlock(r1.userId);
    await unlock(r2.userId);
    const qr = await issueQrToken(owner.token); // 1枚のQRを2人が読む
    assert.equal((await scan(r1.token, qr, "2026-10-01")).status, 200);
    assert.equal((await scan(r2.token, qr, "2026-10-01")).status, 200);
  });

  it("QRトークン発行も scan も Bearer 必須（無しは 401）", async () => {
    assert.equal((await fetch(`${base}/api/friend-qr/token`, { method: "POST" })).status, 401);
    const res = await fetch(`${base}/api/friend-qr/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "x", localDate: "2026-07-07" })
    });
    assert.equal(res.status, 401);
  });
});
