import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { getPool, setPool, withTransaction } from "../src/db.ts";
import { finalizeDiscovery, getLegendaryUnlockedWorlds } from "../src/scanService.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト（段3）: 伝説解放（normalコンプリート）・候補ゲート・図鑑秘匿。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `lg_${Date.now()}`;
const W = `${RUN}_w`;
const n1 = `${RUN}_n1`;
const n2 = `${RUN}_n2`;
const L1 = `${RUN}_L1`;
const S1 = `${RUN}_S1`;

let server: Server;
let base = "";

const insertUser = async (id: string) => getPool().query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [id]);
const unlockWorld = async (userId: string) =>
  getPool().query(
    "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
    [`uw_${userId}`, userId, W]
  );
const markDiscovered = async (userId: string, charId: string) =>
  getPool().query(
    `INSERT INTO character_records
       (id, user_id, character_id, first_discovered_at, last_discovered_at, discovery_count, best_difficulty_rank,
        titles, representative_score, first_discovery_id, latest_discovery_id, number_badges)
     VALUES ($1,$2,$3,NOW(),NOW(),1,'C','[]',0,'seed','seed','[]') ON CONFLICT (id) DO NOTHING`,
    [`crec_${userId}_${charId}`, userId, charId]
  );
const dexIds = async (userId: string): Promise<string[]> => {
  const { issueToken } = await import("../src/authService.ts");
  const token = await issueToken(userId, `anon:${userId}`); // Bearer 認証（x-user-id は廃止）
  const res = await fetch(`${base}/api/dex`, { headers: { Authorization: `Bearer ${token}` } });
  const body = (await res.json()) as { characters: Array<{ id: string }> };
  return body.characters.map((c) => c.id);
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
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','W',TRUE) ON CONFLICT (world_group) DO NOTHING", [W]);
  for (const c of [n1, n2]) {
    await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [c, W]);
  }
  // legendary/secret は未発見では図鑑に出さない（is_visible_in_dex=FALSE）が抽選は可能。
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex) VALUES ($1,$1,'legendary',$2,TRUE,FALSE) ON CONFLICT (id) DO NOTHING", [L1, W]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex) VALUES ($1,$1,'secret',$2,TRUE,FALSE) ON CONFLICT (id) DO NOTHING", [S1, W]);

  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server?.close());

describe("伝説解放（normalコンプリート）", () => {
  it("normal未コンプリートは未解放", async () => {
    const u = `${RUN}_u1`;
    await insertUser(u);
    await unlockWorld(u);
    await markDiscovered(u, n1); // 2体中1体
    const set = await withTransaction((c) => getLegendaryUnlockedWorlds(c, u, [W]));
    assert.ok(!set.has(W));
  });

  it("最後のnormalを新規発見した瞬間に legendaryUnlockedNow=そのワールド", async () => {
    const u = `${RUN}_u2`;
    await insertUser(u);
    await unlockWorld(u);
    await markDiscovered(u, n1);
    // n2 を発見 → normal 2/2 完了 → 解放
    const rec = await withTransaction((c) =>
      finalizeDiscovery(c, {
        userId: u,
        character: { id: n2, name: n2, world_group: W, rarity: "normal" },
        localDate: "2026-07-07",
        discoverySource: "normal_scan",
        proofRoll: 0.99,
        friendCountToday: 0,
        isFirstValidScanOfDay: true
      })
    );
    assert.equal(rec.legendaryUnlockedNow, W);
    const set = await withTransaction((c) => getLegendaryUnlockedWorlds(c, u, [W]));
    assert.ok(set.has(W));
    const row = await getPool().query("SELECT 1 FROM user_world_legendary WHERE user_id=$1 AND world_group=$2", [u, W]);
    assert.equal(row.rowCount, 1);
  });

  it("独立性: 別ユーザーは解放されない", async () => {
    const other = `${RUN}_u3`;
    await insertUser(other);
    await unlockWorld(other);
    const set = await withTransaction((c) => getLegendaryUnlockedWorlds(c, other, [W]));
    assert.ok(!set.has(W));
  });
});

describe("候補ゲート: legendaryは未解放だと出ない", () => {
  it("未解放ユーザーの新規フレンド発見は legendary を返さない（コンプリートしない限り）", async () => {
    // 専用ワールド：normal を6体用意し、5回の読み込みではコンプリートしない＝解放されないことを保証。
    const Wk = `${RUN}_wk`;
    const Lk = `${RUN}_Lk`;
    const normals = Array.from({ length: 6 }, (_, i) => `${RUN}_nk${i}`);
    await getPool().query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','Wk',TRUE) ON CONFLICT (world_group) DO NOTHING", [Wk]);
    for (const c of normals) {
      await getPool().query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [c, Wk]);
    }
    await getPool().query("INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex) VALUES ($1,$1,'legendary',$2,TRUE,FALSE) ON CONFLICT (id) DO NOTHING", [Lk, Wk]);

    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_locked`;
    await insertUser(reader);
    await getPool().query(
      "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
      [`uw_lock_${reader}`, reader, Wk]
    );
    for (let i = 0; i < 5; i++) {
      const owner = `${RUN}_lo_${i}`;
      await insertUser(owner);
      const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: `2026-07-1${i}` });
      assert.equal(res.status, "friend_found");
      if (res.status === "friend_found") assert.notEqual(res.discoveryRecord.characterId, Lk); // 未解放 → 伝説は出ない
    }
    // 5/6 でまだ未解放であることも確認。
    const set = await withTransaction((c) => getLegendaryUnlockedWorlds(c, reader, [Wk]));
    assert.ok(!set.has(Wk));
  });
});

describe("図鑑秘匿（§4/§23）", () => {
  it("未解放ユーザー: legendary も secret も返さない", async () => {
    const u = `${RUN}_dexlock`;
    await insertUser(u);
    await unlockWorld(u);
    const ids = await dexIds(u);
    assert.ok(ids.includes(n1) && ids.includes(n2)); // normalは見える
    assert.ok(!ids.includes(L1)); // 伝説は隠す
    assert.ok(!ids.includes(S1)); // secretは隠す
  });

  it("解放済みユーザー: legendary は見える／secret は未発見なら依然隠す", async () => {
    const u = `${RUN}_u2`; // 上のテストで解放済み
    const ids = await dexIds(u);
    assert.ok(ids.includes(L1)); // 解放後は伝説を表示
    assert.ok(!ids.includes(S1)); // secretは未発見なら隠す
  });
});
