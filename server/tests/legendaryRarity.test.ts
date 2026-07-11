import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { legendaryRate, scanDistribution } from "../src/friendDaily.core.ts";
import { didUnlockLegendaryNow, isLegendaryUnlocked, legendaryUnlockedWorlds } from "../src/legendaryUnlock.core.ts";

const r4 = (n: number) => Math.round(n * 10000) / 10000;
const sum = (d: { normal: number; rare: number; legendary: number; prefecture: number; secret: number }) =>
  d.normal + d.rare + d.legendary + d.prefecture + d.secret;

describe("legendaryRate（段3 §10）", () => {
  const cases: Array<[number, number]> = [
    [0, 0.01],
    [1, 0.0109],
    [10, 0.019],
    [20, 0.028],
    [30, 0.037],
    [40, 0.046],
    [50, 0.055],
    [60, 0.064],
    [70, 0.073],
    [80, 0.082],
    [90, 0.091],
    [100, 0.1],
    [101, 0.1] // 100人上限
  ];
  for (const [count, rate] of cases) {
    it(`${count}人 → legendary ${(rate * 100).toFixed(2)}%`, () => {
      assert.equal(r4(legendaryRate(count)), r4(rate));
    });
  }
});

describe("scanDistribution（段3 §7/§12：合計1.0）", () => {
  it("伝説未解放・0人：normal96.8/rare3.0/legendary0/secret0.2", () => {
    const d = scanDistribution({ friendCountToday: 0, legendaryUnlocked: false });
    assert.equal(r4(d.normal), 0.968);
    assert.equal(r4(d.rare), 0.03);
    assert.equal(d.legendary, 0);
    assert.equal(r4(d.secret), 0.002);
    assert.equal(r4(sum(d)), 1);
  });
  it("伝説未解放・100人：legendaryは必ず0%（rare5.0/normal94.8）", () => {
    const d = scanDistribution({ friendCountToday: 100, legendaryUnlocked: false });
    assert.equal(d.legendary, 0);
    assert.equal(r4(d.rare), 0.05);
    assert.equal(r4(d.normal), 0.948);
    assert.equal(r4(sum(d)), 1);
  });
  it("伝説解放・0人：normal95.8/rare3.0/legendary1.0/secret0.2", () => {
    const d = scanDistribution({ friendCountToday: 0, legendaryUnlocked: true });
    assert.equal(r4(d.normal), 0.958);
    assert.equal(r4(d.rare), 0.03);
    assert.equal(r4(d.legendary), 0.01);
    assert.equal(r4(d.secret), 0.002);
    assert.equal(r4(sum(d)), 1);
  });
  it("伝説解放・50人：rare4.0/legendary5.5/secret0.2/normal90.3", () => {
    const d = scanDistribution({ friendCountToday: 50, legendaryUnlocked: true });
    assert.equal(r4(d.rare), 0.04);
    assert.equal(r4(d.legendary), 0.055);
    assert.equal(r4(d.secret), 0.002);
    assert.equal(r4(d.normal), 0.903);
    assert.equal(r4(sum(d)), 1);
  });
  it("伝説解放・100人：normal84.8/rare5.0/legendary10.0/secret0.2", () => {
    const d = scanDistribution({ friendCountToday: 100, legendaryUnlocked: true });
    assert.equal(r4(d.normal), 0.848);
    assert.equal(r4(d.rare), 0.05);
    assert.equal(r4(d.legendary), 0.1);
    assert.equal(r4(d.secret), 0.002);
    assert.equal(r4(sum(d)), 1);
  });
  it("伝説解放・101人でも100人上限（合計1.0）", () => {
    const d = scanDistribution({ friendCountToday: 101, legendaryUnlocked: true });
    assert.equal(r4(d.legendary), 0.1);
    assert.equal(r4(d.rare), 0.05);
    assert.equal(r4(sum(d)), 1);
  });
});

describe("isLegendaryUnlocked / legendaryUnlockedWorlds（§3/§6）", () => {
  it("normal未コンプリートは false、全発見で true（rare不問）", () => {
    assert.equal(isLegendaryUnlocked({ normalTotal: 5, normalDiscovered: 4 }), false);
    assert.equal(isLegendaryUnlocked({ normalTotal: 5, normalDiscovered: 5 }), true);
    assert.equal(isLegendaryUnlocked({ normalTotal: 0, normalDiscovered: 0 }), false); // total0は未解放
  });
  it("ワールドごとに独立（地上コンプでも水は未解放）", () => {
    const worlds = legendaryUnlockedWorlds([
      { worldGroup: "ground", normalTotal: 3, normalDiscovered: 3 },
      { worldGroup: "water", normalTotal: 3, normalDiscovered: 1 }
    ]);
    assert.ok(worlds.has("ground"));
    assert.ok(!worlds.has("water"));
  });
});

describe("didUnlockLegendaryNow（§5：解放の瞬間だけ true）", () => {
  it("最後の1体を新規発見した時だけ true", () => {
    assert.equal(didUnlockLegendaryNow({ rarity: "normal", normalTotal: 3, normalDiscoveredBefore: 2, isNewForUser: true }), true);
    assert.equal(didUnlockLegendaryNow({ rarity: "normal", normalTotal: 3, normalDiscoveredBefore: 1, isNewForUser: true }), false);
    assert.equal(didUnlockLegendaryNow({ rarity: "normal", normalTotal: 3, normalDiscoveredBefore: 3, isNewForUser: true }), false); // 既に完了
  });
  it("再発見・rare発見では解放しない", () => {
    assert.equal(didUnlockLegendaryNow({ rarity: "normal", normalTotal: 3, normalDiscoveredBefore: 2, isNewForUser: false }), false);
    assert.equal(didUnlockLegendaryNow({ rarity: "rare", normalTotal: 3, normalDiscoveredBefore: 2, isNewForUser: true }), false);
  });
});
