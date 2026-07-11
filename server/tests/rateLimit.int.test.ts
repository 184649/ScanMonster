import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { getPool, setPool } from "../src/db.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト（Phase 3）: レート制限で 429 を返す。
 * このファイルは独立プロセスで動くため、低いしきい値の環境変数を設定してもよい。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);

let server: Server;
let base = "";

before(async () => {
  // /api/auth/anon を IP 3回/分に制限（テスト専用）。
  process.env.RL_ANON_MAX = "3";
  process.env.RL_ANON_WINDOW_MS = "60000";
  if (!hasRealDb) {
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    applyAllMigrations(mem);
    const { Pool } = mem.adapters.createPg();
    setPool(new Pool() as unknown as import("pg").Pool);
  }
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  delete process.env.RL_ANON_MAX;
  delete process.env.RL_ANON_WINDOW_MS;
  server?.close();
});

describe("レート制限（HTTP・Phase 3）", () => {
  it("同一IPからの匿名作成が上限超で 429（Retry-After 付き）", async () => {
    // 別IPを詐称して既存バケットと混ざらないよう固定IPを使う。
    const headers = { "x-forwarded-for": "203.0.113.7" };
    const statuses: number[] = [];
    for (let i = 0; i < 4; i++) {
      const res = await fetch(`${base}/api/auth/anon`, { method: "POST", headers });
      statuses.push(res.status);
      if (res.status === 429) assert.ok(res.headers.get("retry-after"));
    }
    assert.deepEqual(statuses.slice(0, 3), [200, 200, 200]); // 3回までOK
    assert.equal(statuses[3], 429); // 4回目でブロック
  });

  it("別IPは独立して許可される（対面イベントで別端末は巻き込まれない）", async () => {
    const res = await fetch(`${base}/api/auth/anon`, { method: "POST", headers: { "x-forwarded-for": "203.0.113.99" } });
    assert.equal(res.status, 200);
  });
});
