import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { buildCatalog, loadClassification } from "../scripts/catalogBuild.js";
import { SEED_CHARACTERS } from "../server/src/characterSeed.generated.ts";
import { CATALOG_CHARACTERS, CATALOG_LEGENDARIES, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";

/**
 * Phase 1A：実在生物図鑑イラストのパイロット準備の回帰テスト。
 * パイロットは正式アセットから完全に分離され、master / catalog / seed / initial へ一切影響しない。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "assets", "characters");
const pilot = JSON.parse(fs.readFileSync(path.join(charactersDir, "phase1-pilot.json"), "utf8")) as {
  phase: string;
  status: string;
  scoreThreshold: number;
  selectedCharacters: Array<{
    id: string;
    speciesJa: string;
    speciesEn: string;
    world: string;
    rarity: string;
    officialAssetPath: string;
    pilotOutputPath: string;
    promptPath: string;
    isMandatory: boolean;
    generationStatus: string;
    validationStatus: string;
    score: number | null;
    selectedCandidate: string | null;
    promotedToOfficial: boolean;
  }>;
};
const master = JSON.parse(fs.readFileSync(path.join(charactersDir, "character_master.json"), "utf8")) as Record<
  string,
  Array<{ id: string; speciesEn: string; rarity: string }>
>;
const classification = loadClassification(charactersDir);
const PICKED = pilot.selectedCharacters.map((c) => c.id);
const masterIds = new Set(Object.values(master).flat().map((r) => r.id));
const seedById = new Map(SEED_CHARACTERS.map((s) => [s.id, s]));

describe("Phase 1A: 選定5種", () => {
  it("5種が選定され、Sheep が含まれる", () => {
    assert.equal(pilot.selectedCharacters.length, 5);
    assert.ok(PICKED.includes("ground_sheep"), "Sheep が含まれていない");
    assert.equal(pilot.selectedCharacters.find((c) => c.id === "ground_sheep")!.isMandatory, true);
  });

  it("選定5種はすべて master に存在する", () => {
    for (const id of PICKED) assert.ok(masterIds.has(id), `${id} が master に無い`);
  });

  it("選定5種はすべて初期89 ID に含まれる", () => {
    assert.equal(SEED_CHARACTERS.length, 89);
    for (const id of PICKED) assert.ok(seedById.has(id), `${id} が初期89に含まれない`);
  });

  it("選定5種はすべて ground normal（rare / legendary ではない）", () => {
    for (const id of PICKED) {
      const s = seedById.get(id)!;
      assert.equal(s.world, "ground", `${id} が ground でない`);
      assert.equal(s.rarity, "normal", `${id} が normal でない`);
      assert.ok(!["rare", "legendary", "secret"].includes(s.rarity));
    }
  });

  it("選定5種はすべて releaseStatus=initial 指定", () => {
    const byId = (classification as { releaseStatus: { byId: Record<string, string> } }).releaseStatus.byId;
    for (const id of PICKED) assert.equal(byId[id], "initial", `${id} が initial 指定でない`);
  });

  it("身体構造と素材のカテゴリが重複していない（同じ構造の5種にしない）", () => {
    const anat = pilot.selectedCharacters.map((c) => (c as unknown as { anatomyCategory: string }).anatomyCategory);
    const surf = pilot.selectedCharacters.map((c) => (c as unknown as { surfaceCategory: string }).surfaceCategory);
    assert.equal(new Set(anat).size, 5, "身体構造カテゴリが重複している");
    assert.equal(new Set(surf).size, 5, "素材カテゴリが重複している");
  });
});

describe("Phase 1A: 正式データへ影響しない", () => {
  it("phase1-pilot.json が master へ取り込まれない", () => {
    assert.deepEqual(Object.keys(master).sort(), ["bug", "ground", "phantom", "planet", "sky", "waterside"]);
    assert.ok(!Object.keys(master).some((w) => /pilot|phase1/i.test(w)));
  });

  it("_pilot フォルダが画像 manifest へ取り込まれない", () => {
    const img = fs.readFileSync(path.join(root, "src", "assets", "characterImages.generated.ts"), "utf8");
    assert.ok(!/_pilot/.test(img), "画像 manifest に _pilot が混入している");
  });

  it("_pilot 画像が catalog へ取り込まれない", () => {
    const cat = fs.readFileSync(path.join(root, "src", "data", "characterCatalog.generated.ts"), "utf8");
    assert.ok(!/_pilot|phase1-pilot/.test(cat), "catalog に _pilot が混入している");
  });

  it("_pilot 画像が server seed へ影響しない", () => {
    const seed = fs.readFileSync(path.join(root, "server", "src", "characterSeed.generated.ts"), "utf8");
    assert.ok(!/_pilot|phase1-pilot/.test(seed), "seed に _pilot が混入している");
  });

  it("正式 master 件数が 461 のまま", () => {
    assert.equal(Object.values(master).flat().length, 461);
  });

  it("初期89 ID 集合が変化しない", () => {
    assert.equal(SEED_CHARACTERS.length, 89);
    assert.equal(new Set(SEED_CHARACTERS.map((s) => s.id)).size, 89);
  });

  it("rarity 構成 84 / 1 / 4 が変化しない", () => {
    const by: Record<string, number> = {};
    for (const s of SEED_CHARACTERS) by[s.rarity] = (by[s.rarity] ?? 0) + 1;
    assert.equal(by.normal, 84);
    assert.equal(by.rare, 1);
    assert.equal(by.legendary, 4);
  });

  it("ground normal 完成対象 69 件が変化しない", () => {
    assert.equal(SEED_CHARACTERS.filter((s) => s.world === "ground" && s.rarity === "normal").length, 69);
  });

  it("catalog の rarity 配列がパイロットで変化しない（84 / 1 / 4）", () => {
    assert.equal(CATALOG_CHARACTERS.length, 84);
    assert.equal(CATALOG_RARES.length, 1);
    assert.equal(CATALOG_LEGENDARIES.length, 4);
  });
});

describe("Phase 1A: プロンプト資料", () => {
  const masterPromptPath = path.join(root, "docs", "PHASE1_REAL_CREATURE_ART_PROMPT.md");

  /** 改行コードを正規化して読む（Git の autocrlf で CRLF になるため、改行差でテストを壊さない）。 */
  const readText = (p: string) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

  /** ```で始まるフェンスが偶数個（＝閉じられている）かを確認する。 */
  const fences = (src: string) => (src.match(/^```/gm) || []).length;

  it("選定5種それぞれに prompt ファイルが存在する", () => {
    for (const c of pilot.selectedCharacters) {
      const p = path.join(root, c.promptPath);
      assert.ok(fs.existsSync(p), `${c.id} の prompt ファイルが無い: ${c.promptPath}`);
    }
  });

  it("マスタープロンプトが存在し、1つの連続したコードブロックである", () => {
    assert.ok(fs.existsSync(masterPromptPath));
    const src = readText(masterPromptPath);
    assert.equal(fences(src) % 2, 0, "コードブロックが閉じていない");
    // 画像生成プロンプト本体が1つの連続ブロックに収まっていること
    const blocks = [...src.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]!);
    const promptBlocks = blocks.filter((b) => b.includes("■ 出力仕様"));
    assert.equal(promptBlocks.length, 1, "画像生成プロンプトのブロックが1つではない（分割されている）");
    const b = promptBlocks[0]!;
    for (const need of ["■ 制作対象", "■ 画風", "■ 生物としての扱い", "■ 制作手順", "■ 出力仕様", "最終出力は"]) {
      assert.ok(b.includes(need), `マスタープロンプトに ${need} が無い（途中で切れている）`);
    }
  });

  it("マスタープロンプトが参照画像なしで成立し、必須条件を含む", () => {
    const src = readText(masterPromptPath);
    const b = [...src.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]!).find((x) => x.includes("■ 出力仕様"))!;
    assert.ok(!/参考画像を添付|添付された画像|reference image/i.test(b), "参照画像を前提にしている");
    for (const need of ["4案", "88点", "3巡", "1024", "PNG", "透明背景", "全身"]) {
      assert.ok(b.includes(need), `マスタープロンプトに「${need}」が無い`);
    }
  });

  it("各 prompt ファイルのコードブロックが途中で途切れていない", () => {
    for (const c of pilot.selectedCharacters) {
      const src = readText(path.join(root, c.promptPath));
      assert.equal(fences(src) % 2, 0, `${c.id}: コードブロックが閉じていない`);
      const blocks = [...src.matchAll(/```text\n([\s\S]*?)\n```/g)].map((m) => m[1]!);
      const promptBlocks = blocks.filter((b) => b.includes("■ 出力仕様"));
      assert.equal(promptBlocks.length, 1, `${c.id}: 画像生成プロンプトのブロックが1つではない`);
      const b = promptBlocks[0]!;
      for (const need of ["■ 制作対象", "■ 画風", "■ 制作手順", "■ 出力仕様", "最終出力は"]) {
        assert.ok(b.includes(need), `${c.id}: プロンプトに ${need} が無い`);
      }
      assert.ok(b.includes(c.speciesJa), `${c.id}: プロンプトに和名が無い`);
      assert.ok(b.includes(c.speciesEn), `${c.id}: プロンプトに英名が無い`);
      // 差し替えプレースホルダが残っていない
      assert.ok(!b.includes("【差し替え"), `${c.id}: プレースホルダが残っている`);
    }
  });

  it("個別プロンプトは 5種とも異なる推奨構図を持つ（全員同じポーズにしない）", () => {
    const poses = pilot.selectedCharacters.map((c) => {
      const src = readText(path.join(root, c.promptPath));
      return src.match(/推奨構図:\n(.+)/)![1]!;
    });
    assert.equal(new Set(poses).size, 5, "推奨構図が重複している");
  });
});

describe("Phase 1A: パイロット管理と保存構造", () => {
  it("初期値が正しい（未生成・未検証・未採用）", () => {
    assert.equal(pilot.phase, "phase1");
    assert.equal(pilot.status, "prepared");
    for (const c of pilot.selectedCharacters) {
      assert.equal(c.generationStatus, "not_generated");
      assert.equal(c.validationStatus, "not_validated");
      assert.equal(c.selectedCandidate, null);
      assert.equal(c.promotedToOfficial, false);
      assert.equal(c.score, null);
    }
  });

  it("パイロット保存先が正式アセット領域と分離されている", () => {
    for (const c of pilot.selectedCharacters) {
      assert.match(c.pilotOutputPath, /^assets\/characters\/_pilot\/phase1\//, `${c.id}: _pilot 配下でない`);
      assert.ok(fs.existsSync(path.join(root, c.pilotOutputPath)), `${c.id}: パイロットフォルダが無い`);
      for (const sub of ["candidates", "selected", "reports"]) {
        assert.ok(fs.existsSync(path.join(root, c.pilotOutputPath, sub)), `${c.id}/${sub} が無い`);
      }
      // 正式パスは _pilot の外
      assert.ok(!c.officialAssetPath.includes("_pilot"), `${c.id}: officialAssetPath が _pilot を指している`);
      assert.match(c.officialAssetPath, /^assets\/characters\/ground\//);
    }
  });

  it("_pilot に README があり、正式アセットでないことが明記されている", () => {
    const readme = fs.readFileSync(path.join(root, "assets", "characters", "_pilot", "phase1", "README.md"), "utf8");
    for (const need of ["正式アセットではありません", "catalog", "manifest", "server seed", "昇格手順"]) {
      assert.ok(readme.includes(need), `README に ${need} の記載が無い`);
    }
  });

  it("昇格手順ドキュメントが存在する", () => {
    const p = path.join(root, "docs", "PHASE1_ASSET_PROMOTION.md");
    assert.ok(fs.existsSync(p));
    const src = fs.readFileSync(p, "utf8");
    for (const need of ["validate:phase1-pilot", "88", "validate:release-assets", "ロールバック", "gen:catalog"]) {
      assert.ok(src.includes(need), `昇格手順に ${need} が無い`);
    }
  });
});

describe("Phase 1A: 技術検証スクリプト", () => {
  const runValidator = () =>
    spawnSync(process.execPath, [path.join(root, "scripts", "validatePhase1PilotAssets.js")], { cwd: root, encoding: "utf8" });

  it("selectedCandidate 未指定時は「未生成」として報告し、成功扱いにしない", () => {
    const res = runValidator();
    assert.notEqual(res.status, 0, "画像が無いのに成功扱いになっている");
    assert.equal(res.status, 2, "未生成は exit 2 で報告されるべき");
    assert.match(res.stdout, /未生成/);
    assert.match(res.stdout, /NOT_GENERATED/);
  });

  it("技術検証と視覚評価を分けている（美的評価をファイル検証で合格させない）", () => {
    const src = fs.readFileSync(path.join(root, "scripts", "validatePhase1PilotAssets.js"), "utf8");
    assert.match(src, /技術検証のみ/);
    assert.ok(/evaluation\.json/.test(src), "視覚評価への導線が無い");
  });

  it("検証項目が実装されている（PNG・寸法・IEND・アルファ・重複・誤保存・誤登録）", () => {
    const src = fs.readFileSync(path.join(root, "scripts", "validatePhase1PilotAssets.js"), "utf8");
    for (const need of ["89504e470d0a1a0a", "IEND", "1024", "colorType", "transparentRatio", "opaqueRatio", "sha256", "_pilot", "manifest"]) {
      assert.ok(src.includes(need), `検証スクリプトに ${need} の実装が無い`);
    }
  });

  it("package.json に validate:phase1-pilot がある（依存追加なし）", () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts["validate:phase1-pilot"], "node scripts/validatePhase1PilotAssets.js");
  });
});

describe("Phase 1A: Sheep.png と release gate（隠さない）", () => {
  const sheepPath = path.join(root, "assets", "characters", "ground", "Sheep", "Sheep.png");

  it("Sheep.png を変更していない（HEAD とバイト一致・破損のまま）", () => {
    const cur = crypto.createHash("sha256").update(fs.readFileSync(sheepPath)).digest("hex");
    const head = spawnSync("git", ["show", "HEAD:assets/characters/ground/Sheep/Sheep.png"], {
      cwd: root,
      maxBuffer: 50 * 1024 * 1024,
      encoding: "buffer"
    });
    assert.equal(head.status, 0, "HEAD の Sheep.png を取得できない");
    const headHash = crypto.createHash("sha256").update(head.stdout as Buffer).digest("hex");
    assert.equal(cur, headHash, "Sheep.png が変更されている");
    // 破損（IEND欠損）のままであること
    assert.ok(!fs.readFileSync(sheepPath).includes(Buffer.from("IEND", "ascii")), "破損が解消された場合はこのテストと release gate の期待値を更新すること");
  });

  it("release asset validator が現在も Sheep.png で失敗する（失敗を隠さない）", () => {
    const res = spawnSync(process.execPath, [path.join(root, "scripts", "validateReleaseAssets.js")], { cwd: root, encoding: "utf8" });
    assert.notEqual(res.status, 0, "破損があるのに release gate が成功している");
    assert.match(res.stdout + res.stderr, /ground_sheep/);
    assert.match(res.stdout + res.stderr, /corrupt/i);
  });
});
