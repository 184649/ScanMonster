import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { createTransferCode, redeemTransferCode, resolveUserIdFromToken } from "../src/authService.ts";
import { getPool, setPool, withTransaction } from "../src/db.ts";
import { finalizeDiscovery } from "../src/scanService.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 完全引き継ぎ統合テスト（Phase 9）。
 * 引き継ぎは「同一 user_id の移譲」＝サーバー側の全データは同じ user_id に紐づく。
 * ここでは：フル発見データを作り、引き継ぎ後も全テーブルが同一 user_id で健在／新トークンで認証できる／
 * 新端末が DP・ワールド解放を取り戻せる／コード再利用不可・期限切れ不可 を検証する。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `tr_${Date.now()}`;
const world = `${RUN}_w`;
const nChar = `${RUN}_n`;
const rChar = `${RUN}_r`;
const U = `${RUN}_user`;

let server: Server;
let base = "";

const count = async (table: string): Promise<number> => {
  const r = await getPool().query<{ n: string }>(`SELECT COUNT(*)::int AS n FROM ${table} WHERE user_id = $1`, [U]);
  return Number(r.rows[0]?.n ?? 0);
};
const snapshot = async () => ({
  discovery_records: await count("discovery_records"),
  character_records: await count("character_records"),
  dp_transactions: await count("dp_transactions"),
  user_world_unlocks: await count("user_world_unlocks"),
  friend_qr_reads: (async () => {
    const r = await getPool().query<{ n: string }>("SELECT COUNT(*)::int AS n FROM friend_qr_reads WHERE reader_user_id = $1", [U]);
    return Number(r.rows[0]?.n ?? 0);
  })(),
  user_world_legendary: await count("user_world_legendary"),
  dp: Number((await getPool().query<{ balance: number }>("SELECT balance FROM user_dp WHERE user_id = $1", [U])).rows[0]?.balance ?? 0)
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
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [nChar, world]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'rare',$2) ON CONFLICT (id) DO NOTHING", [rChar, world]);
  await pool.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [U]);
  await pool.query("INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING", [`uw_${U}`, U, world]);

  // normal 発見（No.1）、rare 発見、特殊番号 No.777、legendary解放、フレンド交流を作る。
  const fin = (character: { id: string; name: string; world_group: string; rarity: string }, date: string) =>
    withTransaction((c) =>
      finalizeDiscovery(c, {
        userId: U,
        character: character as never,
        localDate: date,
        discoverySource: "normal_scan",
        proofRoll: 0.5,
        friendCountToday: 0,
        isFirstValidScanOfDay: true
      })
    );
  await fin({ id: nChar, name: nChar, world_group: world, rarity: "normal" }, "2026-07-01");
  await fin({ id: rChar, name: rChar, world_group: world, rarity: "rare" }, "2026-07-02");
  await pool.query("UPDATE discovery_counters SET current_value = 776 WHERE counter_key = $1", [`character:${nChar}`]);
  await fin({ id: nChar, name: nChar, world_group: world, rarity: "normal" }, "2026-07-03"); // → No.777（premium）
  await pool.query("INSERT INTO user_world_legendary (user_id, world_group) VALUES ($1,$2) ON CONFLICT DO NOTHING", [U, world]);
  await pool.query(
    "INSERT INTO friend_qr_reads (id, reader_user_id, owner_user_id, is_new_friend, local_date) VALUES ($1,$2,$3,TRUE,$4)",
    [`fqr_${RUN}`, U, `${RUN}_owner`, "2026-07-03"]
  );

  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server?.close());

describe("完全引き継ぎ（サーバー側・同一user_id移譲）", () => {
  it("引き継ぎ前にフルデータが存在する（特殊番号No.777含む）", async () => {
    const s = await snapshot();
    assert.ok(s.discovery_records >= 3);
    assert.ok(s.character_records >= 2);
    assert.ok(s.dp_transactions >= 3);
    assert.ok(s.user_world_unlocks >= 1);
    assert.ok((await s.friend_qr_reads) >= 1);
    assert.ok(s.user_world_legendary >= 1);
    assert.ok(s.dp > 0);
    const special = await getPool().query(
      "SELECT 1 FROM discovery_records WHERE user_id = $1 AND character_discovery_no = '777' AND primary_number_badge IS NOT NULL",
      [U]
    );
    assert.equal(special.rowCount, 1); // 特殊番号（番号価値）も保持
  });

  it("引き継ぎコード redeem で同一 userId＋有効トークンを取り戻す", async () => {
    const before = await snapshot();
    const { code } = await createTransferCode(U);
    const redeemed = await redeemTransferCode(code);
    assert.equal(redeemed.userId, U); // 同一 user_id（データはこの id に紐づいたまま）
    assert.ok(redeemed.token && redeemed.token.length >= 32);
    assert.equal(await resolveUserIdFromToken(redeemed.token), U); // 新端末はこのトークンで U として認証

    // データは移動していない＝引き継ぎ後も全件健在（前後で一致）。
    const after = await snapshot();
    assert.equal(after.discovery_records, before.discovery_records);
    assert.equal(after.character_records, before.character_records);
    assert.equal(after.user_world_unlocks, before.user_world_unlocks);
    assert.equal(after.user_world_legendary, before.user_world_legendary);
    assert.equal(after.dp, before.dp);
    assert.equal(await after.friend_qr_reads, await before.friend_qr_reads);
  });

  it("新端末は Bearer で DP・ワールド解放・発見ログを取り戻せる", async () => {
    const { token } = await redeemTransferCode((await createTransferCode(U)).code);
    const h = { Authorization: `Bearer ${token}` };
    const dp = (await (await fetch(`${base}/api/dp`, { headers: h })).json()) as { balance: number };
    assert.ok(dp.balance > 0);
    const wu = (await (await fetch(`${base}/api/world-unlocks`, { headers: h })).json()) as { worlds: Array<{ world_group: string }> };
    assert.ok(wu.worlds.some((w) => w.world_group === world));
    const dl = (await (await fetch(`${base}/api/discoveries`, { headers: h })).json()) as { discoveries: unknown[] };
    assert.ok(dl.discoveries.length >= 3);
  });

  it("引き継ぎコードは再利用不可・期限切れ不可", async () => {
    const { AuthError } = await import("../src/authService.ts");
    const { code } = await createTransferCode(U);
    await redeemTransferCode(code);
    await assert.rejects(redeemTransferCode(code), (e) => e instanceof AuthError); // 再利用不可
    // 期限切れコードを直接用意。
    await getPool().query(
      "INSERT INTO transfer_codes (code, user_id, expires_at) VALUES ($1,$2,$3)",
      [`EXPIRED_${RUN}`, U, new Date(Date.now() - 1000).toISOString()]
    );
    await assert.rejects(redeemTransferCode(`EXPIRED_${RUN}`), (e) => e instanceof AuthError); // 期限切れ不可
  });
});
