import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getCharacterMemoForSpecies } from "../src/data/characterMemos.ts";

describe("characterMemos", () => {
  it("Badger（アナグマル）はアナグマのモチーフ説明を返す", () => {
    const memo = getCharacterMemoForSpecies("Badger");
    assert.ok(memo);
    assert.ok(memo!.includes("アナグマ"));
  });

  it("speciesEn は大小文字を無視して引ける", () => {
    assert.equal(getCharacterMemoForSpecies("badger"), getCharacterMemoForSpecies("BADGER"));
    assert.ok(getCharacterMemoForSpecies("  Fox  ")?.includes("キツネ"));
  });

  it("未登録・未指定は undefined", () => {
    assert.equal(getCharacterMemoForSpecies("Unicorn"), undefined);
    assert.equal(getCharacterMemoForSpecies(undefined), undefined);
  });
});
