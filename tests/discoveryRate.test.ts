import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateDiscoveryRate,
  NORMAL_RATE_MIN,
  RARE_RATE_MAX,
  selectCharacterByType,
  selectDiscoveryType,
  VARIANT_RATE_MAX,
  type DiscoveryRateInput
} from "../src/services/discoveryRate.ts";

// 決定的な擬似乱数（mulberry32）。統計テストを再現可能にする。
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const beginner: DiscoveryRateInput = {
  totalScans: 0,
  discoveredSpeciesCount: 0,
  totalSpeciesCount: 35,
  scanStreak: 0,
  discoveryStreak: 0
};

const advanced: DiscoveryRateInput = {
  totalScans: 1000,
  discoveredSpeciesCount: 35,
  totalSpeciesCount: 35,
  scanStreak: 30,
  discoveryStreak: 30
};

describe("calculateDiscoveryRate", () => {
  it("初心者は normal95% / variant4% / rare1%", () => {
    const rate = calculateDiscoveryRate(beginner);
    assert.ok(Math.abs(rate.rareRate - 0.01) < 1e-9, `rare=${rate.rareRate}`);
    assert.ok(Math.abs(rate.variantRate - 0.04) < 1e-9, `variant=${rate.variantRate}`);
    assert.ok(Math.abs(rate.normalRate - 0.95) < 1e-9, `normal=${rate.normalRate}`);
  });

  it("上級者は normal87% / variant10% / rare3%", () => {
    const rate = calculateDiscoveryRate(advanced);
    assert.ok(Math.abs(rate.rareRate - 0.03) < 1e-9, `rare=${rate.rareRate}`);
    assert.ok(Math.abs(rate.variantRate - 0.1) < 1e-9, `variant=${rate.variantRate}`);
    assert.ok(Math.abs(rate.normalRate - 0.87) < 1e-9, `normal=${rate.normalRate}`);
  });

  it("合計は常に1、上限を超えない、normalは87%以上（境界値網羅）", () => {
    const cases: DiscoveryRateInput[] = [
      beginner,
      advanced,
      { totalScans: 0, discoveredSpeciesCount: 0, totalSpeciesCount: 35, scanStreak: 0, discoveryStreak: 0 },
      { totalScans: 1, discoveredSpeciesCount: 0, totalSpeciesCount: 35, scanStreak: 0, discoveryStreak: 0 },
      { totalScans: 100, discoveredSpeciesCount: 10, totalSpeciesCount: 35, scanStreak: 3, discoveryStreak: 2 },
      { totalScans: 1000, discoveredSpeciesCount: 35, totalSpeciesCount: 35, scanStreak: 100, discoveryStreak: 100 },
      // 異常値・0除算・負値・過大値も安全に扱う
      { totalScans: -5, discoveredSpeciesCount: -1, totalSpeciesCount: 0, scanStreak: -3, discoveryStreak: -9 },
      { totalScans: 999999, discoveredSpeciesCount: 999, totalSpeciesCount: 35, scanStreak: 9999, discoveryStreak: 9999 }
    ];

    for (const input of cases) {
      const rate = calculateDiscoveryRate(input);
      const sum = rate.normalRate + rate.variantRate + rate.rareRate;
      assert.ok(Math.abs(sum - 1) < 1e-9, `sum=${sum} for ${JSON.stringify(input)}`);
      assert.ok(rate.rareRate <= RARE_RATE_MAX + 1e-9, `rare over cap: ${rate.rareRate}`);
      assert.ok(rate.variantRate <= VARIANT_RATE_MAX + 1e-9, `variant over cap: ${rate.variantRate}`);
      assert.ok(rate.normalRate >= NORMAL_RATE_MIN - 1e-9, `normal under floor: ${rate.normalRate}`);
      assert.ok(rate.rareRate >= 0.01 - 1e-9, `rare under floor: ${rate.rareRate}`);
    }
  });

  it("進捗が上がると variant/rare は単調に増え、normal は単調に減る（上限内）", () => {
    const low = calculateDiscoveryRate(beginner);
    const mid = calculateDiscoveryRate({
      totalScans: 200,
      discoveredSpeciesCount: 17,
      totalSpeciesCount: 35,
      scanStreak: 5,
      discoveryStreak: 5
    });
    const high = calculateDiscoveryRate(advanced);
    assert.ok(low.rareRate <= mid.rareRate && mid.rareRate <= high.rareRate);
    assert.ok(low.variantRate <= mid.variantRate && mid.variantRate <= high.variantRate);
    assert.ok(low.normalRate >= mid.normalRate && mid.normalRate >= high.normalRate);
  });
});

describe("selectDiscoveryType", () => {
  it("しきい値の境界で正しく分類する（rng注入）", () => {
    const rate = { normalRate: 0.95, variantRate: 0.04, rareRate: 0.01 };
    assert.equal(selectDiscoveryType(rate, () => 0.0), "rare");
    assert.equal(selectDiscoveryType(rate, () => 0.005), "rare");
    assert.equal(selectDiscoveryType(rate, () => 0.02), "variant");
    assert.equal(selectDiscoveryType(rate, () => 0.049), "variant");
    assert.equal(selectDiscoveryType(rate, () => 0.05), "normal");
    assert.equal(selectDiscoveryType(rate, () => 0.999), "normal");
  });

  it("初心者の分布は概ね 95/4/1（±1.5%）", () => {
    const rate = calculateDiscoveryRate(beginner);
    const rng = mulberry32(12345);
    const counts = { normal: 0, variant: 0, rare: 0 };
    const N = 200000;
    for (let i = 0; i < N; i++) {
      counts[selectDiscoveryType(rate, rng)] += 1;
    }
    assert.ok(Math.abs(counts.normal / N - 0.95) < 0.015, `normal=${counts.normal / N}`);
    assert.ok(Math.abs(counts.variant / N - 0.04) < 0.015, `variant=${counts.variant / N}`);
    assert.ok(Math.abs(counts.rare / N - 0.01) < 0.015, `rare=${counts.rare / N}`);
  });

  it("上級者でも rare<=3% / variant<=10% / normal>=87% を守る", () => {
    const rate = calculateDiscoveryRate(advanced);
    const rng = mulberry32(6789);
    const counts = { normal: 0, variant: 0, rare: 0 };
    const N = 200000;
    for (let i = 0; i < N; i++) {
      counts[selectDiscoveryType(rate, rng)] += 1;
    }
    assert.ok(counts.rare / N <= 0.03 + 0.006, `rare=${counts.rare / N}`);
    assert.ok(counts.variant / N <= 0.1 + 0.01, `variant=${counts.variant / N}`);
    assert.ok(counts.normal / N >= 0.87 - 0.012, `normal=${counts.normal / N}`);
  });
});

describe("selectCharacterByType", () => {
  const masters = [
    { id: "n1", rarity: "normal" as const },
    { id: "n2", rarity: "normal" as const },
    { id: "v1", rarity: "variant" as const },
    { id: "r1", rarity: "rare" as const }
  ];

  it("指定タイプのキャラを返す", () => {
    const pick = selectCharacterByType("rare", masters, [], () => 0);
    assert.equal(pick?.id, "r1");
  });

  it("所持済みも候補に含めてランダム抽選する", () => {
    const owned = [{ characterId: "n1" }];
    const pick = selectCharacterByType("normal", masters, owned, () => 0);
    assert.equal(pick?.id, "n1");
  });

  it("指定タイプが不在なら下位へフォールバックする", () => {
    const noRare = masters.filter((m) => m.rarity !== "rare");
    const pick = selectCharacterByType("rare", noRare, [], () => 0);
    assert.ok(pick && pick.rarity !== "rare");
  });

  it("空配列では undefined", () => {
    assert.equal(selectCharacterByType("normal", [], [], () => 0), undefined);
  });
});
