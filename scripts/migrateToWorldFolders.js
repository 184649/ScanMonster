/**
 * 一回限りの移行スクリプト：旧「動物/魚/虫/レア」構成を worldGroup（ground/waterside/sky/bug…）構成へ統一する。
 *
 *  - 画像フォルダを assets/characters/<worldGroup>/<英名>/<英名>.png へ移動
 *      通常: assets/characters/{動物|魚|虫}/<英名>/  →  <worldGroup>/<英名>/
 *      レア: ルートの Rare_<英名>.png              →  <worldGroup>/<英名>/<英名>.png
 *  - character_master.json を worldGroup キーへ再編（各シート＝ワールド、行に rarity 列）
 *  - character_master.csv と Character.xlsx（ワールド別シート）を出力
 *
 * 以後の運用: Character.xlsx を編集 → `npm run export:master`（xlsx→json/csv）→ `npm run gen:catalog`。
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.join(__dirname, "..");
const charDir = path.join(root, "assets", "characters");
const masterPath = path.join(charDir, "character_master.json");
const csvPath = path.join(charDir, "character_master.csv");
const xlsxPath = path.join(charDir, "Character.xlsx");

const OLD_SHEET_DIR = { 動物: "動物", 魚: "魚", 虫: "虫" };
// ワールドの並び順（初回リリース4つを先頭、将来ワールドは後ろ）。
const WORLD_ORDER = ["ground", "waterside", "sky", "bug", "phantom", "planet", "constellation", "scale", "bc", "jomon", "heisei", "atom", "virus", "staple_food", "dessert"];

const realmOf = (w) => {
  if (["ground", "waterside", "sky", "bug", "scale", "phantom"].includes(w)) return "life";
  if (["planet", "constellation"].includes(w)) return "space";
  if (["bc", "jomon", "heisei"].includes(w)) return "history";
  if (["atom", "virus"].includes(w)) return "micro";
  if (["staple_food", "dessert"].includes(w)) return "food";
  return "";
};

const normKey = (v) => String(v || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const master = JSON.parse(fs.readFileSync(masterPath, "utf8"));

// ---- 1. 旧データを worldGroup 別に集約（rarity 付き） ----
const worlds = {}; // worldGroup -> [rows]
const pushRow = (row, rarity, oldSheetJa) => {
  const wg = (row.worldGroup || "").trim();
  if (!wg) return; // 未割当（植物/恐竜/宇宙 など）は今回のワールド構成外＝スキップ
  (worlds[wg] = worlds[wg] || []).push({
    speciesEn: (row.speciesEn || "").trim(),
    speciesJa: (row.speciesJa || "").trim(),
    name: (row.name || "").trim(),
    status: (row.status || "").trim(),
    description: (row.description || "").trim(),
    rarity,
    oldSheetJa // 画像移動元の判定に使う（内部用）
  });
};
for (const [ja, dir] of Object.entries(OLD_SHEET_DIR)) {
  for (const row of master[ja] || []) pushRow(row, "normal", dir);
}
for (const row of master["レア"] || []) pushRow(row, "rare", null);

// ---- 2. 画像フォルダの移動 ----
let moved = 0;
const moveDir = (from, to) => {
  if (!fs.existsSync(from) || !fs.statSync(from).isDirectory()) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (fs.existsSync(to)) return false; // 既に移動済み
  fs.renameSync(from, to);
  return true;
};
const findRootRare = (en) => {
  const want = normKey(`rare${en}`);
  const f = fs.readdirSync(charDir).find((x) => /^rare/i.test(x) && /\.png$/i.test(x) && normKey(x.replace(/\.png$/i, "")) === want);
  return f ? path.join(charDir, f) : null;
};

for (const [wg, rows] of Object.entries(worlds)) {
  for (const r of rows) {
    if (!r.speciesEn) continue;
    const destDir = path.join(charDir, wg, r.speciesEn);
    if (r.rarity === "normal" && r.oldSheetJa) {
      const from = path.join(charDir, r.oldSheetJa, r.speciesEn);
      if (moveDir(from, destDir)) moved++;
    } else if (r.rarity === "rare") {
      const src = findRootRare(r.speciesEn);
      if (src && !fs.existsSync(path.join(destDir, `${r.speciesEn}.png`))) {
        fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(src, path.join(destDir, `${r.speciesEn}.png`));
        moved++;
      }
    }
  }
}

// ---- 3. 新 character_master.json（worldGroup キー・ワールド順・No再採番） ----
const orderedWorlds = Object.keys(worlds).sort((a, b) => {
  const ia = WORLD_ORDER.indexOf(a), ib = WORLD_ORDER.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});
const newMaster = {};
for (const wg of orderedWorlds) {
  const rows = worlds[wg];
  const normals = rows.filter((r) => r.rarity !== "rare");
  const rares = rows.filter((r) => r.rarity === "rare");
  const emit = (arr) =>
    arr.map((r, i) => ({
      no: i + 1,
      name: r.name || r.speciesEn,
      speciesJa: r.speciesJa,
      speciesEn: r.speciesEn,
      rarity: r.rarity,
      status: r.status,
      description: r.description
    }));
  newMaster[wg] = [...emit(normals), ...emit(rares)];
}
fs.writeFileSync(masterPath, JSON.stringify(newMaster, null, 2), "utf8");

// ---- 4. CSV 出力 ----
const esc = (v) => {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const header = ["worldGroup", "realmGroup", "no", "name", "speciesJa", "speciesEn", "rarity", "status", "description"];
const lines = [header.join(",")];
for (const wg of orderedWorlds) {
  for (const r of newMaster[wg]) {
    lines.push([wg, realmOf(wg), r.no, r.name, r.speciesJa, r.speciesEn, r.rarity, r.status, r.description].map(esc).join(","));
  }
}
fs.writeFileSync(csvPath, lines.join("\n"), "utf8");

// ---- 5. Character.xlsx（ワールド別シート） ----
const wb = XLSX.utils.book_new();
for (const wg of orderedWorlds) {
  const rows = newMaster[wg].map((r) => ({
    no: r.no,
    "キャラ名": r.name,
    "和名": r.speciesJa,
    "英名": r.speciesEn,
    rarity: r.rarity,
    "作成状況": r.status,
    "説明": r.description
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, wg); // シート名＝worldGroup（英語キー）
}
XLSX.writeFile(wb, xlsxPath);

// ---- 6. 旧・空フォルダの掃除 ----
for (const dir of ["動物", "魚", "虫"]) {
  const p = path.join(charDir, dir);
  if (fs.existsSync(p)) {
    const rest = fs.readdirSync(p);
    if (rest.length === 0) fs.rmdirSync(p);
    else console.warn(`  残置(空でない): ${dir} (${rest.length}件)`);
  }
}

console.log("migrated images:", moved);
console.log("worlds:", orderedWorlds.map((w) => `${w}(${newMaster[w].length})`).join(", "));
