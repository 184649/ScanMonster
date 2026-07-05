/**
 * Character.xlsx（各シート＝worldGroup）から character_master.json と character_master.csv を出力する。
 * 運用: Character.xlsx を編集 → `npm run export:master` → `npm run gen:catalog`。
 *
 * xlsx シート名＝worldGroup（英語キー: ground/waterside/sky/bug/…）。
 * 列: no / キャラ名(name) / 和名(speciesJa) / 英名(speciesEn) / rarity(normal|rare) / 作成状況(status) / 説明(description)。
 * 画像フォルダ: assets/characters/<worldGroup>/<英名>/<英名>.png（通常・レア共通）。
 */
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

const root = path.join(__dirname, "..");
const charDir = path.join(root, "assets", "characters");
const xlsxPath = path.join(charDir, "Character.xlsx");
const jsonPath = path.join(charDir, "character_master.json");
const csvPath = path.join(charDir, "character_master.csv");

const realmOf = (w) => {
  if (["ground", "waterside", "sky", "bug", "scale", "phantom"].includes(w)) return "life";
  if (["planet", "constellation"].includes(w)) return "space";
  if (["bc", "jomon", "heisei"].includes(w)) return "history";
  if (["atom", "virus"].includes(w)) return "micro";
  if (["staple_food", "dessert"].includes(w)) return "food";
  return "";
};

const pick = (row, keys) => {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).length > 0) return String(row[k]).trim();
  }
  return "";
};

if (!fs.existsSync(xlsxPath)) {
  console.error(`Character.xlsx が見つかりません: ${path.relative(root, xlsxPath)}`);
  process.exit(1);
}

const wb = XLSX.readFile(xlsxPath);
const master = {};
for (const sheetName of wb.SheetNames) {
  const worldGroup = sheetName.trim();
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: "" });
  master[worldGroup] = rows.map((r, i) => ({
    no: Number(pick(r, ["no", "No"])) || i + 1,
    name: pick(r, ["name", "キャラ名"]),
    speciesJa: pick(r, ["speciesJa", "和名"]),
    speciesEn: pick(r, ["speciesEn", "英名"]),
    rarity: (pick(r, ["rarity", "レア"]) || "normal").toLowerCase() === "rare" ? "rare" : "normal",
    status: pick(r, ["status", "作成状況"]),
    description: pick(r, ["description", "説明"])
  }));
}

fs.writeFileSync(jsonPath, JSON.stringify(master, null, 2), "utf8");

const esc = (v) => {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const header = ["worldGroup", "realmGroup", "no", "name", "speciesJa", "speciesEn", "rarity", "status", "description"];
const lines = [header.join(",")];
let count = 0;
for (const [wg, rows] of Object.entries(master)) {
  for (const r of rows) {
    lines.push([wg, realmOf(wg), r.no, r.name, r.speciesJa, r.speciesEn, r.rarity, r.status, r.description].map(esc).join(","));
    count += 1;
  }
}
fs.writeFileSync(csvPath, lines.join("\n"), "utf8");

console.log("exported from Character.xlsx →", path.relative(root, jsonPath), "&", path.relative(root, csvPath));
console.log("worlds:", Object.keys(master).map((w) => `${w}(${master[w].length})`).join(", "), " rows:", count);
