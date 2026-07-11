import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DAILY_FRIEND_CAP,
  dailyRareRate,
  effectiveFriendCount,
  friendDailyLevel,
  friendDailyMessage,
  initialScanDistribution,
  pickWeightedByUnseen,
  unseenWeightMultiplier
} from "../src/friendDaily.core.ts";

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

describe("effectiveFriendCount（§6：100人上限）", () => {
  it("0/1/100 はそのまま、101以降は100で頭打ち", () => {
    assert.equal(effectiveFriendCount(0), 0);
    assert.equal(effectiveFriendCount(1), 1);
    assert.equal(effectiveFriendCount(100), 100);
    assert.equal(effectiveFriendCount(101), 100);
    assert.equal(effectiveFriendCount(9999), 100);
    assert.equal(DAILY_FRIEND_CAP, 100);
  });
});

describe("unseenWeightMultiplier（§7：未発見重み ×1.00〜×3.00）", () => {
  const cases: Array<[number, number]> = [
    [0, 1.0],
    [1, 1.02],
    [2, 1.04],
    [3, 1.06],
    [10, 1.2],
    [20, 1.4],
    [30, 1.6],
    [40, 1.8],
    [50, 2.0],
    [60, 2.2],
    [70, 2.4],
    [80, 2.6],
    [90, 2.8],
    [100, 3.0],
    [101, 3.0] // 101人でも×3.00
  ];
  for (const [count, mult] of cases) {
    it(`${count}人 → ×${mult.toFixed(2)}`, () => {
      assert.equal(r2(unseenWeightMultiplier(count)), mult);
    });
  }
});

describe("dailyRareRate（§8：10人ごとに +0.2pt、上限5.0%）", () => {
  const cases: Array<[number, number]> = [
    [0, 0.03],
    [9, 0.03],
    [10, 0.032],
    [19, 0.032],
    [20, 0.034],
    [30, 0.036],
    [40, 0.038],
    [50, 0.04],
    [59, 0.04],
    [60, 0.042],
    [70, 0.044],
    [80, 0.046],
    [90, 0.048],
    [99, 0.048],
    [100, 0.05],
    [101, 0.05] // 101人でも5.0%
  ];
  for (const [count, rate] of cases) {
    it(`${count}人 → rare ${(rate * 100).toFixed(1)}%`, () => {
      assert.equal(r4(dailyRareRate(count)), r4(rate));
    });
  }
});

describe("initialScanDistribution（§8/§9/§13：合計1.0・都道府県0・secret固定）", () => {
  it("0人：normal 96.8 / rare 3.0 / secret 0.2 / prefecture 0", () => {
    const d = initialScanDistribution(0);
    assert.equal(r4(d.rare), 0.03);
    assert.equal(r4(d.secret), 0.002);
    assert.equal(d.prefecture, 0);
    assert.equal(r4(d.normal), 0.968);
    assert.equal(r4(d.normal + d.rare + d.prefecture + d.secret), 1);
  });
  it("100人：normal 94.8 / rare 5.0 / secret 0.2 / prefecture 0（合計1.0）", () => {
    const d = initialScanDistribution(100);
    assert.equal(r4(d.rare), 0.05);
    assert.equal(r4(d.secret), 0.002);
    assert.equal(d.prefecture, 0);
    assert.equal(r4(d.normal), 0.948);
    assert.equal(r4(d.normal + d.rare + d.prefecture + d.secret), 1);
  });
  it("どの人数でも合計1.0を維持", () => {
    for (const c of [0, 5, 10, 33, 55, 99, 100, 150]) {
      const d = initialScanDistribution(c);
      assert.equal(r4(d.normal + d.rare + d.prefecture + d.secret), 1);
    }
  });
});

describe("pickWeightedByUnseen（§7.1：未発見に重み補正）", () => {
  it("候補が空なら null", () => {
    assert.equal(pickWeightedByUnseen([], () => true, 3, 0.5), null);
  });
  it("0人（×1.00）：未発見5/発見済15 → 未発見率25%（roll<0.25で未発見）", () => {
    // 未発見に0..4、発見済に5..19 を並べ、境界を検証。
    const items = Array.from({ length: 20 }, (_, i) => i);
    const isUnseen = (i: number) => i < 5;
    // roll=0.24 は未発見側（5/20=0.25の直前）
    assert.equal(isUnseen(pickWeightedByUnseen(items, isUnseen, 1.0, 0.24)!), true);
    // roll=0.26 は発見済側
    assert.equal(isUnseen(pickWeightedByUnseen(items, isUnseen, 1.0, 0.26)!), false);
  });
  it("100人（×3.00）：未発見5/発見済15 → 未発見率50%（roll<0.5で未発見）", () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const isUnseen = (i: number) => i < 5;
    // 未発見重み 5×3=15, 発見済重み 15 → 15/30=50%
    assert.equal(isUnseen(pickWeightedByUnseen(items, isUnseen, 3.0, 0.49)!), true);
    assert.equal(isUnseen(pickWeightedByUnseen(items, isUnseen, 3.0, 0.51)!), false);
  });
});

describe("friendDailyLevel / message（§11/§12：数値・secret非表示）", () => {
  it("6段階に分類される", () => {
    assert.equal(friendDailyLevel(0), 0);
    assert.equal(friendDailyLevel(1), 1);
    assert.equal(friendDailyLevel(9), 1);
    assert.equal(friendDailyLevel(10), 2);
    assert.equal(friendDailyLevel(30), 3);
    assert.equal(friendDailyLevel(60), 4);
    assert.equal(friendDailyLevel(100), 5);
    assert.equal(friendDailyLevel(200), 5);
  });
  it("文言に secret/シークレット/数値%を含めない", () => {
    for (let lv = 0 as const, i = 0; i <= 5; i++) {
      const msg = friendDailyMessage(i as 0 | 1 | 2 | 3 | 4 | 5);
      assert.ok(!/secret/i.test(msg));
      assert.ok(!msg.includes("シークレット"));
      assert.ok(!/[0-9]%/.test(msg));
      void lv;
    }
  });
});
