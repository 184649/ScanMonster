import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectGrantedTitles,
  computeDifficulty,
  difficultyAtLeast,
  discoveryRankLabel,
  milestoneTitle,
  shouldGrantStrongestProof
} from "../src/services/discoveryJudge.core.ts";
import { buildCharacterNumberBadge } from "../src/services/numberValue.core.ts";
import {
  computeDiscoveryDp,
  isRediscoveryMilestone,
  strongestProofChance,
  STRONGEST_PROOF_RATE
} from "../src/config/discoveryConfig.ts";

describe("発見難度（§17）", () => {
  const base = { numberValueRank: "normal" as const, hasStrongestProof: false, isMilestone: false };

  it("通常再発見はC", () => {
    assert.equal(computeDifficulty({ ...base, rarity: "normal", isRediscovery: true }), "C");
  });

  it("新規ノーマル発見はB以上", () => {
    const rank = computeDifficulty({ ...base, rarity: "normal", isRediscovery: false });
    assert.ok(difficultyAtLeast(rank, "B"));
  });

  it("レア発見はA以上", () => {
    const rank = computeDifficulty({ ...base, rarity: "rare", isRediscovery: false });
    assert.ok(difficultyAtLeast(rank, "A"));
  });

  it("番号価値が高いほど難度が上がる", () => {
    const plain = computeDifficulty({ ...base, rarity: "normal", isRediscovery: false });
    const premium = computeDifficulty({
      rarity: "normal",
      isRediscovery: false,
      numberValueRank: "premium",
      hasStrongestProof: false,
      isMilestone: false
    });
    assert.ok(difficultyAtLeast(premium, plain));
    assert.notEqual(premium, plain);
  });

  it("最強の証が付くとSS以上", () => {
    const rank = computeDifficulty({
      rarity: "normal",
      isRediscovery: false,
      numberValueRank: "normal",
      hasStrongestProof: true,
      isMilestone: false
    });
    assert.ok(difficultyAtLeast(rank, "SS"));
  });

  it("レア + 最強の証 + 特別番号でSSS", () => {
    const rank = computeDifficulty({
      rarity: "rare",
      isRediscovery: false,
      numberValueRank: "legend",
      hasStrongestProof: true,
      isMilestone: false
    });
    assert.equal(rank, "SSS");
  });
});

describe("最強の証（§12）", () => {
  it("付与率は番号価値が高いほど上がる", () => {
    assert.equal(strongestProofChance("normal", "normal"), STRONGEST_PROOF_RATE.base);
    assert.equal(strongestProofChance("normal", "rare"), STRONGEST_PROOF_RATE.numberRareOrAbove);
    assert.equal(strongestProofChance("normal", "premium"), STRONGEST_PROOF_RATE.numberPremiumOrAbove);
    assert.equal(strongestProofChance("rare", "legend"), STRONGEST_PROOF_RATE.rareAndNumberPremiumOrAbove);
  });

  it("roll が確率未満のときだけ付与", () => {
    const chance = strongestProofChance("rare", "premium"); // 0.02
    assert.ok(shouldGrantStrongestProof(0.01, chance));
    assert.ok(!shouldGrantStrongestProof(0.05, chance));
  });
});

describe("DP（§13）", () => {
  it("新規ノーマル30 / 再発見5 / レア初100 / レア再20", () => {
    assert.equal(computeDiscoveryDp({ rarity: "normal", isRediscovery: false, isFirstValidScanOfDay: false }).total, 30);
    assert.equal(computeDiscoveryDp({ rarity: "normal", isRediscovery: true, isFirstValidScanOfDay: false }).total, 5);
    assert.equal(computeDiscoveryDp({ rarity: "rare", isRediscovery: false, isFirstValidScanOfDay: false }).total, 100);
    assert.equal(computeDiscoveryDp({ rarity: "rare", isRediscovery: true, isFirstValidScanOfDay: false }).total, 20);
  });

  it("今日の初回有効スキャンで+20", () => {
    const dp = computeDiscoveryDp({ rarity: "normal", isRediscovery: false, isFirstValidScanOfDay: true });
    assert.equal(dp.base, 30);
    assert.equal(dp.daily, 20);
    assert.equal(dp.total, 50);
  });
});

describe("節目再発見・発見ランク・称号", () => {
  it("節目回数の判定", () => {
    assert.ok(isRediscoveryMilestone(10));
    assert.ok(isRediscoveryMilestone(1000));
    assert.ok(!isRediscoveryMilestone(9));
    assert.equal(milestoneTitle(10), "reunion_10");
    assert.equal(milestoneTitle(100), "reunion_100");
    assert.equal(milestoneTitle(7), undefined);
  });

  it("発見ランクのラベル", () => {
    assert.equal(discoveryRankLabel({ difficultyRank: "SSS", hasStrongestProof: true, isNewForUser: true }), "奇跡の発見");
    assert.equal(discoveryRankLabel({ difficultyRank: "SS", hasStrongestProof: true, isNewForUser: false }), "称号付き発見");
    assert.equal(discoveryRankLabel({ difficultyRank: "A", hasStrongestProof: false, isNewForUser: true }), "希少発見");
    assert.equal(discoveryRankLabel({ difficultyRank: "B", hasStrongestProof: false, isNewForUser: true }), "新規発見");
    assert.equal(discoveryRankLabel({ difficultyRank: "C", hasStrongestProof: false, isNewForUser: false }), "通常発見");
  });

  it("称号は最強の証を含め集約（No.777は幸運＋ゾロ目）", () => {
    const badge = buildCharacterNumberBadge("777");
    const titles = collectGrantedTitles({ badge, hasStrongestProof: true, discoveryCount: 1, isRediscovery: false });
    assert.ok(titles.includes("strongest_proof"));
    assert.ok(titles.includes("lucky_number"));
    assert.ok(titles.includes("repdigit_number"));
  });
});
