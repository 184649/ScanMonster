import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { discoveryTitle } from "../src/services/discoveryTitle.core.ts";

describe("discoveryTitle（§3.3 見出し文言）", () => {
  it("通常は「発見！」", () => {
    assert.equal(discoveryTitle("normal").title, "発見！");
    assert.equal(discoveryTitle(undefined).title, "発見！");
  });

  it("rare は「珍しい発見！」", () => {
    assert.equal(discoveryTitle("rare").title, "珍しい発見！");
  });

  it("prefecture は「都道府県キャラ発見！」＋県名", () => {
    const t = discoveryTitle("prefecture", "福島県");
    assert.equal(t.title, "都道府県キャラ発見！");
    assert.equal(t.subtitle, "福島県のキャラと出会いました");
  });

  it("secret は『未知の出現！』で、secret/シークレットを含めない", () => {
    const t = discoveryTitle("secret");
    assert.equal(t.title, "未知の出現！");
    for (const rarity of ["normal", "rare", "prefecture", "secret"]) {
      const x = discoveryTitle(rarity, "東京都");
      assert.ok(!/secret/i.test(x.title + x.subtitle));
      assert.ok(!x.title.includes("シークレット") && !x.subtitle.includes("シークレット"));
    }
  });
});
