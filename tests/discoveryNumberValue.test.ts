import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCharacterNumberBadge,
  collectNumberTags,
  formatDiscoveryNo,
  judgeNumberValueRank,
  numberValueLabel
} from "../src/services/numberValue.core.ts";

describe("numberValue.core", () => {
  it("番号価値ランク（仕様 §16 の例）", () => {
    assert.equal(judgeNumberValueRank("1"), "legend"); // No.001
    assert.equal(judgeNumberValueRank("7"), "legend"); // No.007
    assert.equal(judgeNumberValueRank("77"), "premium"); // No.077
    assert.equal(judgeNumberValueRank("111"), "rare"); // No.111
    assert.equal(judgeNumberValueRank("100"), "rare"); // No.100
    assert.equal(judgeNumberValueRank("1000"), "premium"); // No.1000
    assert.equal(judgeNumberValueRank("1234"), "premium"); // No.1234
    assert.equal(judgeNumberValueRank("2026"), "legend"); // 年号
    assert.equal(judgeNumberValueRank("1523"), "normal"); // 通常番号
  });

  it("前ゼロは無視して判定する", () => {
    assert.equal(judgeNumberValueRank("007"), "legend");
    assert.equal(judgeNumberValueRank("0100"), "rare");
  });

  it("番号タグの収集", () => {
    assert.ok(collectNumberTags("222").includes("repdigit"));
    assert.ok(collectNumberTags("777").includes("lucky7"));
    assert.ok(collectNumberTags("777").includes("repdigit"));
    assert.ok(collectNumberTags("123").includes("sequential"));
    assert.ok(collectNumberTags("321").includes("reverse_sequential"));
    assert.ok(collectNumberTags("121").includes("palindrome"));
    assert.ok(collectNumberTags("2026").includes("year"));
    assert.ok(collectNumberTags("100").includes("round"));
    assert.equal(collectNumberTags("1523").length, 0);
  });

  it("ラベルはラッキーセブンを最優先", () => {
    assert.equal(numberValueLabel(collectNumberTags("777")), "ラッキーセブン");
    assert.equal(numberValueLabel(collectNumberTags("222")), "ゾロ目");
    assert.equal(numberValueLabel(collectNumberTags("121")), "ミラー番号");
    assert.equal(numberValueLabel([]), "通常番号");
  });

  it("バッジ組み立て（BIGINT 相当は string のまま）", () => {
    const badge = buildCharacterNumberBadge("777");
    assert.equal(badge.numberScope, "character");
    assert.equal(badge.number, "777");
    assert.equal(badge.valueRank, "premium");
    assert.equal(badge.label, "ラッキーセブン");
  });

  it("表示は No.007 のようにゼロ埋め（Number 変換しない）", () => {
    assert.equal(formatDiscoveryNo("7"), "No.007");
    assert.equal(formatDiscoveryNo("1000"), "No.1000");
    // 巨大値も文字列で扱える。
    assert.equal(formatDiscoveryNo("109500000000000"), "No.109500000000000");
  });
});
