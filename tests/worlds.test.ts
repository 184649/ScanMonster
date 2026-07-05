import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  decrementWorldBoostAfterValidScan,
  getNextWorldUnlockCost,
  getWorldRates,
  normalizeWorldGroups
} from "../src/data/worlds.ts";
import type { WorldBoost } from "../src/types/worlds.ts";

describe("getNextWorldUnlockCost", () => {
  it("解放済み数で次コストが決まる（何個目の解放か）", () => {
    assert.equal(getNextWorldUnlockCost(0), 0); // 1個目は無料
    assert.equal(getNextWorldUnlockCost(1), 1000); // 2個目
    assert.equal(getNextWorldUnlockCost(2), 2300); // 3個目
    assert.equal(getNextWorldUnlockCost(3), 4200); // 4個目
    assert.equal(getNextWorldUnlockCost(4), 7000); // 5個目
    assert.equal(getNextWorldUnlockCost(5), 11000); // 6個目
    assert.equal(getNextWorldUnlockCost(6), null); // これ以上なし
  });
});

describe("getWorldRates", () => {
  it("ブーストなしは解放済みワールドを均等抽選", () => {
    const rates = getWorldRates(["ground", "waterside", "sky", "bug"]);
    assert.equal(rates.ground, 0.25);
    assert.equal(rates.waterside, 0.25);
    assert.equal(rates.sky, 0.25);
    assert.equal(rates.bug, 0.25);
  });

  it("4ワールド解放・水辺ブーストで waterside 55%・他 15%", () => {
    const boost: WorldBoost = {
      id: "b1",
      targetWorld: "waterside",
      remainingScans: 10,
      boostRate: 0.55,
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    const rates = getWorldRates(["ground", "waterside", "sky", "bug"], boost);
    assert.equal(rates.waterside, 0.55);
    assert.equal(rates.ground, 0.15);
    assert.equal(rates.sky, 0.15);
    assert.equal(rates.bug, 0.15);
  });

  it("2ワールド解放では対象70%・もう一方30%", () => {
    const boost: WorldBoost = {
      id: "b2",
      targetWorld: "waterside",
      remainingScans: 5,
      boostRate: 0.55,
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    const rates = getWorldRates(["ground", "waterside"], boost);
    const round = (v: number | undefined) => Math.round((v ?? 0) * 1000) / 1000;
    assert.equal(round(rates.waterside), 0.7);
    assert.equal(round(rates.ground), 0.3);
  });

  it("未解放ワールドのブーストは無視される", () => {
    const boost: WorldBoost = {
      id: "b3",
      targetWorld: "sky",
      remainingScans: 5,
      boostRate: 0.55,
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    const rates = getWorldRates(["ground", "waterside"], boost);
    assert.equal(rates.ground, 0.5);
    assert.equal(rates.waterside, 0.5);
  });

  it("1ワールドのみ解放中はブースト不可（均等のまま）", () => {
    const boost: WorldBoost = {
      id: "b4",
      targetWorld: "ground",
      remainingScans: 5,
      boostRate: 0.55,
      createdAt: "2026-01-01T00:00:00.000Z"
    };
    const rates = getWorldRates(["ground"], boost);
    assert.equal(rates.ground, 1);
  });
});

describe("normalizeWorldGroups", () => {
  it("不正・未知キーを除去し重複排除する", () => {
    const result = normalizeWorldGroups(["ground", "ground", "banana", "sky", 42]);
    assert.deepEqual(result, ["ground", "sky"]);
  });

  it("配列でなければ空配列", () => {
    assert.deepEqual(normalizeWorldGroups("ground"), []);
    assert.deepEqual(normalizeWorldGroups(undefined), []);
  });
});

describe("decrementWorldBoostAfterValidScan", () => {
  const boost: WorldBoost = {
    id: "b",
    targetWorld: "waterside",
    remainingScans: 2,
    boostRate: 0.55,
    createdAt: "2026-01-01T00:00:00.000Z"
  };

  it("有効スキャンで残り回数が1減る", () => {
    const next = decrementWorldBoostAfterValidScan(boost);
    assert.equal(next?.remainingScans, 1);
  });

  it("残り1回を消費すると解除（undefined）", () => {
    const next = decrementWorldBoostAfterValidScan({ ...boost, remainingScans: 1 });
    assert.equal(next, undefined);
  });

  it("ブースト未使用時は undefined のまま", () => {
    assert.equal(decrementWorldBoostAfterValidScan(undefined), undefined);
  });
});
