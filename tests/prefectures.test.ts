import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getPrefectureName, PREFECTURES, resolvePrefectureCode } from "../src/data/prefectures.ts";

describe("prefectures", () => {
  it("47都道府県、コードは01〜47で一意", () => {
    assert.equal(PREFECTURES.length, 47);
    const codes = new Set(PREFECTURES.map((p) => p.code));
    assert.equal(codes.size, 47);
    assert.ok(codes.has("01") && codes.has("47"));
  });

  it("日本語名・ローマ字・reverseGeocode文字列から都道府県を判定", () => {
    assert.deepEqual(resolvePrefectureCode("福島県"), { code: "07", name: "福島県" });
    assert.deepEqual(resolvePrefectureCode("福島"), { code: "07", name: "福島県" });
    assert.deepEqual(resolvePrefectureCode("Fukushima"), { code: "07", name: "福島県" });
    assert.deepEqual(resolvePrefectureCode("福島県 福島市 ..."), { code: "07", name: "福島県" });
    assert.equal(resolvePrefectureCode("東京都")?.code, "13");
    assert.equal(resolvePrefectureCode("Tokyo")?.code, "13");
    assert.equal(resolvePrefectureCode("Okinawa")?.code, "47");
  });

  it("判定できない/空は null", () => {
    assert.equal(resolvePrefectureCode("California"), null);
    assert.equal(resolvePrefectureCode(""), null);
    assert.equal(resolvePrefectureCode(undefined), null);
  });

  it("コードから名称", () => {
    assert.equal(getPrefectureName("07"), "福島県");
    assert.equal(getPrefectureName("13"), "東京都");
    assert.equal(getPrefectureName("99"), undefined);
  });
});
