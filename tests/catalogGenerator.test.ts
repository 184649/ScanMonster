import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// 生成ロジックの純粋部分（scripts/catalogBuild.js）を実フォルダに対して検証する。
import { buildCatalog } from "../scripts/catalogBuild.js";

let tmpRoot = "";
let charactersDir = "";

const writePng = (p: string) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, "");
};

before(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "worldawn-catalog-"));
  charactersDir = path.join(tmpRoot, "assets", "characters");
  // 正式構造: <world>/normal|rare|legendary/<英名>.png
  writePng(path.join(charactersDir, "ground", "normal", "dog.png"));
  writePng(path.join(charactersDir, "ground", "rare", "albino_crow.png"));
  writePng(path.join(charactersDir, "ground", "legendary", "dragon.png"));
  // 旧構造（後方互換）: <world>/<英名>/<英名>.png
  writePng(path.join(charactersDir, "sky", "Eagle", "Eagle.png"));
});

after(() => {
  if (tmpRoot) fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("gen:catalog（scripts/catalogBuild）", () => {
  const master = {
    ground: [
      { no: 1, speciesEn: "Dog", name: "イヌ", rarity: "normal" },
      { no: 1, speciesEn: "Albino Crow", name: "白変種カラス", rarity: "rare" },
      { no: 1, speciesEn: "Dragon", name: "ドラゴン", rarity: "legendary" }
    ],
    sky: [{ no: 1, speciesEn: "Eagle", name: "ワシ", rarity: "normal" }]
  };

  it("normal/rare/legendary を分離して生成する（CATALOG_LEGENDARIES 自動生成）", () => {
    const { characters, rares, legendaries } = buildCatalog({ root: tmpRoot, charactersDir, master });
    assert.equal(legendaries.length, 1);
    assert.equal(legendaries[0]!.id, "ground_legendary_dragon");
    assert.equal(legendaries[0]!.speciesEn, "Dragon");
    assert.ok(characters.some((c: { id: string }) => c.id === "ground_dog"));
    assert.ok(rares.some((r: { id: string }) => r.id === "ground_rare_albino_crow"));
  });

  it("world/legendary のアセットを解決できる（hasImage=true）", () => {
    const { legendaries, rares } = buildCatalog({ root: tmpRoot, charactersDir, master });
    assert.equal(legendaries[0]!.hasImage, true); // ground/legendary/dragon.png を解決
    assert.equal(rares[0]!.hasImage, true); // ground/rare/albino_crow.png を解決
  });

  it("旧構造 <world>/<英名>/<英名>.png も後方互換で解決できる", () => {
    const { characters } = buildCatalog({ root: tmpRoot, charactersDir, master });
    const eagle = characters.find((c: { id: string }) => c.id === "sky_eagle");
    assert.ok(eagle);
    assert.equal(eagle!.hasImage, true);
  });

  it("画像が無い伝説でも枠は生成される（hasImage=false）", () => {
    const { legendaries } = buildCatalog({
      root: tmpRoot,
      charactersDir,
      master: { water: [{ no: 1, speciesEn: "Kraken", name: "クラーケン", rarity: "legendary" }] }
    });
    assert.equal(legendaries.length, 1);
    assert.equal(legendaries[0]!.hasImage, false);
  });
});
