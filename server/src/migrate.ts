/**
 * マイグレーション実行（db/migrations/*.sql を名前順に適用）。冪等。
 *   npm run db:migrate
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { getPool } from "./db.ts";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

const run = async () => {
  const pool = getPool();
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const already = await pool.query("SELECT 1 FROM schema_migrations WHERE name = $1", [file]);
    if ((already.rowCount ?? 0) > 0) {
      console.log(`[migrate] skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    console.log(`[migrate] applied ${file}`);
  }

  await pool.end();
  console.log("[migrate] done");
};

run().catch((error) => {
  console.error("[migrate] failed", error);
  process.exit(1);
});
