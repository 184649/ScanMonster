import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectGrantedTitles,
  computeDifficulty,
  difficultyAtLeast,
  discoveryRankLabel,
  shouldGrantStrongestProof
} from "../src/services/discoveryJudge.core.ts";
import { buildCharacterNumberBadge } from "../src/services/numberValue.core.ts";
import {
  computeDiscoveryDp,
  isRediscoveryMilestone,
  strongestProofChance
} from "../src/config/discoveryConfig.ts";

/**
 * 結合テスト（§37.2）: buildDiscoveryRecord と同じ合成手順をたどり、
 * 新規発見／再発見／番号価値／最強の証の各シナリオを検証する。
 * （storageService を経由しないため node:test で実行可能。）
 */
type Rarity = "normal" | "rare";

const simulate = (params: {
  no: string;
  rarity: Rarity;
  isRediscovery: boolean;
  discoveryCount: number;
  roll01: number;
  isFirstValidScanOfDay: boolean;
}) => {
  const badge = buildCharacterNumberBadge(params.no);
  const isMilestone = params.isRediscovery && isRediscoveryMilestone(params.discoveryCount);
  const chance = strongestProofChance(params.rarity, badge.valueRank);
  const strongestProof = shouldGrantStrongestProof(params.roll01, chance);
  const difficultyRank = computeDifficulty({
    rarity: params.rarity,
    isRediscovery: params.isRediscovery,
    numberValueRank: badge.valueRank,
    hasStrongestProof: strongestProof,
    isMilestone
  });
  const titles = collectGrantedTitles({
    badge,
    hasStrongestProof: strongestProof,
    discoveryCount: params.discoveryCount,
    isRediscovery: params.isRediscovery
  });
  const rankLabel = discoveryRankLabel({
    difficultyRank,
    hasStrongestProof: strongestProof,
    isNewForUser: !params.isRediscovery
  });
  const dp = computeDiscoveryDp({
    rarity: params.rarity,
    isRediscovery: params.isRediscovery,
    isFirstValidScanOfDay: params.isFirstValidScanOfDay
  });
  return { badge, strongestProof, difficultyRank, titles, rankLabel, dp };
};

describe("結合: 発見パイプライン", () => {
  it("新規ノーマル発見シナリオ", () => {
    const r = simulate({
      no: "42",
      rarity: "normal",
      isRediscovery: false,
      discoveryCount: 1,
      roll01: 0.99,
      isFirstValidScanOfDay: true
    });
    assert.equal(r.badge.valueRank, "normal");
    assert.ok(!r.strongestProof);
    assert.ok(difficultyAtLeast(r.difficultyRank, "B"));
    assert.equal(r.dp.total, 50); // 30 + 20(今日の初回)
    assert.equal(r.rankLabel, "新規発見");
  });

  it("再発見（10回目）シナリオ: 記念再会", () => {
    const r = simulate({
      no: "42",
      rarity: "normal",
      isRediscovery: true,
      discoveryCount: 10,
      roll01: 0.99,
      isFirstValidScanOfDay: false
    });
    assert.ok(r.titles.includes("reunion_10"));
    assert.ok(difficultyAtLeast(r.difficultyRank, "B"));
    assert.equal(r.dp.total, 5);
  });

  it("番号価値 No.777 シナリオ", () => {
    const r = simulate({
      no: "777",
      rarity: "normal",
      isRediscovery: false,
      discoveryCount: 1,
      roll01: 0.99, // 最強の証は付かない
      isFirstValidScanOfDay: false
    });
    assert.equal(r.badge.label, "ラッキーセブン");
    assert.equal(r.badge.valueRank, "premium");
    // premium 番号で難度が底上げされる。
    assert.ok(difficultyAtLeast(r.difficultyRank, "A"));
  });

  it("レア + 最強の証 + 特別番号でSSS・奇跡の発見", () => {
    const r = simulate({
      no: "1",
      rarity: "rare",
      isRediscovery: false,
      discoveryCount: 1,
      roll01: 0, // 必ず最強の証
      isFirstValidScanOfDay: false
    });
    assert.ok(r.strongestProof);
    assert.equal(r.difficultyRank, "SSS");
    assert.equal(r.rankLabel, "奇跡の発見");
    assert.ok(r.titles.includes("strongest_proof"));
    assert.equal(r.dp.total, 100);
  });
});
