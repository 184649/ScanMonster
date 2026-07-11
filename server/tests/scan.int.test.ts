import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { setPool } from "../src/db.ts";
import { processScan } from "../src/scanService.ts";
import { getPool } from "../src/db.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト（§6-§10）: 実 SQL に対して /api/scan の処理を検証する。
 *  - DATABASE_URL があれば実 PostgreSQL（VPS/ローカル）を使う（要 migrate 済み）。
 *  - 無ければ pg-mem（インメモリ PostgreSQL 互換）を使い、この環境でも必ず実行される。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);

const RUN = `it_${Date.now()}`;
const world1 = `${RUN}_w1`;
const world2 = `${RUN}_w2`;
const char1 = `${RUN}_c1`;
const char2 = `${RUN}_c2`;
const user1 = `${RUN}_u1`;
const user2 = `${RUN}_u2`;

const day = "2026-07-07";
const nextDay = "2026-07-08";

before(async () => {
  if (!hasRealDb) {
    // pg-mem で実 SQL を動かす（migrate 相当）。
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    applyAllMigrations(mem);
    const { Pool } = mem.adapters.createPg();
    setPool(new Pool() as unknown as import("pg").Pool);
  }
  const pool = getPool();
  // テスト専用ワールド/キャラ/解放（出現を決定的にする＝各ワールドに1体だけ）。
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','W1',TRUE) ON CONFLICT (world_group) DO NOTHING", [world1]);
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','W2',TRUE) ON CONFLICT (world_group) DO NOTHING", [world2]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,'シバマル','normal',$2) ON CONFLICT (id) DO NOTHING", [char1, world1]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,'クラゲル','normal',$2) ON CONFLICT (id) DO NOTHING", [char2, world2]);
  await pool.query("INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING", [`uw_${RUN}_1`, user1, world1]);
  await pool.query("INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING", [`uw_${RUN}_2`, user2, world2]);
});

describe("結合: サーバー採番・発見処理", () => {
  it("新規発見: discovered / No は string / DP付与 / DB保存", async () => {
    const r = await processScan({ userId: user1, sourceHash: `${RUN}_a`, scanType: "barcode", localDate: day });
    assert.equal(r.status, "discovered");
    if (r.status !== "discovered") return;
    assert.equal(r.discoveryRecord.characterId, char1);
    assert.equal(typeof r.discoveryRecord.characterDiscoveryNo, "string");
    assert.equal(r.discoveryRecord.characterDiscoveryNo, "1"); // キャラ別 No.001
    assert.ok(r.discoveryRecord.dpGained > 0);

    const pool = getPool();
    const rec = await pool.query("SELECT * FROM discovery_records WHERE id = $1", [r.discoveryRecord.id]);
    assert.equal(rec.rowCount, 1);
    const crec = await pool.query("SELECT * FROM character_records WHERE user_id = $1 AND character_id = $2", [user1, char1]);
    assert.equal(crec.rowCount, 1);
    const dp = await pool.query("SELECT balance FROM user_dp WHERE user_id = $1", [user1]);
    assert.ok(Number(dp.rows[0].balance) > 0);
    const sh = await pool.query("SELECT is_valid_scan FROM scan_history WHERE user_id = $1 AND source_hash = $2", [user1, `${RUN}_a`]);
    assert.equal(sh.rows[0].is_valid_scan, true);
  });

  it("同日同コードは duplicate（番号もDPも増えない）", async () => {
    const pool = getPool();
    const before = await pool.query("SELECT balance FROM user_dp WHERE user_id = $1", [user1]);
    const countBefore = await pool.query("SELECT COUNT(*)::int AS n FROM discovery_records WHERE character_id = $1", [char1]);
    const r = await processScan({ userId: user1, sourceHash: `${RUN}_a`, scanType: "barcode", localDate: day });
    assert.equal(r.status, "duplicate");
    const after = await pool.query("SELECT balance FROM user_dp WHERE user_id = $1", [user1]);
    const countAfter = await pool.query("SELECT COUNT(*)::int AS n FROM discovery_records WHERE character_id = $1", [char1]);
    assert.equal(Number(after.rows[0].balance), Number(before.rows[0].balance));
    assert.equal(countAfter.rows[0].n, countBefore.rows[0].n);
  });

  it("キャラ別採番は連番: 同キャラ別コードで No.002, No.003", async () => {
    const r2 = await processScan({ userId: user1, sourceHash: `${RUN}_b`, scanType: "barcode", localDate: day });
    const r3 = await processScan({ userId: user1, sourceHash: `${RUN}_c`, scanType: "barcode", localDate: day });
    assert.equal(r2.status === "discovered" && r2.discoveryRecord.characterDiscoveryNo, "2");
    assert.equal(r3.status === "discovered" && r3.discoveryRecord.characterDiscoveryNo, "3");
  });

  it("翌日再スキャンは discovered で新しい番号", async () => {
    const r = await processScan({ userId: user1, sourceHash: `${RUN}_a`, scanType: "barcode", localDate: nextDay });
    assert.equal(r.status, "discovered");
    if (r.status === "discovered") assert.equal(r.discoveryRecord.characterDiscoveryNo, "4");
  });

  it("別キャラは独立して No.001 から", async () => {
    const r = await processScan({ userId: user2, sourceHash: `${RUN}_d`, scanType: "barcode", localDate: day });
    assert.equal(r.status === "discovered" && r.discoveryRecord.characterId, char2);
    assert.equal(r.status === "discovered" && r.discoveryRecord.characterDiscoveryNo, "1");
  });

  it("No.777: カウンターを776にした次の発見で番号価値が付く", async () => {
    const pool = getPool();
    await pool.query("UPDATE discovery_counters SET current_value = 776 WHERE counter_key = $1", [`character:${char1}`]);
    const r = await processScan({ userId: user1, sourceHash: `${RUN}_777`, scanType: "barcode", localDate: nextDay });
    assert.equal(r.status, "discovered");
    if (r.status !== "discovered") return;
    assert.equal(r.discoveryRecord.characterDiscoveryNo, "777");
    assert.ok(r.discoveryRecord.primaryNumberBadge);
    assert.equal(r.discoveryRecord.primaryNumberBadge?.valueRank, "premium");
    assert.ok(r.discoveryRecord.primaryNumberBadge?.tags.includes("lucky7"));
  });

  it("最強の証: 強制付与でタイトルが記録される", async () => {
    process.env.WORLDAWN_FORCE_STRONGEST_PROOF = "1";
    try {
      const r = await processScan({ userId: user1, sourceHash: `${RUN}_proof`, scanType: "barcode", localDate: nextDay });
      assert.equal(r.status, "discovered");
      if (r.status !== "discovered") return;
      assert.equal(r.discoveryRecord.strongestProof, true);
      assert.ok(r.discoveryRecord.grantedCharacterTitles.includes("strongest_proof"));
      const pool = getPool();
      const crec = await pool.query("SELECT titles FROM character_records WHERE user_id = $1 AND character_id = $2", [user1, char1]);
      const titles = crec.rows[0].titles as string[];
      assert.ok(titles.includes("strongest_proof"));
    } finally {
      delete process.env.WORLDAWN_FORCE_STRONGEST_PROOF;
    }
  });
});
