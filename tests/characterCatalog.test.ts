import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATALOG_CHARACTERS, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";

const INITIAL_WORLD_GROUPS = ["ground", "waterside", "sky", "bug"];
const VALID_REALMS = new Set(["life", "space", "history", "micro", "food"]);

describe("characterCatalog (generated)", () => {
  it("通常キャラが存在し、ID は全体で一意", () => {
    assert.ok(CATALOG_CHARACTERS.length > 100, `chars=${CATALOG_CHARACTERS.length}`);
    const ids = new Set<string>();
    for (const c of [...CATALOG_CHARACTERS, ...CATALOG_RARES]) {
      assert.ok(!ids.has(c.id), `duplicate id: ${c.id}`);
      ids.add(c.id);
    }
  });

  it("全キャラ・全レアに worldGroup と有効な realmGroup が付く", () => {
    for (const c of CATALOG_CHARACTERS) {
      assert.ok(c.worldGroup.length > 0, `char ${c.id} missing worldGroup`);
      assert.ok(VALID_REALMS.has(c.realmGroup), `char ${c.id} bad realmGroup ${c.realmGroup}`);
      assert.ok(c.speciesEn.length > 0, `char ${c.id} missing speciesEn`);
    }
    for (const r of CATALOG_RARES) {
      assert.ok(r.worldGroup.length > 0, `rare ${r.id} missing worldGroup`);
      assert.ok(VALID_REALMS.has(r.realmGroup), `rare ${r.id} bad realmGroup ${r.realmGroup}`);
    }
  });

  it("初回リリースの4ワールドに通常キャラが割り当てられている", () => {
    for (const w of INITIAL_WORLD_GROUPS) {
      const chars = CATALOG_CHARACTERS.filter((c) => c.worldGroup === w);
      assert.ok(chars.length > 0, `world ${w} has no character`);
    }
    // 画像付き通常キャラが存在する（地上/水辺/空 は画像実装済みがある）
    const withImage = CATALOG_CHARACTERS.filter((c) => c.hasImage);
    assert.ok(withImage.length > 0, "no image-ready character");
  });

  it("hasImage フラグは boolean で一貫している", () => {
    for (const c of [...CATALOG_CHARACTERS, ...CATALOG_RARES]) {
      assert.equal(typeof c.hasImage, "boolean", `char ${c.id} hasImage not boolean`);
    }
  });
});
