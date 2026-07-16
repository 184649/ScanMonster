import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

import { buildCatalog, loadClassification } from "../scripts/catalogBuild.js";
import { SEED_CHARACTERS } from "../server/src/characterSeed.generated.ts";
import { CATALOG_CHARACTERS, CATALOG_LEGENDARIES, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";

/**
 * Phase 0.75：White Tiger の rarity 正式統一（rare）と、Character.xlsx の構造保全の回帰テスト。
 * White Tiger は実在の白変個体のため legendary にしない。ID は永久不変。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "assets", "characters");
const xlsxPath = path.join(charactersDir, "Character.xlsx");
const WT = "ground_rare_white_tiger";

const master = JSON.parse(fs.readFileSync(path.join(charactersDir, "character_master.json"), "utf8")) as Record<
  string,
  Array<{ id: string; speciesEn: string; rarity: string }>
>;
const classification = loadClassification(charactersDir) as { rarity: Record<string, string> };
const built = buildCatalog({ root, charactersDir, master, classification }) as {
  characters: Array<{ id: string; worldGroup: string }>;
  rares: Array<{ id: string }>;
  legendaries: Array<{ id: string }>;
};

const wb = XLSX.readFile(xlsxPath);
const WORLD_SHEETS = ["ground", "waterside", "sky", "bug", "phantom", "planet"];
const OFFICIAL_SHEETS = [...WORLD_SHEETS, "master_prompt", "unresolved"];

const sheetRows = (name: string) => XLSX.utils.sheet_to_json(wb.Sheets[name]!, { header: 1, defval: "" }) as unknown[][];
const colIndex = (name: string, header: string) => {
  const hdr = (sheetRows(name)[0] || []).map((c) => String(c ?? "").trim().toLowerCase());
  return hdr.indexOf(header.toLowerCase());
};

describe("Phase 0.75: White Tiger は全データソースで rare", () => {
  it("Character.xlsx の rarity が rare（ID は ground_rare_white_tiger）", () => {
    const rows = sheetRows("ground");
    const iId = colIndex("ground", "id");
    const iRar = colIndex("ground", "rarity");
    const iEn = colIndex("ground", "英名");
    const hit = rows.slice(1).find((r) => String(r[iId] ?? "").trim() === WT);
    assert.ok(hit, "Excel に White Tiger 行が無い");
    assert.equal(String(hit![iRar]).trim().toLowerCase(), "rare", "Excel の rarity が rare でない");
    assert.equal(String(hit![iEn]).trim(), "White Tiger");
  });

  it("classification override が rare", () => {
    assert.equal(classification.rarity[WT], "rare");
  });

  it("master の rarity が rare", () => {
    const row = master.ground.find((r) => r.id === WT);
    assert.ok(row, "master に White Tiger が無い");
    assert.equal(row!.rarity, "rare");
  });

  it("effective rarity が rare（rare 配列に1件だけ・normal/legendary には入らない）", () => {
    assert.ok(!built.characters.some((c) => c.id === WT), "normal 配列に入っている");
    assert.equal(built.rares.filter((c) => c.id === WT).length, 1, "rare 配列に1件だけ入っていない");
    assert.ok(!built.legendaries.some((c) => c.id === WT), "legendary 配列に入っている");
  });

  it("app catalog / server seed の rarity が rare", () => {
    assert.ok(!CATALOG_CHARACTERS.some((c) => c.id === WT));
    assert.equal(CATALOG_RARES.filter((c) => c.id === WT).length, 1);
    assert.ok(!CATALOG_LEGENDARIES.some((c) => c.id === WT));
    const seeds = SEED_CHARACTERS.filter((s) => s.id === WT);
    assert.equal(seeds.length, 1);
    assert.equal(seeds[0]!.rarity, "rare");
    assert.equal(seeds[0]!.world, "ground");
  });

  it("ID は不変で、rarity 由来の新 ID を生成していない", () => {
    const allIds = new Set(Object.values(master).flat().map((r) => r.id));
    assert.ok(allIds.has(WT), "既存 ID が失われた");
    assert.ok(!allIds.has("ground_white_tiger"), "ground_white_tiger が生成された");
    assert.ok(!allIds.has("ground_legendary_white_tiger"), "ground_legendary_white_tiger が生成された");
  });
});

describe("Phase 0.75: legendary 解放条件が変化していない", () => {
  it("ground の normal 完成対象が 69 件（White Tiger は rare なので数えない）", () => {
    const groundNormals = SEED_CHARACTERS.filter((s) => s.world === "ground" && s.rarity === "normal");
    assert.equal(groundNormals.length, 69);
    assert.ok(!groundNormals.some((s) => s.id === WT), "White Tiger が normal 完成対象に含まれている");
  });

  it("初期 rarity 構成が normal 84 / rare 1 / legendary 4", () => {
    const by: Record<string, number> = {};
    for (const s of SEED_CHARACTERS) by[s.rarity] = (by[s.rarity] ?? 0) + 1;
    assert.equal(by.normal, 84);
    assert.equal(by.rare, 1);
    assert.equal(by.legendary, 4);
    assert.equal(SEED_CHARACTERS.length, 89);
  });

  it("初期 world 構成が ground 74 / sky 15", () => {
    const by: Record<string, number> = {};
    for (const s of SEED_CHARACTERS) by[s.world] = (by[s.world] ?? 0) + 1;
    assert.deepEqual(by, { ground: 74, sky: 15 });
  });
});

describe("Phase 0.75: Character.xlsx の構造保全", () => {
  it("正式8シートが期待の順序で存在する", () => {
    assert.deepEqual(wb.SheetNames, OFFICIAL_SHEETS);
  });

  it("正式6シートに id 列があり、id / 英名 / rarity に空欄が無い", () => {
    for (const w of WORLD_SHEETS) {
      const iId = colIndex(w, "id");
      const iEn = colIndex(w, "英名");
      const iRar = colIndex(w, "rarity");
      assert.ok(iId >= 0, `${w}: id 列が無い`);
      for (const [n, r] of sheetRows(w).slice(1).entries()) {
        const id = String(r[iId] ?? "").trim();
        const en = String(r[iEn] ?? "").trim();
        if (!id && !en) continue;
        assert.ok(id, `${w} 行${n + 2}: id 空欄`);
        assert.ok(en, `${w} 行${n + 2}: 英名 空欄`);
        assert.ok(String(r[iRar] ?? "").trim(), `${w} 行${n + 2}: rarity 空欄`);
      }
    }
  });

  it("正式6シートに legend が残っていない（正は normal/rare/legendary/secret）", () => {
    const valid = new Set(["normal", "rare", "legendary", "secret"]);
    for (const w of WORLD_SHEETS) {
      const iRar = colIndex(w, "rarity");
      for (const [n, r] of sheetRows(w).slice(1).entries()) {
        const rar = String(r[iRar] ?? "").trim().toLowerCase();
        if (!rar) continue;
        assert.notEqual(rar, "legend", `${w} 行${n + 2}: legend が残っている`);
        assert.ok(valid.has(rar), `${w} 行${n + 2}: rarity 不正 "${rar}"`);
      }
    }
  });

  it("正式6シートの合計が 461 件で ID 重複が無い", () => {
    const ids: string[] = [];
    for (const w of WORLD_SHEETS) {
      const iId = colIndex(w, "id");
      for (const r of sheetRows(w).slice(1)) {
        const id = String(r[iId] ?? "").trim();
        if (id) ids.push(id);
      }
    }
    assert.equal(ids.length, 461);
    assert.equal(new Set(ids).size, 461, "ID が重複している");
  });

  it("master_prompt の内容が維持されている", () => {
    const rows = sheetRows("master_prompt");
    assert.ok(rows.length >= 1, "master_prompt が空");
    assert.ok(rows.flat().some((v) => String(v ?? "").trim().length > 0), "master_prompt に内容が無い");
  });

  it("unresolved に麒麟行と管理列が維持されている", () => {
    const rows = sheetRows("unresolved");
    const hdr = (rows[0] || []).map((c) => String(c ?? "").trim());
    for (const col of ["originalSheet", "originalExcelRow", "unresolvedReason"]) {
      assert.ok(hdr.includes(col), `unresolved に ${col} 列が無い`);
    }
    const body = rows.slice(1);
    assert.equal(body.length, 1, "unresolved の行数が想定外");
    const row = body[0]!;
    assert.ok(row.some((v) => String(v ?? "").includes("麒麟")), "麒麟の和名が失われた");
    assert.equal(String(row[hdr.indexOf("originalSheet")]).trim(), "ground");
    assert.equal(String(row[hdr.indexOf("originalExcelRow")]).trim(), "76");
    assert.match(String(row[hdr.indexOf("unresolvedReason")]), /和名だけでは対象を確定できず/);
  });

  it("unresolved / master_prompt は master へ取り込まれない", () => {
    assert.deepEqual(Object.keys(master).sort(), [...WORLD_SHEETS].sort());
  });
});
