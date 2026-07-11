import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { getPool, setPool } from "../src/db.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト（Phase 1）: Bearer 認証・なりすまし不可・x-user-id 廃止。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `ab_${Date.now()}`;
const world = `${RUN}_w`;
const char = `${RUN}_c`;

let server: Server;
let base = "";

const anon = async (): Promise<{ token: string; userId: string }> => {
  const res = await fetch(`${base}/api/auth/anon`, { method: "POST" });
  assert.equal(res.status, 200);
  return (await res.json()) as { token: string; userId: string };
};
const unlock = async (userId: string) =>
  getPool().query(
    "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
    [`uw_${userId}`, userId, world]
  );

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

const scan = (headers: Record<string, string>, sourceHash: string) =>
  fetch(`${base}/api/scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ sourceHash, scanType: "barcode", localDate: "2026-07-07" })
  });

describe("Bearer 認証（Phase 1）", () => {
  it("匿名アカウント作成で userId と token を発行", async () => {
    const a = await anon();
    assert.ok(a.userId.startsWith("usr_"));
    assert.ok(a.token.length >= 32);
  });

  it("正しい Bearer で成功、token 無しは 401、不正 token は 401", async () => {
    const a = await anon();
    await unlock(a.userId);
    assert.equal((await scan({ Authorization: `Bearer ${a.token}` }, `${RUN}_ok`)).status, 200);
    assert.equal((await scan({}, `${RUN}_none`)).status, 401);
    assert.equal((await scan({ Authorization: "Bearer deadbeefdeadbeefdeadbeef" }, `${RUN}_bad`)).status, 401);
  });

  it("x-user-id だけではアクセス不可（401）＝x-user-id を本人性の根拠にしない", async () => {
    const a = await anon();
    const res = await scan({ "x-user-id": a.userId }, `${RUN}_xuid`);
    assert.equal(res.status, 401);
  });

  it("他人の userId をヘッダーで送ってもなりすませない（発見は token の userId に紐づく）", async () => {
    const victim = await anon();
    const attacker = await anon();
    await unlock(attacker.userId);
    // attacker の token で、victim の userId を偽装ヘッダに載せてスキャン。
    const res = await scan({ Authorization: `Bearer ${attacker.token}`, "x-user-id": victim.userId }, `${RUN}_imp`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { discoveryRecord: { id: string } };
    const rec = await getPool().query<{ user_id: string }>("SELECT user_id FROM discovery_records WHERE id = $1", [
      body.discoveryRecord.id
    ]);
    assert.equal(rec.rows[0]?.user_id, attacker.userId); // victim ではなく token 本人
  });

  it("dex は token 本人のデータだけ（他人の発見フラグを覗けない）", async () => {
    const a = await anon();
    const res = await fetch(`${base}/api/dex`, { headers: { Authorization: `Bearer ${a.token}` } });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { characters: Array<{ id: string; discovered: boolean }> };
    // 新規ユーザーは何も発見していない。
    assert.ok(body.characters.every((c) => c.discovered === false || c.discovered === null));
  });

  it("friend-effect も Bearer 必須（無しは 401）", async () => {
    assert.equal((await fetch(`${base}/api/friend-effect?localDate=2026-07-07`)).status, 401);
    const a = await anon();
    const ok = await fetch(`${base}/api/friend-effect?localDate=2026-07-07`, { headers: { Authorization: `Bearer ${a.token}` } });
    assert.equal(ok.status, 200);
  });
});
