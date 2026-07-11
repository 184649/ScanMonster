import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCharacterNumberBadge,
  computeDifficulty,
  computeDiscoveryDp,
  difficultyAtLeast,
  discoveryRankLabel,
  formatDiscoveryNo,
  isRediscoveryMilestone,
  judgeNumberValueRank,
  shouldGrantStrongestProof,
  strongestProofChance
} from "../src/domain.ts";

// サーバードメインがアプリと同一仕様であること（パリティ）を保証する。
describe("server domain: 番号価値", () => {
  it("§16 の例", () => {
    assert.equal(judgeNumberValueRank("1"), "legend");
    assert.equal(judgeNumberValueRank("7"), "legend");
    assert.equal(judgeNumberValueRank("77"), "premium");
    assert.equal(judgeNumberValueRank("111"), "rare");
    assert.equal(judgeNumberValueRank("100"), "rare");
    assert.equal(judgeNumberValueRank("1000"), "premium");
    assert.equal(judgeNumberValueRank("1234"), "premium");
    assert.equal(judgeNumberValueRank("2026"), "legend");
    assert.equal(judgeNumberValueRank("1523"), "normal");
  });
  it("BIGINT 相当も string のまま扱える", () => {
    assert.equal(formatDiscoveryNo("109500000000000"), "No.109500000000000");
    assert.equal(buildCharacterNumberBadge("777").label, "ラッキーセブン");
  });
});

describe("server domain: 難度・DP・最強の証", () => {
  const base = { numberValueRank: "normal" as const, hasStrongestProof: false, isMilestone: false };
  it("通常再発見C / 新規ノーマルB以上 / レアA以上", () => {
    assert.equal(computeDifficulty({ ...base, rarity: "normal", isRediscovery: true }), "C");
    assert.ok(difficultyAtLeast(computeDifficulty({ ...base, rarity: "normal", isRediscovery: false }), "B"));
    assert.ok(difficultyAtLeast(computeDifficulty({ ...base, rarity: "rare", isRediscovery: false }), "A"));
  });
  it("レア+最強の証+特別番号でSSS・奇跡の発見", () => {
    const rank = computeDifficulty({ rarity: "rare", isRediscovery: false, numberValueRank: "legend", hasStrongestProof: true, isMilestone: false });
    assert.equal(rank, "SSS");
    assert.equal(discoveryRankLabel({ difficultyRank: rank, hasStrongestProof: true, isNewForUser: true }), "奇跡の発見");
  });
  it("DP 30/5/100/20/+20", () => {
    assert.equal(computeDiscoveryDp({ rarity: "normal", isRediscovery: false, isFirstValidScanOfDay: false }).total, 30);
    assert.equal(computeDiscoveryDp({ rarity: "normal", isRediscovery: true, isFirstValidScanOfDay: false }).total, 5);
    assert.equal(computeDiscoveryDp({ rarity: "rare", isRediscovery: false, isFirstValidScanOfDay: false }).total, 100);
    assert.equal(computeDiscoveryDp({ rarity: "rare", isRediscovery: true, isFirstValidScanOfDay: false }).total, 20);
    assert.equal(computeDiscoveryDp({ rarity: "normal", isRediscovery: false, isFirstValidScanOfDay: true }).total, 50);
  });
  it("最強の証: roll<chance のみ付与", () => {
    const chance = strongestProofChance("rare", "premium");
    assert.equal(chance, 0.02);
    assert.ok(shouldGrantStrongestProof(0.01, chance));
    assert.ok(!shouldGrantStrongestProof(0.05, chance));
  });
  it("節目", () => {
    assert.ok(isRediscoveryMilestone(10));
    assert.ok(!isRediscoveryMilestone(9));
  });
});
