/**
 * 開発用シード投入。ワールド／代表キャラ（アプリ catalog と同じ id）／デモユーザー。
 *   npm run db:seed
 *
 * 本番の全キャラは Character.xlsx→character_master から生成した一覧を投入すること
 * （ここは動作確認用の最小セット）。character_id はアプリのローカル画像キーと一致させる。
 */
import { randomUUID } from "node:crypto";

import { getPool } from "./db.ts";

const pool = getPool();

const WORLDS: [string, string, string, number][] = [
  ["ground", "life", "地上ワールド", 1],
  ["waterside", "life", "水辺ワールド", 2],
  ["sky", "life", "空ワールド", 3],
  ["bug", "life", "虫ワールド", 4]
];

// アプリの characterCatalog.generated.ts と同じ id を使う（画像整合のため）。
const CHARACTERS: { id: string; name: string; rarity: string; world: string }[] = [
  { id: "ground_alpaca", name: "モコアルパ", rarity: "normal", world: "ground" },
  { id: "ground_anteater", name: "アリクイノ", rarity: "normal", world: "ground" },
  { id: "ground_armadillo", name: "アルマジロロ", rarity: "normal", world: "ground" },
  { id: "ground_cheetah", name: "チータッシュ", rarity: "normal", world: "ground" },
  { id: "ground_elephant", name: "ゾウガード", rarity: "normal", world: "ground" },
  { id: "ground_fox", name: "コンフォックス", rarity: "normal", world: "ground" },
  { id: "ground_giraffe", name: "キリンター", rarity: "normal", world: "ground" },
  { id: "ground_koala", name: "コアラフ", rarity: "normal", world: "ground" },
  { id: "ground_rare_fenrir", name: "フェンリル", rarity: "rare", world: "ground" },
  { id: "waterside_rare_kraken", name: "クラーケン", rarity: "rare", world: "waterside" }
];

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
    await pool.query(
      `INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex)
       VALUES ($1,$2,$3,$4,TRUE,TRUE)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, rarity = EXCLUDED.rarity, world_group = EXCLUDED.world_group`,
      [c.id, c.name, c.rarity, c.world]
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
