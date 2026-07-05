/**
 * 開発用シード投入。ワールド／キャラ（**唯一の正本から生成**）／デモユーザー。
 *   npm run gen:seed   … 正本(character_master.json + rarity-overrides.json)→ characterSeed.generated.ts
 *   npm run db:seed    … 生成済みシードを PostgreSQL へ投入
 *
 * キャラは手書きせず SEED_CHARACTERS（app catalog と同一ソース）を使う。二度と 8体 vs 74体 の乖離を作らない。
 * legendary/secret は is_visible_in_dex=false（未解放/未発見では図鑑に出さない）。legendary は is_available_for_scan=true（解放後に候補入り）。
 */
import { randomUUID } from "node:crypto";

import { getPool } from "./db.ts";
import { SEED_CHARACTERS } from "./characterSeed.generated.ts";

const pool = getPool();

const WORLDS: [string, string, string, number][] = [
  ["ground", "life", "地上ワールド", 1],
  ["waterside", "life", "水辺ワールド", 2],
  ["sky", "life", "空ワールド", 3],
  ["bug", "life", "虫ワールド", 4]
];

const CHARACTERS = SEED_CHARACTERS;

const DEMO_USER = "demo_user";

const run = async () => {
  for (const [world, realm, label, order] of WORLDS) {
    await pool.query(
      `INSERT INTO world_masters (world_group, realm_group, label, sort_order, is_released)
       VALUES ($1,$2,$3,$4,TRUE)
       ON CONFLICT (world_group) DO UPDATE SET realm_group = EXCLUDED.realm_group, label = EXCLUDED.label, sort_order = EXCLUDED.sort_order`,
      [world, realm, label, order]
    );
  }

  for (const c of CHARACTERS) {
    // legendary/secret は図鑑に事前露出しない。legendary は解放後に候補入りするため scan 対象は true。
    const visibleInDex = c.rarity === "normal" || c.rarity === "rare";
    const availableForScan = c.rarity !== "secret";
    await pool.query(
      `INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rarity = EXCLUDED.rarity, world_group = EXCLUDED.world_group,
         is_available_for_scan = EXCLUDED.is_available_for_scan, is_visible_in_dex = EXCLUDED.is_visible_in_dex`,
      [c.id, c.name, c.rarity, c.world, availableForScan, visibleInDex]
    );
  }

  // デモユーザー：2ワールド解放＋DPを付与（scan/boost の動作確認用）。
  await pool.query("INSERT INTO users (id, display_name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [DEMO_USER, "Demo"]);
  await pool.query(
    "INSERT INTO user_dp (user_id, balance) VALUES ($1, 5000) ON CONFLICT (user_id) DO UPDATE SET balance = 5000",
    [DEMO_USER]
  );
  for (const [world, , , order] of WORLDS.slice(0, 2)) {
    await pool.query(
      `INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order, cost_dp)
       VALUES ($1,$2,$3,$4,0) ON CONFLICT (user_id, world_group) DO NOTHING`,
      [`uw_${randomUUID()}`, DEMO_USER, world, order]
    );
  }

  // QA固定出現：1ワールド=1キャラにして、対象ユーザーのスキャンが必ず同じキャラになるようにする。
  // （キャラ別採番・No.777 を実サーバーの curl で確定的に確認するため。図鑑には出さない/一般ユーザーには出さない）
  const QA: { world: string; char: string; name: string; user: string }[] = [
    { world: "qa_world_shibamaru", char: "qa_shibamaru", name: "QAシバマル", user: "qa_user" },
    { world: "qa_world_kurageru", char: "qa_kurageru", name: "QAクラゲル", user: "qa_user2" }
  ];
  for (const q of QA) {
    // is_released=false → 一般ユーザーのフォールバック抽選には出ない。
    await pool.query(
      "INSERT INTO world_masters (world_group, realm_group, label, sort_order, is_released) VALUES ($1,'life',$2,99,FALSE) ON CONFLICT (world_group) DO UPDATE SET is_released = FALSE",
      [q.world, q.name]
    );
    // is_visible_in_dex=false → アプリ図鑑に出さない。is_available_for_scan=true → スキャン対象。
    await pool.query(
      `INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex)
       VALUES ($1,$2,'normal',$3,TRUE,FALSE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, world_group = EXCLUDED.world_group, is_visible_in_dex = FALSE`,
      [q.char, q.name, q.world]
    );
    await pool.query("INSERT INTO users (id, display_name) VALUES ($1,$2) ON CONFLICT (id) DO NOTHING", [q.user, q.name]);
    await pool.query("INSERT INTO user_dp (user_id, balance) VALUES ($1, 1000) ON CONFLICT (user_id) DO NOTHING", [q.user]);
    // 対象ユーザーは、この1ワールドだけ解放 → スキャンは必ずこのキャラ。
    await pool.query(
      "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order, cost_dp) VALUES ($1,$2,$3,1,0) ON CONFLICT (user_id, world_group) DO NOTHING",
      [`uw_${randomUUID()}`, q.user, q.world]
    );
  }

  await pool.end();
  console.log(`[seed] worlds=${WORLDS.length} characters=${CHARACTERS.length} demoUser=${DEMO_USER} qaUsers=qa_user,qa_user2`);
};

run().catch((error) => {
  console.error("[seed] failed", error);
  process.exit(1);
});
