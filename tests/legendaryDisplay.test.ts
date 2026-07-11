import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATALOG_LEGENDARIES, CATALOG_NORMALS, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";
import { discoveryTitle } from "../src/services/discoveryTitle.core.ts";
import { characterRarityLabel, rarityBadgeLabel } from "../src/services/rarityLabel.core.ts";
import type { CharacterRarity } from "../src/types/habitat.ts";

describe("レアリティラベル（legendaryを正式表示・段3）", () => {
  it("characterRarityLabel に legendary=「伝説」がある（normalへ丸めない）", () => {
    assert.equal(characterRarityLabel.legendary, "伝説");
    assert.equal(characterRarityLabel.normal, "通常");
    assert.equal(characterRarityLabel.rare, "レア");
    assert.notEqual(characterRarityLabel.legendary, characterRarityLabel.normal);
  });

  it("CharacterRarity 型が legendary を受け入れる", () => {
    const r: CharacterRarity = "legendary";
    assert.equal(r, "legendary");
  });

  it("rarityBadgeLabel(legendary)=「伝説」・secretは「特別」でシークレットと書かない", () => {
    assert.equal(rarityBadgeLabel("legendary"), "伝説");
    assert.equal(rarityBadgeLabel("secret"), "特別");
    assert.ok(!rarityBadgeLabel("secret").includes("シークレット"));
  });

  it("discoveryTitle(legendary)=「伝説の発見！」（normalの『発見！』へ丸めない）", () => {
    const t = discoveryTitle("legendary");
    assert.equal(t.title, "伝説の発見！");
    assert.notEqual(t.title, discoveryTitle("normal").title);
  });
});

describe("catalog は normal/rare/legendary を分離してエクスポート（gen:catalog対応）", () => {
  it("3つの配列が存在する", () => {
    assert.ok(Array.isArray(CATALOG_NORMALS));
    assert.ok(Array.isArray(CATALOG_RARES));
    assert.ok(Array.isArray(CATALOG_LEGENDARIES));
  });
});
