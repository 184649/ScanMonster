import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { getHabitatRates, getNextHabitatUnlockCost } from "../src/data/habitatGroups.ts";
import type { HabitatBoost } from "../src/types/habitat.ts";

const boost: HabitatBoost = {
  id: "boost_water",
  targetHabitat: "water",
  remainingScans: 10,
  boostRate: 0.55,
  createdAt: "2026-07-04T00:00:00.000Z"
};

describe("getNextHabitatUnlockCost", () => {
  it("解放済み数で次コストが決まる", () => {
    assert.equal(getNextHabitatUnlockCost(0), 0);
    assert.equal(getNextHabitatUnlockCost(1), 1000);
    assert.equal(getNextHabitatUnlockCost(2), 2300);
    assert.equal(getNextHabitatUnlockCost(3), 4200);
    assert.equal(getNextHabitatUnlockCost(4), 7000);
    assert.equal(getNextHabitatUnlockCost(5), 11000);
    assert.equal(getNextHabitatUnlockCost(6), null);
  });
});

describe("getHabitatRates", () => {
  it("ブーストなしは均等抽選", () => {
    const rates = getHabitatRates(["land", "water", "sky"]);
    assert.equal(rates.land, 1 / 3);
    assert.equal(rates.water, 1 / 3);
    assert.equal(rates.sky, 1 / 3);
  });

  it("4カテゴリで対象カテゴリ55%、その他15%", () => {
    const rates = getHabitatRates(["land", "water", "sky", "bug"], boost);
    assert.equal(rates.water, 0.55);
    assert.equal(rates.land, 0.15);
    assert.equal(rates.sky, 0.15);
    assert.equal(rates.bug, 0.15);
  });

  it("2カテゴリでは対象カテゴリ70%、その他30%", () => {
    const rates = getHabitatRates(["land", "water"], boost);
    assert.equal(rates.water, 0.7);
    assert.equal(rates.land, 0.30000000000000004);
  });

  it("未解放カテゴリのブーストは無視される", () => {
    const rates = getHabitatRates(["land", "sky"], boost);
    assert.equal(rates.land, 0.5);
    assert.equal(rates.sky, 0.5);
  });
});

describe("habitat family selection", () => {
  it("カテゴリ抽選で選んだ種族を生成関数に渡す", () => {
    const storeSource = readFileSync(new URL("../src/stores/monsterStore.ts", import.meta.url), "utf8");
    assert.match(storeSource, /const family = pickFamilyForHabitat/);
    assert.match(storeSource, /familyOverride:\s*family/);
  });
});
