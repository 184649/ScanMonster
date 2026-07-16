/**
 * Character.xlsx（各シート＝worldGroup）から character_master.json と character_master.csv を出力する。
 * 運用: Character.xlsx を編集 → `npm run export:master` → `npm run gen:catalog`。
 *
 * 安全設計（Phase 0 / 0.5）:
 *  - 対象シートは WORLD_SHEETS の6枚だけ（master_prompt・unresolved 等は絶対に取り込まない）。
 *  - **character ID は Excel の id 列だけを正とする（Phase 0.5）。rarity から ID を再計算しない。**
 *    ID は rarity / releaseStatus / 画像フォルダ / 表示名が変わっても不変の永久識別子。
 *    ID 内の "rare" "legendary" 等の文字列は、現在の rarity を意味しない（歴史的経緯の一部）。
 *  - rarity は normal|rare|legendary|secret のみ正。`legend` は後方互換入力としてのみ legendary へ正規化する。
 *    **空欄・未知の値を normal へ自動変換しない**（1件でもあれば処理全体を失敗させ、既存生成物を維持する）。
 *  - 出力は原子的（全検証成功後に一時ファイルから差し替え）。失敗時は既存ファイルを一切変更しない。
 *
 * 列: no / キャラ名(name) / 和名(speciesJa) / 英名(speciesEn) / id / rarity / 作成状況(status) / 説明(description)。
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

/** マスターへ取り込む対象シート（＝worldGroup）。これ以外のシートは無視する。 */
const WORLD_SHEETS = ["ground", "waterside", "sky", "bug", "phantom", "planet"];

/** rarity の正規値。 */
const VALID_RARITIES = ["normal", "rare", "legendary", "secret"];
/** 後方互換エイリアス（旧表記 → 正規値）。 */
const RARITY_ALIASES = { legend: "legendary" };

const realmOf = (w) => {
  if (["ground", "waterside", "sky", "bug", "scale", "phantom"].includes(w)) return "life";
  if (["planet", "constellation"].includes(w)) return "space";
  if (["bc", "jomon", "heisei"].includes(w)) return "history";
  if (["atom", "virus"].includes(w)) return "micro";
  if (["staple_food", "dessert"].includes(w)) return "food";
  return "";
};

/** catalogBuild.js と同一の slug 規則（ID算出を一致させるため）。 */
const slug = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

/**
 * 【旧・廃止】rarity から ID を組み立てる規則。**正式IDの決定には使用しない**（Phase 0.5）。
 * rarity 変更で ID が変わってしまうため廃止した。検証・比較・テスト目的でのみ残す。
 */
const idFor = (worldGroup, rarity, speciesEn) => {
  const prefix = rarity === "legendary" ? `${worldGroup}_legendary` : rarity === "rare" ? `${worldGroup}_rare` : worldGroup;
  return `${prefix}_${slug(speciesEn)}`;
};

/** 正式IDの許可形式（既存IDを壊さない範囲。実物の327IDが全て適合することを確認済み）。 */
const ID_PATTERN = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;

/**
 * Excel の id 列の値を検証する（再計算はしない）。
 * @returns {{ok:true, value:string} | {ok:false, reason:string, input:string}}
 */
const validateId = (raw) => {
  const input = raw === undefined || raw === null ? "" : String(raw);
  if (input.length === 0) return { ok: false, reason: "id が空欄です", input };
  if (input !== input.trim()) return { ok: false, reason: "id の前後に空白があります", input };
  if (input !== input.toLowerCase()) return { ok: false, reason: "id に大文字が含まれています", input };
  if (!ID_PATTERN.test(input)) return { ok: false, reason: `id に許可外の文字が含まれています（許可形式: ${ID_PATTERN}）`, input };
  return { ok: true, value: input };
};

/**
 * rarity を正規化する。**空欄・未知の値は normal にせず失敗**させる。
 * @returns {{ok:true, value:string} | {ok:false, reason:string, input:string}}
 */
const normalizeRarity = (raw) => {
  const input = raw === undefined || raw === null ? "" : String(raw);
  const s = input.trim().toLowerCase();
  if (s.length === 0) return { ok: false, reason: "rarity が空欄です", input };
  const value = RARITY_ALIASES[s] ?? s;
  if (!VALID_RARITIES.includes(value)) {
    return { ok: false, reason: `未知の rarity です（正: ${VALID_RARITIES.join(" / ")}）`, input };
  }
  return { ok: true, value };
};

const HEADER_ALIASES = {
  no: ["no"],
  name: ["キャラ名", "name"],
  speciesJa: ["和名", "speciesja"],
  speciesEn: ["英名", "speciesen"],
  id: ["id"],
  rarity: ["rarity", "レア"],
  status: ["作成状況", "status"],
  description: ["説明", "description"]
};

const buildHeaderIndex = (headerRow) => {
  const idx = {};
  const cells = (headerRow || []).map((c) => String(c ?? "").trim().toLowerCase());
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    idx[key] = cells.findIndex((c) => aliases.includes(c));
  }
  return idx;
};

const cellAt = (row, i) => (i >= 0 && row[i] !== undefined && row[i] !== null ? String(row[i]).trim() : "");

/**
 * Workbook からマスターを構築し、検証エラーを収集する（副作用なし・テスト可能）。
 * @returns {{master:object, errors:Array<object>}}
 */
const buildMasterFromWorkbook = (wb) => {
  const errors = [];
  const master = {};

  const missingSheets = WORLD_SHEETS.filter((s) => !wb.SheetNames.includes(s));
  if (missingSheets.length > 0) {
    errors.push({
      sheet: missingSheets.join(", "),
      excelRow: "-",
      id: "-",
      speciesEn: "-",
      rarity: "-",
      reason: `対象シートが存在しません: ${missingSheets.join(", ")}（必要な6シート: ${WORLD_SHEETS.join(", ")}）`
    });
    return { master, errors };
  }

  const seenIds = new Map();

  for (const worldGroup of WORLD_SHEETS) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[worldGroup], { header: 1, defval: "" });
    const col = buildHeaderIndex(rows[0]);
    const out = [];

    if (col.id < 0) {
      errors.push({
        sheet: worldGroup,
        excelRow: 1,
        id: "-",
        speciesEn: "-",
        rarity: "-",
        reason: "id 列がありません（character ID は Excel の id 列が正本です）"
      });
      continue;
    }

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const excelRow = i + 1; // 1始まり・ヘッダが1行目
      const name = cellAt(row, col.name);
      const speciesJa = cellAt(row, col.speciesJa);
      const speciesEn = cellAt(row, col.speciesEn);
      const rawId = cellAt(row, col.id);
      const rawRarity = cellAt(row, col.rarity);

      // 完全な空行はスキップ（意味のあるセルが1つも無い行）。
      const meaningful = [name, speciesJa, speciesEn, rawId, rawRarity].some((v) => v.length > 0);
      if (!meaningful) continue;

      const push = (reason) => errors.push({ sheet: worldGroup, excelRow, id: rawId || "(空)", speciesEn: speciesEn || "(空)", rarity: rawRarity, reason });

      // ID は Excel の値のみ。**rarity から再計算しない**。
      const idResult = validateId(rawId);
      if (!idResult.ok) { push(idResult.reason); continue; }
      if (!speciesEn) { push("英名(speciesEn)が空です"); continue; }

      const rarityResult = normalizeRarity(rawRarity);
      if (!rarityResult.ok) { push(rarityResult.reason); continue; }

      const id = idResult.value;
      if (seenIds.has(id)) {
        const prev = seenIds.get(id);
        push(`ID が重複します（先行: ${prev.sheet} 行${prev.excelRow} ${prev.speciesEn}）`);
        continue;
      }
      seenIds.set(id, { sheet: worldGroup, excelRow, speciesEn });

      out.push({
        id,
        no: Number(cellAt(row, col.no)) || out.length + 1,
        name,
        speciesJa,
        speciesEn,
        rarity: rarityResult.value,
        status: cellAt(row, col.status),
        description: cellAt(row, col.description)
      });
    }

    master[worldGroup] = out;
  }

  return { master, errors };
};

const toCsv = (master) => {
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["worldGroup", "realmGroup", "id", "no", "name", "speciesJa", "speciesEn", "rarity", "status", "description"];
  const lines = [header.join(",")];
  let count = 0;
  for (const [wg, rows] of Object.entries(master)) {
    for (const r of rows) {
      lines.push([wg, realmOf(wg), r.id, r.no, r.name, r.speciesJa, r.speciesEn, r.rarity, r.status, r.description].map(esc).join(","));
      count += 1;
    }
  }
  return { csv: lines.join("\n"), count };
};

/** 一時ファイルへ書いてから rename（原子的差し替え）。 */
const writeAtomic = (targetPath, content) => {
  const tmp = `${targetPath}.tmp`;
  fs.writeFileSync(tmp, content, "utf8");
  fs.renameSync(tmp, targetPath);
};

const main = () => {
  if (!fs.existsSync(xlsxPath)) {
    console.error(`Character.xlsx が見つかりません: ${path.relative(root, xlsxPath)}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(xlsxPath);
  const { master, errors } = buildMasterFromWorkbook(wb);

  if (errors.length > 0) {
    console.error(`\n[export:master] 中止：${errors.length} 件の不正データがあります。既存の生成物は変更していません。`);
    console.error("シート | Excel行 | ID | 英名 | 入力rarity | 理由");
    for (const e of errors) {
      console.error(`  ${e.sheet} | ${e.excelRow} | ${e.id} | ${e.speciesEn} | "${e.rarity}" | ${e.reason}`);
    }
    console.error("\n※ rarity の正: normal / rare / legendary / secret（legend は legendary へ自動変換）。");
    console.error("※ 空欄・未知の値は normal へ自動変換しません。Excel を修正してから再実行してください。");
    process.exit(1);
  }

  const { csv, count } = toCsv(master);
  writeAtomic(jsonPath, JSON.stringify(master, null, 2));
  writeAtomic(csvPath, csv);

  console.log("exported from Character.xlsx →", path.relative(root, jsonPath), "&", path.relative(root, csvPath));
  console.log("worlds:", Object.keys(master).map((w) => `${w}(${master[w].length})`).join(", "), " rows:", count);
};

if (require.main === module) {
  main();
}

module.exports = {
  WORLD_SHEETS,
  ID_PATTERN,
  validateId,
  VALID_RARITIES,
  RARITY_ALIASES,
  normalizeRarity,
  idFor,
  slug,
  buildMasterFromWorkbook,
  toCsv,
  writeAtomic
};
