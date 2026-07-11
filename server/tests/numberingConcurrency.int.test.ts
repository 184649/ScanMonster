import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { getPool, setPool, withTransaction } from "../src/db.ts";
import { finalizeDiscovery } from "../src/scanService.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 同時採番テスト（Phase 4）。**実 PostgreSQL 専用**（行ロックの直列化を検証するため）。
 * pg-mem では並行性を正しく模擬できないため skip する。
 *
 * 実行：DATABASE_URL を指定して migrate 済みの実 PG に対して走らせる（docs/POSTGRES_INTEGRATION_TEST.md）。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `cc_${Date.now()}`;
const world = `${RUN}_w`;
const char = `${RUN}_c`;
const N = 25;

before(async () => {
  if (!hasRealDb) {
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    applyAllMigrations(mem);
    const { Pool } = mem.adapters.createPg();
    setPool(new Pool() as unknown as import("pg").Pool);
    return;
  }
  const pool = getPool();
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','W',TRUE) ON CONFLICT (world_group) DO NOTHING", [world]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [char, world]);
  for (let i = 0; i < N; i++) {
    const u = `${RUN}_u${i}`;
    await pool.query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [u]);
    await pool.query(
      "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
      [`uw_${u}`, u, world]
    );
  }
});

describe("同時採番（実PostgreSQLのみ）", () => {
  it(
    "同一キャラを N ユーザーが同時発見しても番号は 1..N で重複しない",
    { skip: hasRealDb ? false : "requires real PostgreSQL (set DATABASE_URL)" },
    async () => {
      // N 個の finalizeDiscovery を並行実行（各ユーザー・同一キャラ＝共有カウンター）。
      const results = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          withTransaction((client) =>
            finalizeDiscovery(client, {
              userId: `${RUN}_u${i}`,
              character: { id: char, name: char, world_group: world, rarity: "normal" },
              localDate: "2026-07-07",
              discoverySource: "normal_scan",
              proofRoll: 0.99,
              friendCountToday: 0,
              isFirstValidScanOfDay: true
            })
          )
        )
      );
      const numbers = results.map((r) => Number(r.characterDiscoveryNo)).sort((a, b) => a - b);
      // 重複なし・欠番なし（1..N）。
      assert.equal(new Set(numbers).size, N, "番号が重複している");
      assert.deepEqual(numbers, Array.from({ length: N }, (_, i) => i + 1));

      const rows = await getPool().query<{ n: string }>(
        "SELECT COUNT(DISTINCT character_discovery_no)::int AS n FROM discovery_records WHERE character_id = $1",
        [char]
      );
      assert.equal(Number(rows.rows[0]?.n), N); // DB上も distinct
    }
  );
});
