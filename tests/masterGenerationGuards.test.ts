import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCatalog, loadClassification } from "../scripts/catalogBuild.js";
import { collectGenerationErrors, EXPECTED_INITIAL_COUNT } from "../scripts/masterGuards.js";
import { SEED_CHARACTERS } from "../server/src/characterSeed.generated.ts";
import { CATALOG_CHARACTERS, CATALOG_LEGENDARIES, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";

/**
 * Phase 0：生成前ガードと初期89体固定の回帰テスト。
 * 初期リリース集合は classification.releaseStatus.byId で明示固定され、Excel への追記で自動 initial にならない。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "assets", "characters");
const master = JSON.parse(fs.readFileSync(path.join(charactersDir, "character_master.json"), "utf8"));
const classification = loadClassification(charactersDir) as {
  rarity: Record<string, string>;
  releaseStatus: { worldDefault: Record<string, string>; byId: Record<string, string> };
};

const build = (m: unknown, c: unknown) =>
  buildCatalog({ root, charactersDir, master: m, classification: c }) as {
    characters: Array<{ id: string; releaseStatus: string; hasImage: boolean; worldGroup: string }>;
    rares: Array<{ id: string; releaseStatus: string; hasImage: boolean }>;
    legendaries: Array<{ id: string; releaseStatus: string; hasImage: boolean }>;
    missingInitialAssets: Array<{ id: string }>;
  };

const allOf = (b: ReturnType<typeof build>) => [...b.characters, ...b.rares, ...b.legendaries];
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe("初期リリース89体の固定", () => {
  it("現在の initial ID 集合が server seed の89件と完全一致する", () => {
    const built = build(master, classification);
    const initial = allOf(built).filter((c) => c.releaseStatus === "initial").map((c) => c.id).sort();
    const seedIds = [...new Set(SEED_CHARACTERS.map((s) => s.id))].sort();
    assert.equal(initial.length, EXPECTED_INITIAL_COUNT);
    assert.equal(seedIds.length, EXPECTED_INITIAL_COUNT);
    assert.deepEqual(initial, seedIds, "initial ID 集合が seed と一致しない");
  });

  it("initial は byId で明示され、worldDefault は全て future（自動 initial を作らない）", () => {
    const byInitial = Object.entries(classification.releaseStatus.byId).filter(([, v]) => v === "initial");
    assert.equal(byInitial.length, EXPECTED_INITIAL_COUNT);
    for (const [world, def] of Object.entries(classification.releaseStatus.worldDefault)) {
      assert.equal(def, "future", `${world} の worldDefault が future でない`);
    }
  });

  it("Excel に新しい ground / sky 行を足しても自動で initial にならない", () => {
    const m = clone(master);
    m.ground.push({ id: "ground_testbeastground", no: 9001, name: "テスト", speciesJa: "テスト獣", speciesEn: "TestBeastGround", rarity: "normal", status: "", description: "" });
    m.sky.push({ id: "sky_testbirdsky", no: 9002, name: "テスト", speciesJa: "テスト鳥", speciesEn: "TestBirdSky", rarity: "normal", status: "", description: "" });
    const built = build(m, classification);
    const all = allOf(built);
    assert.equal(all.find((c) => c.id === "ground_testbeastground")?.releaseStatus, "future");
    assert.equal(all.find((c) => c.id === "sky_testbirdsky")?.releaseStatus, "future");
    assert.equal(all.filter((c) => c.releaseStatus === "initial").length, EXPECTED_INITIAL_COUNT, "initial 件数が増えた");
  });

  it("initial は画像不足でも future へ降格しない（missing として検出される）", () => {
    const m = clone(master);
    // 既存 initial の英名を実在しない画像名へ差し替え、hasImage=false を作る
    const target = m.ground.find((r: { speciesEn: string }) => r.speciesEn === "Alpaca");
    assert.ok(target, "前提: ground に Alpaca が存在する");
    const c2 = clone(classification);
    c2.releaseStatus.byId["ground_nonexistentimage"] = "initial";
    m.ground.push({ id: "ground_nonexistentimage", no: 9003, name: "画像なし", speciesJa: "画像なし", speciesEn: "NonExistentImage", rarity: "normal", status: "", description: "" });
    const built = build(m, c2);
    const entry = allOf(built).find((c) => c.id === "ground_nonexistentimage");
    assert.ok(entry, "追加したエントリーが見つからない");
    assert.equal(entry!.releaseStatus, "initial", "画像が無いことで future へ降格している");
    assert.equal(entry!.hasImage, false);
    assert.ok(built.missingInitialAssets.some((x) => x.id === "ground_nonexistentimage"), "missing として検出されていない");
  });
});

describe("生成前ガード（gen:catalog / gen:seed 共通）", () => {
  it("現状のマスターと分類ではエラーが無い", () => {
    const built = build(master, classification);
    assert.deepEqual(collectGenerationErrors({ master, classification, built }), []);
  });

  it("master_prompt が world として混入したら失敗する", () => {
    const m = { ...clone(master), master_prompt: [] };
    const built = build(m, classification);
    const errors = collectGenerationErrors({ master: m, classification, built });
    assert.ok(errors.some((e) => /不正な world/.test(e) && /master_prompt/.test(e)), errors.join(" / "));
  });

  it("空欄 rarity があれば失敗する", () => {
    const m = clone(master);
    m.ground.push({ id: "ground_kirinblank", no: 9004, name: "", speciesJa: "麒麟", speciesEn: "KirinBlank", rarity: "", status: "", description: "" });
    const built = build(m, classification);
    assert.ok(collectGenerationErrors({ master: m, classification, built }).some((e) => /空欄 rarity/.test(e)));
  });

  it("未知の rarity があれば失敗する", () => {
    const m = clone(master);
    m.ground.push({ id: "ground_unknownraritybeast", no: 9005, name: "", speciesJa: "謎", speciesEn: "UnknownRarityBeast", rarity: "epic", status: "", description: "" });
    const built = build(m, classification);
    assert.ok(collectGenerationErrors({ master: m, classification, built }).some((e) => /未知の rarity/.test(e)));
  });

  it("initial 件数が89から変化したら失敗する", () => {
    const c2 = clone(classification);
    delete c2.releaseStatus.byId[Object.keys(c2.releaseStatus.byId)[0]!];
    const built = build(master, c2);
    assert.ok(
      collectGenerationErrors({ master, classification: c2, built }).some((e) => /initial が 88 件/.test(e)),
      "件数変動を検出できていない"
    );
  });

  it("initial 指定なのにマスターへ存在しない ID があれば失敗する（ID 変化の検出）", () => {
    const c2 = clone(classification);
    c2.releaseStatus.byId["ground_legendary_fenrir"] = "initial"; // 現行 ID は ground_rare_fenrir
    const built = build(master, c2);
    assert.ok(
      collectGenerationErrors({ master, classification: c2, built }).some((e) => /マスターに存在しません/.test(e)),
      "存在しない initial ID を検出できていない"
    );
  });

  it("legendary が normal へ潰れたら失敗する（rarity 潰れの検出）", () => {
    const legId = "ground_rare_fenrir";
    assert.equal(classification.rarity[legId], "legendary", "前提: Fenrir は classification で legendary 指定");
    // export のバグ等で master の rarity が normal へ潰れ、かつ override も失われた状態を模す
    const m = clone(master);
    const fenrir = m.ground.find((r: { id: string }) => r.id === legId);
    assert.ok(fenrir, "前提: master に ground_rare_fenrir がある");
    fenrir.rarity = "normal";
    const c2 = clone(classification);
    delete c2.rarity[legId];
    const built = build(m, c2);
    assert.ok(built.characters.some((c) => c.id === legId), "前提: normal バケットへ落ちている");
    // 正本（legendary 指定あり）で検証すると潰れが検出される
    const errors = collectGenerationErrors({ master: m, classification, built });
    assert.ok(
      errors.some((e) => e.includes(legId) && /normal へ変換/.test(e)),
      `legendary の normal 潰れを検出できていない: ${errors.join(" / ")}`
    );
  });

  it("master の rarity=legendary は legendary バケットへ入る（ID は rarity から作らない）", () => {
    const m = clone(master);
    m.ground.push({ id: "ground_testdragonlegend", no: 9006, name: "テスト竜", speciesJa: "テスト竜", speciesEn: "TestDragonLegend", rarity: "legendary", status: "", description: "" });
    const built = build(m, classification);
    assert.ok(built.legendaries.some((c) => c.id === "ground_testdragonlegend"), "legendary バケットに入っていない");
    // ID は Excel 由来のまま。rarity 由来の prefix が付与されていないこと。
    assert.ok(!allOf(built).some((c) => c.id === "ground_legendary_testdragonlegend"), "rarity 由来の ID が生成された");
  });

  it("初期89体の rarity 構成が変わったら失敗する（legendary 解放条件の保護）", () => {
    // Phase 0.75 で Excel/master も rare になったため、override を外しても構成は変わらない（＝二重に保護されている）。
    const c2 = clone(classification);
    delete c2.rarity["ground_rare_white_tiger"];
    const stillSafe = build(master, c2);
    assert.ok(stillSafe.rares.some((c) => c.id === "ground_rare_white_tiger"), "master 側の rare が効いていない");
    assert.deepEqual(
      collectGenerationErrors({ master, classification: c2, built: stillSafe }).filter((e) => /rarity 構成が変化/.test(e)),
      [],
      "master が rare なら構成は変わらないはず"
    );

    // master 側まで normal へ戻した場合は normal 85 / rare 0 となり、ガードが発火する。
    const m = clone(master);
    const wt = m.ground.find((r: { id: string }) => r.id === "ground_rare_white_tiger");
    assert.ok(wt, "前提: master に White Tiger がある");
    wt.rarity = "normal";
    const built = build(m, c2);
    const errors = collectGenerationErrors({ master: m, classification: c2, built });
    assert.ok(errors.some((e) => /rarity 構成が変化/.test(e)), `構成変化を検出できていない: ${errors.join(" / ")}`);
  });
});

describe("Phase 0.5: character ID の恒久固定（rarity 非依存）", () => {
  it("master の全エントリーが Excel 由来の明示 id を持つ", () => {
    for (const [world, rows] of Object.entries(master as Record<string, Array<{ id?: string; speciesEn: string }>>)) {
      for (const r of rows) {
        assert.ok(r.id && String(r.id).trim().length > 0, `${world}/${r.speciesEn} に id が無い`);
        assert.match(String(r.id), /^[a-z0-9]+(?:_[a-z0-9]+)*$/, `${r.id} が ID 形式でない`);
      }
    }
  });

  it("rarity が legendary でも既存 ID は ground_rare_* のまま（ID 内の rare は rarity を意味しない）", () => {
    const built = build(master, classification);
    const byId = new Map(allOf(built).map((c) => [c.id, c]));
    for (const id of ["ground_rare_fenrir", "ground_rare_tsuchinoko", "ground_rare_yeti", "ground_rare_underground_dweller"]) {
      assert.ok(byId.has(id), `${id} が存在しない（ID が変わった）`);
      assert.ok(built.legendaries.some((c) => c.id === id), `${id} が legendary でない`);
    }
  });

  it("rarity 由来で作り直した ID は生成されない", () => {
    const built = build(master, classification);
    const ids = new Set(allOf(built).map((c) => c.id));
    for (const bad of ["ground_legendary_fenrir", "ground_legendary_tsuchinoko", "ground_legendary_yeti", "ground_legendary_underground_dweller"]) {
      assert.ok(!ids.has(bad), `${bad} が生成された`);
    }
  });

  it("旧 ID と新 ID の二重登録が無い（ID 重複ゼロ）", () => {
    const built = build(master, classification);
    const ids = allOf(built).map((c) => c.id);
    assert.equal(ids.length, new Set(ids).size, "ID が重複している");
  });

  it("確定 rarity: Megalodon/Megamouth Shark は rare、8件は legendary", () => {
    const built = build(master, classification);
    const rareIds = new Set(built.rares.map((c) => c.id));
    const legIds = new Set(built.legendaries.map((c) => c.id));
    for (const id of ["waterside_rare_megalodon", "waterside_rare_megamouth_shark"]) {
      assert.ok(rareIds.has(id), `${id} が rare でない`);
      assert.ok(!legIds.has(id), `${id} が legendary に誤分類`);
    }
    for (const id of [
      "ground_rare_fenrir", "ground_rare_tsuchinoko", "ground_rare_underground_dweller", "ground_rare_yeti",
      "waterside_rare_kraken", "waterside_rare_sea_dragon", "waterside_rare_nessie", "waterside_rare_merlion"
    ]) {
      assert.ok(legIds.has(id), `${id} が legendary でない`);
    }
  });

  it("正式6シート由来の master に legend は残っていない", () => {
    for (const rows of Object.values(master as Record<string, Array<{ rarity: string }>>)) {
      for (const r of rows) assert.notEqual(String(r.rarity).toLowerCase(), "legend");
    }
  });

  it("classification が参照する ID は全て master に存在する", () => {
    const built = build(master, classification);
    const ids = new Set(allOf(built).map((c) => c.id));
    for (const id of Object.keys(classification.rarity)) assert.ok(ids.has(id), `classification.rarity の ${id} が master に無い`);
    for (const id of Object.keys(classification.releaseStatus.byId)) assert.ok(ids.has(id), `byId の ${id} が master に無い`);
  });

  it("画像 manifest の initial ID 集合が catalog と一致する", () => {
    const catIds = [...CATALOG_CHARACTERS.map((c) => c.id), ...CATALOG_RARES.map((c) => c.id), ...CATALOG_LEGENDARIES.map((c) => c.id)].sort();
    const img = fs.readFileSync(path.join(root, "src", "assets", "characterImages.generated.ts"), "utf8");
    const sec = img.slice(img.indexOf("export const CHARACTER_IMAGES"), img.indexOf("};", img.indexOf("export const CHARACTER_IMAGES")));
    const imgIds = [...sec.matchAll(/"([^"]+)":\s*require/g)].map((m) => m[1]!).sort();
    assert.deepEqual(imgIds, catIds, "画像 manifest と catalog の ID 集合が不一致");
  });
});

describe("公式経路の ID 形式（旧 family:/rare: フォールバックを新規保存しない）", () => {
  it("catalog / seed の ID は全て catalog 形式で、family: / rare: 接頭辞を含まない", () => {
    const ids = [
      ...CATALOG_CHARACTERS.map((c) => c.id),
      ...CATALOG_RARES.map((c) => c.id),
      ...CATALOG_LEGENDARIES.map((c) => c.id),
      ...SEED_CHARACTERS.map((s) => s.id)
    ];
    assert.equal(ids.length > 0, true);
    for (const id of ids) {
      assert.ok(!id.startsWith("family:"), `${id} が family: 形式`);
      assert.ok(!id.startsWith("rare:"), `${id} が rare: 形式`);
      assert.match(id, /^(ground|sky|waterside|bug|phantom|planet)_/, `${id} が catalog ID 形式でない`);
    }
  });

  it("正式スキャン経路は catalog ID を characterId に入れる（ローカル経路・サーバー経路とも）", () => {
    // src/data/characters.ts は拡張子なし import を含み node --test から読めないため、配線をソースで検証する。
    const store = fs.readFileSync(path.join(root, "src", "stores", "monsterStore.ts"), "utf8");
    // ローカル経路：catalog から引いた character の id をそのまま characterId にする
    assert.match(store, /const characterId = catalogChar\s*\?\s*catalogChar\.id/, "ローカル経路が catalog ID を使っていない");
    // サーバー経路：サーバー確定の characterId をそのまま使い、画像キーにも使う
    assert.match(store, /characterId:\s*dto\.characterId/, "サーバー経路が dto.characterId を使っていない");
    assert.match(store, /imageKey:\s*dto\.characterId/, "画像キーが characterId でない");
  });

  it("旧 family:/rare: フォールバック実装は削除されていない（既存データの後方互換）", () => {
    const src = fs.readFileSync(path.join(root, "src", "data", "characters.ts"), "utf8");
    assert.match(src, /getCharacterIdForFamily/, "旧 family: フォールバックが削除された");
    assert.match(src, /getCharacterIdForRare/, "旧 rare: フォールバックが削除された");
    // characterId があればそれを優先する（＝新規はカタログID、旧データのみフォールバック）
    assert.match(src, /monster\.characterId\s*\?\?/, "characterId 優先の分岐が失われた");
  });
});
