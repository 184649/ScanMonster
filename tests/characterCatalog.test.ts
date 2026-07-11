import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATALOG_CHARACTERS, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";

const VALID_REALMS = new Set(["life", "space", "history", "micro", "food"]);

// app catalog は「初期リリース(releaseStatus=initial)」のみを持つ（future/inactive/qa/secret は出さない）。
describe("characterCatalog (generated / initial-only)", () => {
  it("通常キャラが存在し、ID は全体で一意", () => {
    assert.ok(CATALOG_CHARACTERS.length > 50, `chars=${CATALOG_CHARACTERS.length}`);
    const ids = new Set<string>();
    for (const c of [...CATALOG_CHARACTERS, ...CATALOG_RARES]) {
      assert.ok(!ids.has(c.id), `duplicate id: ${c.id}`);
      ids.add(c.id);
    }
  });

  it("catalog は全て releaseStatus=initial かつ hasImage（initial⟹画像あり）", () => {
    for (const c of CATALOG_CHARACTERS) {
      assert.equal(c.releaseStatus, "initial", `char ${c.id} not initial`);
      assert.ok(c.hasImage, `initial char ${c.id} は画像必須`);
    }
    for (const r of CATALOG_RARES) assert.equal(r.releaseStatus, "initial");
  });

  it("全キャラ・全レアに worldGroup と有効な realmGroup が付く", () => {
    for (const c of CATALOG_CHARACTERS) {
      assert.ok(c.worldGroup.length > 0, `char ${c.id} missing worldGroup`);
      assert.ok(VALID_REALMS.has(c.realmGroup), `char ${c.id} bad realmGroup ${c.realmGroup}`);
      assert.ok(c.speciesEn.length > 0, `char ${c.id} missing speciesEn`);
    }
  });

  it("初期リリース対象ワールド（地上・空）に通常キャラが割り当てられている", () => {
    for (const w of ["ground", "sky"]) {
      assert.ok(CATALOG_CHARACTERS.some((c) => c.worldGroup === w), `world ${w} has no character`);
    }
    // waterside/bug は現状 future（初期 catalog に出さない）。
    assert.ok(!CATALOG_CHARACTERS.some((c) => c.worldGroup === "bug"), "bug は future（catalog非表示）");
  });

  it("hasImage フラグは boolean で一貫している", () => {
    for (const c of [...CATALOG_CHARACTERS, ...CATALOG_RARES]) {
      assert.equal(typeof c.hasImage, "boolean", `char ${c.id} hasImage not boolean`);
    }
  });
});
