import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");

/** db/migrations/*.sql を名前順に pg-mem へ適用する（migrate 相当）。 */
export const applyAllMigrations = (mem: { public: { none: (sql: string) => void } }): void => {
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    mem.public.none(readFileSync(join(migrationsDir, file), "utf8"));
  }
};
