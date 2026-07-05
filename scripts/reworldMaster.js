/**
 * キャラクター原本（character_master.json）に realmGroup / worldGroup を付与し直す一回限りの変換。
 * 併せて人が閲覧・編集しやすい character_master.csv を出力する。
 *
 * 分類方針（初回リリース＝生物領域）:
 *   - 動物シート … 鳥/コウモリ=sky、水生/両生/水辺=waterside、それ以外の陸生=ground
 *   - 魚シート   … すべて waterside
 *   - 虫シート   … すべて bug
 *   - 植物/恐竜/宇宙シート … 将来枠（realmGroup/worldGroup は空のまま保留）
 *   - レアシート … 対応ワールドへ割当（生物レア=生物4ワールド、宇宙=planet、幻想=phantom）
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const jsonPath = path.join(root, "assets", "characters", "character_master.json");
const csvPath = path.join(root, "assets", "characters", "character_master.csv");

// 動物シートのうち sky / waterside に入れる英名。残りは ground。
const SKY = new Set([
  "Cockatoo", "Crane", "Crow", "Eagle", "Flamingo", "Hawk", "Ostrich", "Owl",
  "Parakeet", "Peacock", "Pigeon", "Sparrow", "Swallow", "Swan", "Bat"
]);
const WATERSIDE = new Set([
  "Beaver", "Capybara", "Crocodile", "Dolphin", "Frog", "Hippopotamus", "Newt", "Otter",
  "Sea Otter", "Seal", "Penguin", "Platypus", "Salamander", "Turtle", "Walrus", "Whale"
]);

const animalWorld = (en) => (SKY.has(en) ? "sky" : WATERSIDE.has(en) ? "waterside" : "ground");

// レア英名 → worldGroup。無いものは日本語名で判定し、既定は phantom。
const RARE_WORLD_GROUP = {
  "Sea Dragon": "waterside", Megalodon: "waterside", Coelacanth: "waterside",
  "Megamouth Shark": "waterside", Kraken: "waterside", Nessie: "waterside", Merlion: "waterside",
  "Phantom Insect": "bug", "Kesaran Pasaran": "bug",
  "White Tiger": "ground", Fenrir: "ground", Yeti: "ground", Tsuchinoko: "ground", "Underground Dweller": "ground",
  Alien: "planet", Robot: "planet",
  Dragon: "phantom", Phoenix: "phantom", Ghost: "phantom", Sphinx: "phantom", Moai: "phantom"
};
const RARE_WORLD_GROUP_JA = {
  妖精: "phantom", 小人: "phantom", エルフ: "phantom", ユニコーン: "phantom", グリフォン: "phantom", ペガサス: "phantom"
};

const realmOfWorld = (world) => {
  if (world === "planet" || world === "constellation") return "space";
  if (world === "bc" || world === "jomon" || world === "heisei") return "history";
  if (world === "atom" || world === "virus") return "micro";
  if (world === "staple_food" || world === "dessert") return "food";
  if (!world) return "";
  return "life";
};

const m = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

for (const row of m["動物"] || []) {
  row.worldGroup = animalWorld((row.speciesEn || "").trim());
  row.realmGroup = "life";
}
for (const row of m["魚"] || []) {
  row.worldGroup = "waterside";
  row.realmGroup = "life";
}
for (const row of m["虫"] || []) {
  row.worldGroup = "bug";
  row.realmGroup = "life";
}
for (const sheet of ["植物", "恐竜", "宇宙"]) {
  for (const row of m[sheet] || []) {
    row.worldGroup = "";
    row.realmGroup = "";
  }
}
for (const row of m["レア"] || []) {
  const en = (row.speciesEn || "").trim();
  const ja = (row.speciesJa || "").trim();
  const wg = RARE_WORLD_GROUP[en] || RARE_WORLD_GROUP_JA[ja] || "phantom";
  row.worldGroup = wg;
  row.realmGroup = realmOfWorld(wg);
  row.rarity = "rare";
}

fs.writeFileSync(jsonPath, JSON.stringify(m, null, 2), "utf8");

// ---- CSV 出力（人が閲覧・編集しやすい原本） ----
const header = ["sheet", "no", "name", "speciesJa", "speciesEn", "realmGroup", "worldGroup", "rarity", "status"];
const esc = (v) => {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const lines = [header.join(",")];
let count = 0;
for (const sheet of ["動物", "魚", "虫", "植物", "恐竜", "宇宙", "レア"]) {
  for (const r of m[sheet] || []) {
    lines.push(
      [sheet, r.no, r.name, r.speciesJa, r.speciesEn, r.realmGroup || "", r.worldGroup || "", r.rarity || (sheet === "レア" ? "rare" : "normal"), r.status || ""]
        .map(esc)
        .join(",")
    );
    count += 1;
  }
}
fs.writeFileSync(csvPath, lines.join("\n"), "utf8");

// サマリー
const byWorld = {};
for (const r of m["動物"] || []) byWorld[r.worldGroup] = (byWorld[r.worldGroup] || 0) + 1;
console.log("reworld done. rows:", count);
console.log("  動物 worldGroup:", JSON.stringify(byWorld));
console.log("  魚→waterside:", (m["魚"] || []).length, " 虫→bug:", (m["虫"] || []).length);
