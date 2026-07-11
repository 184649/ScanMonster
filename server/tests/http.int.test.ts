import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { getPool, setPool } from "../src/db.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * HTTP 結合（health / scan）: Express アプリを listen(0) で起動し、pg-mem 実SQLを通して検証する。
 * 認証は Authorization: Bearer（匿名アカウント /api/auth/anon で取得）。x-user-id は使わない。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `http_${Date.now()}`;
const world = `${RUN}_w`;
const char = `${RUN}_c`;

let server: Server;
let base = "";

const anon = async (): Promise<{ token: string; userId: string }> => {
  const res = await fetch(`${base}/api/auth/anon`, { method: "POST" });
  return (await res.json()) as { token: string; userId: string };
};

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
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,'シバマル','normal',$2) ON CONFLICT (id) DO NOTHING", [char, world]);

  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server?.close());

describe("HTTP: /api", () => {
  it("GET /api/health → ok:true", async () => {
    const res = await fetch(`${base}/api/health`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { ok: boolean; status: string };
    assert.equal(body.ok, true);
  });

  it("POST /api/scan（Bearer）→ discovered, characterDiscoveryNo は string", async () => {
    const { token, userId } = await anon();
    await getPool().query(
      "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
      [`uw_${RUN}`, userId, world]
    );
    const res = await fetch(`${base}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sourceHash: `${RUN}_hash`, scanType: "barcode", localDate: "2026-07-07" })
    });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { status: string; discoveryRecord?: { characterDiscoveryNo: string } };
    assert.equal(body.status, "discovered");
    assert.equal(typeof body.discoveryRecord?.characterDiscoveryNo, "string");
  });

  it("POST /api/scan は Bearer 必須（無しは 401）", async () => {
    const res = await fetch(`${base}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceHash: "x", scanType: "barcode", localDate: "2026-07-07" })
    });
    assert.equal(res.status, 401);
  });
});
