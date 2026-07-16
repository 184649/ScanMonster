import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

import {
  WORLD_SHEETS,
  normalizeRarity,
  buildMasterFromWorkbook,
  idFor,
  validateId
} from "../scripts/exportCharacterMaster.js";

/**
 * Phase 0 / 0.5：マスター生成の安全化（export:master）の回帰テスト。
 * 対象シートのホワイトリスト / rarity 正規化 / 空欄・未知の拒否 / 原子的出力 /
 * **Excel の明示 id 列だけを使い、rarity から ID を再計算しない**ことを検証する。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const HEADER = ["No", "キャラ名", "和名", "英名", "id", "rarity", "作成状況", "説明"];

/** 最小のワークブックを組み立てる（6シート必須）。rows は HEADER と同じ並び。 */
const makeWorkbook = (sheets: Record<string, unknown[][]>) => {
  const wb = XLSX.utils.book_new();
  for (const world of WORLD_SHEETS) {
    const rows = sheets[world] ?? [];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), world);
  }
  // 対象外シートを追加（取り込まれないこと）
  for (const [name, rows] of Object.entries(sheets)) {
    if (WORLD_SHEETS.includes(name)) continue;
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER, ...rows]), name);
  }
  return wb;
};

const row = (no: number, name: string, ja: string, en: string, id: string, rarity: string) => [no, name, ja, en, id, rarity, "", ""];

describe("export:master 対象シートのホワイトリスト", () => {
  it("master_prompt は出力対象にならない", () => {
    const wb = makeWorkbook({
      ground: [row(1, "モコアルパ", "アルパカ", "Alpaca", "ground_alpaca", "normal")],
      master_prompt: [row(1, "テンプレ", "テンプレ", "Template", "ground_template", "normal")]
    });
    const { master, errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 0);
    assert.ok(!Object.keys(master).includes("master_prompt"), "master_prompt が world として取り込まれている");
    assert.deepEqual(Object.keys(master).sort(), [...WORLD_SHEETS].sort());
  });

  it("unresolved は出力対象にならない", () => {
    const wb = makeWorkbook({
      ground: [row(1, "モコアルパ", "アルパカ", "Alpaca", "ground_alpaca", "normal")],
      unresolved: [row(1, "", "麒麟", "", "", "")]
    });
    const { master, errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    assert.ok(!Object.keys(master).includes("unresolved"), "unresolved が world として取り込まれている");
  });

  it("対象6シートが欠けていれば分かりやすいエラーになる", () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([HEADER]), "ground");
    const { errors } = buildMasterFromWorkbook(wb);
    assert.ok(errors.length > 0);
    assert.match(errors[0]!.reason, /対象シートが存在しません/);
  });
});

describe("export:master rarity 正規化", () => {
  it("legend は legendary へ変換される（後方互換入力）", () => {
    assert.deepEqual(normalizeRarity("legend"), { ok: true, value: "legendary" });
    assert.deepEqual(normalizeRarity(" LEGEND "), { ok: true, value: "legendary" });
    const wb = makeWorkbook({ ground: [row(1, "フェンリル", "フェンリル", "Fenrir", "ground_rare_fenrir", "legend")] });
    const { master, errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 0);
    assert.equal(master.ground[0].rarity, "legendary");
  });

  it("legendary はそのまま保持される", () => {
    assert.deepEqual(normalizeRarity("legendary"), { ok: true, value: "legendary" });
    const wb = makeWorkbook({ ground: [row(1, "フェンリル", "フェンリル", "Fenrir", "ground_rare_fenrir", "legendary")] });
    const { master, errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 0);
    assert.equal(master.ground[0].rarity, "legendary");
  });

  it("normal / rare / secret は保持される", () => {
    for (const r of ["normal", "rare", "secret"]) {
      assert.deepEqual(normalizeRarity(r), { ok: true, value: r });
    }
  });

  it("空欄 rarity は normal にせず失敗する", () => {
    for (const v of ["", "   ", null, undefined]) {
      const res = normalizeRarity(v as unknown as string);
      assert.equal(res.ok, false, `${JSON.stringify(v)} が失敗にならない`);
    }
    const wb = makeWorkbook({ ground: [row(1, "", "麒麟", "Kirin", "ground_kirin", "")] });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 1);
    assert.equal(errors[0]!.sheet, "ground");
    assert.equal(errors[0]!.excelRow, 2);
    assert.equal(errors[0]!.speciesEn, "Kirin");
    assert.equal(errors[0]!.rarity, "");
    assert.match(errors[0]!.reason, /空欄/);
  });

  it("未知の rarity / スペルミスは normal にせず失敗する", () => {
    for (const v of ["legendaly", "レア", "ノーマル", "epic", "1"]) {
      assert.equal(normalizeRarity(v).ok, false, `${v} が失敗にならない`);
    }
    const wb = makeWorkbook({ ground: [row(1, "X", "エックス", "Xenon", "ground_xenon", "legendaly")] });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 1);
    assert.equal(errors[0]!.rarity, "legendaly");
    assert.match(errors[0]!.reason, /未知の rarity/);
  });

  it("エラーにはシート名・Excel行番号・ID・英名・入力rarityが含まれる", () => {
    const wb = makeWorkbook({
      ground: [row(1, "A", "あ", "Alpaca", "ground_alpaca", "normal"), row(2, "B", "い", "Bear", "ground_bear", "epic")]
    });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 1);
    const e = errors[0]!;
    assert.equal(e.sheet, "ground");
    assert.equal(e.excelRow, 3); // ヘッダ1行目＋2件目
    assert.equal(e.id, "ground_bear");
    assert.equal(e.speciesEn, "Bear");
    assert.equal(e.rarity, "epic");
  });
});

describe("export:master は Excel の明示 ID だけを使う（rarity 非依存・Phase 0.5）", () => {
  it("Excel の id 列がそのまま master へ出力される", () => {
    const wb = makeWorkbook({ ground: [row(1, "モコアルパ", "アルパカ", "Alpaca", "ground_alpaca", "normal")] });
    const { master, errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 0);
    assert.equal(master.ground[0].id, "ground_alpaca");
  });

  it("rarity を変えても ID は変わらない（ID を再生成しない）", () => {
    const mk = (rarity: string) =>
      buildMasterFromWorkbook(makeWorkbook({ ground: [row(1, "フェンリル", "フェンリル", "Fenrir", "ground_rare_fenrir", rarity)] }));
    const asRare = mk("rare");
    const asLegendary = mk("legendary");
    assert.equal(asRare.errors.length + asLegendary.errors.length, 0);
    // rarity は変わるが ID は不変
    assert.equal(asRare.master.ground[0].rarity, "rare");
    assert.equal(asLegendary.master.ground[0].rarity, "legendary");
    assert.equal(asRare.master.ground[0].id, "ground_rare_fenrir");
    assert.equal(asLegendary.master.ground[0].id, "ground_rare_fenrir", "rarity 変更で ID が再生成された");
    assert.notEqual(asLegendary.master.ground[0].id, "ground_legendary_fenrir");
  });

  it("id 列が無いシートは失敗する", () => {
    const wb = XLSX.utils.book_new();
    for (const w of WORLD_SHEETS) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["No", "キャラ名", "和名", "英名", "rarity", "作成状況", "説明"]]), w);
    }
    const { errors } = buildMasterFromWorkbook(wb);
    assert.ok(errors.some((e) => /id 列がありません/.test(e.reason)));
  });

  it("id 空欄 / 大文字 / 許可外文字 / 前後空白は失敗する", () => {
    assert.equal(validateId("").ok, false);
    assert.equal(validateId(" ground_alpaca").ok, false);
    assert.equal(validateId("Ground_Alpaca").ok, false);
    assert.equal(validateId("ground-alpaca").ok, false);
    assert.equal(validateId("ground_alpaca").ok, true);
    assert.equal(validateId("ground_rare_fenrir").ok, true);
    const wb = makeWorkbook({ ground: [row(1, "A", "あ", "Alpaca", "", "normal")] });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 1);
    assert.match(errors[0]!.reason, /id が空欄/);
  });

  it("ID 重複は失敗になる", () => {
    const wb = makeWorkbook({
      ground: [row(1, "A", "あ", "Alpaca", "ground_alpaca", "normal"), row(2, "B", "い", "Bear", "ground_alpaca", "normal")]
    });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 1);
    assert.match(errors[0]!.reason, /ID が重複/);
  });

  it("英名空欄は失敗する", () => {
    const wb = makeWorkbook({ ground: [row(1, "A", "あ", "", "ground_x", "normal")] });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.equal(errors.length, 1);
    assert.match(errors[0]!.reason, /英名/);
  });

  it("【旧・廃止】rarity 由来の ID 規則は正式 ID 決定に使われない（比較用に残存）", () => {
    assert.equal(idFor("ground", "legendary", "Fenrir"), "ground_legendary_fenrir");
    // しかし export は Excel の id を使うため、この値は master に現れない
    const { master } = buildMasterFromWorkbook(
      makeWorkbook({ ground: [row(1, "フェンリル", "フェンリル", "Fenrir", "ground_rare_fenrir", "legendary")] })
    );
    assert.equal(master.ground[0].id, "ground_rare_fenrir");
  });
});

describe("export:master 原子的出力（実データ）", () => {
  const jsonPath = path.join(root, "assets", "characters", "character_master.json");
  const xlsxPath = path.join(root, "assets", "characters", "Character.xlsx");
  const hash = (p: string) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

  it("正常な実データでは成功し、Character.xlsx を書き換えず、一時ファイルを残さない", () => {
    const beforeXlsx = hash(xlsxPath);
    const res = spawnSync(process.execPath, [path.join(root, "scripts", "exportCharacterMaster.js")], {
      cwd: root,
      encoding: "utf8"
    });
    assert.equal(res.status, 0, `export:master が失敗した: ${res.stdout}${res.stderr}`);
    assert.equal(hash(xlsxPath), beforeXlsx, "export が Character.xlsx を書き換えた（read-only であるべき）");
    assert.ok(!fs.existsSync(`${jsonPath}.tmp`), "character_master.json.tmp が残っている");
    assert.ok(!fs.existsSync(path.join(root, "assets", "characters", "character_master.csv.tmp")), "csv.tmp が残っている");
  });

  it("出力された master の全行に Excel 由来の id がある", () => {
    const master = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Record<string, Array<{ id: string; speciesEn: string }>>;
    assert.deepEqual(Object.keys(master).sort(), [...WORLD_SHEETS].sort(), "master に対象外シートが混入");
    for (const [world, rows] of Object.entries(master)) {
      for (const r of rows) {
        assert.ok(r.id && r.id.length > 0, `${world}/${r.speciesEn} に id が無い`);
      }
    }
  });

  it("検証エラーがある workbook では master を組み立てず、書き込み対象を作らない", () => {
    // 実ファイルを壊さずに、エラー時は errors が返り master が採用されないことを固定する。
    const wb = makeWorkbook({ ground: [row(1, "A", "あ", "Alpaca", "", "normal")] });
    const { errors } = buildMasterFromWorkbook(wb);
    assert.ok(errors.length > 0, "不正データなのにエラーが出ない");
    // main() は errors.length>0 で process.exit(1) するため書き込みへ進まない（原子的出力の前提）。
    const src = fs.readFileSync(path.join(root, "scripts", "exportCharacterMaster.js"), "utf8");
    assert.match(src, /if \(errors\.length > 0\)[\s\S]{0,600}process\.exit\(1\)/, "エラー時に exit する分岐が無い");
    assert.match(src, /const writeAtomic[\s\S]{0,200}renameSync/, "原子的差し替え(rename)が無い");
  });
});
