import assert from "node:assert/strict";
import { describe, it } from "node:test";
import crypto from "node:crypto";

import {
  BASE_RATES,
  MAX_RATES,
  rarityDistribution,
  pickRarity,
  type ScanRarity
} from "../server/src/rates.ts";
import {
  INITIAL_BASE_RATES,
  DAILY_FRIEND_CAP,
  dailyRareRate,
  legendaryRate,
  scanDistribution,
  effectiveFriendCount,
  unseenWeightMultiplier
} from "../server/src/friendDaily.core.ts";
import { RARE_SPAWN_RATES, RARE_CONDITION_MULTIPLIER, RARE_RATE_CAP } from "../src/constants/rareRules.ts";
import { SEED_CHARACTERS } from "../server/src/characterSeed.generated.ts";

/**
 * 図鑑特化版：出現確率・抽選ロジックが一切変わっていないことを証明する回帰テスト。
 *
 * 図鑑分類（dexClass）は表示専用であり、抽選は従来どおり rarity を参照し続ける。
 * したがって以下すべてが不変であることを、独立した観点で固定する。
 *   1. 確率設定値（ハッシュ）
 *   2. 抽選カテゴリの確率（分布）
 *   3. 同一 seed で選ばれる抽選カテゴリ（決定列）
 *   4. 各生きものの実効出現確率（カテゴリ内件数）
 *   5. 解放（legendary）に関わる母数
 *   6. GPS / フレンドの影響
 */

const hash = (v: unknown) => crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex").slice(0, 16);

describe("1. 確率設定値が変更されていない", () => {
  it("BASE_RATES / MAX_RATES が固定値", () => {
    assert.deepEqual(BASE_RATES, { normal: 0.96, rare: 0.03, prefecture: 0.008, secret: 0.002 });
    assert.deepEqual(MAX_RATES, { rare: 0.05, prefecture: 0.025, secret: 0.01 });
  });

  it("INITIAL_BASE_RATES / DAILY_FRIEND_CAP が固定値", () => {
    assert.deepEqual(INITIAL_BASE_RATES, { normal: 0.968, rare: 0.03, prefecture: 0, secret: 0.002 });
    assert.equal(DAILY_FRIEND_CAP, 100);
  });

  it("アプリ側 rareRules の定数が固定値", () => {
    assert.deepEqual(RARE_SPAWN_RATES, {
      normal: 0.94,
      uncommonIndividual: 0.05,
      rareMonster: 0.008,
      superRareCondition: 0.002
    });
    assert.equal(RARE_CONDITION_MULTIPLIER, 0.6);
    assert.equal(RARE_RATE_CAP, 0.05);
  });

  it("確率設定値のハッシュが不変（1つでも変わると失敗する）", () => {
    const snapshot = { BASE_RATES, MAX_RATES, INITIAL_BASE_RATES, RARE_SPAWN_RATES, RARE_CONDITION_MULTIPLIER, RARE_RATE_CAP };
    assert.equal(hash(snapshot), "e33a3adf0ab90310", "確率設定値が変更された");
  });
});

describe("2. 抽選カテゴリの確率が変更されていない", () => {
  it("rarityDistribution が全組合せで期待値どおり（合計1.0）", () => {
    for (const gps of [true, false]) {
      for (const lv of [0, 1, 2, 3]) {
        const d = rarityDistribution({ prefectureAvailable: gps, friendEffectLevel: lv });
        const t = lv / 3;
        assert.ok(Math.abs(d.rare - (0.03 + (0.05 - 0.03) * t)) < 1e-12, `rare lv${lv}`);
        assert.ok(Math.abs(d.secret - (0.002 + (0.01 - 0.002) * t)) < 1e-12, `secret lv${lv}`);
        assert.equal(d.legendary, 0, "旧モデルの legendary は常に0");
        if (!gps) assert.equal(d.prefecture, 0, "GPS無効時 prefecture は0");
        const sum = d.normal + d.rare + d.prefecture + d.secret;
        assert.ok(Math.abs(sum - 1) < 1e-12, `合計が1.0でない lv${lv} gps=${gps}`);
      }
    }
  });

  it("scanDistribution（段3）が友だち数の全域で合計1.0", () => {
    for (const n of [0, 1, 5, 50, 100, 200]) {
      for (const unlocked of [true, false]) {
        const d = scanDistribution({ friendCountToday: n, legendaryUnlocked: unlocked });
        const sum = (Object.values(d) as number[]).reduce((a, b) => a + b, 0);
        assert.ok(Math.abs(sum - 1) < 1e-9, `合計が1.0でない n=${n}`);
        if (!unlocked) assert.equal(d.legendary, 0, "未解放なら legendary は0");
      }
    }
  });

  it("dailyRareRate / legendaryRate の境界値が不変", () => {
    assert.ok(Math.abs(legendaryRate(0) - 0.01) < 1e-12);
    assert.ok(Math.abs(legendaryRate(100) - 0.1) < 1e-12);
    assert.equal(legendaryRate(200), legendaryRate(100), "上限100人でクランプ");
    assert.equal(dailyRareRate(200), dailyRareRate(100), "上限100人でクランプ");
  });
});

describe("3. 同一 seed で選ばれる抽選カテゴリが不変", () => {
  /** 決定的な擬似乱数（seed 固定）。実装の Math.random には依存しない。 */
  const seeded = (seed: number) => () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  it("固定 seed 2000 回の抽選カテゴリ列のハッシュが不変", () => {
    const rnd = seeded(20260720);
    const dist = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 2 });
    const picks: ScanRarity[] = [];
    for (let i = 0; i < 2000; i += 1) picks.push(pickRarity(dist, rnd()));
    assert.equal(hash(picks), "881e6b363152a71e", "同一 seed の抽選結果が変わった");
  });

  it("pickRarity の境界（累積順 secret→legendary→prefecture→rare→normal）が不変", () => {
    const d = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 0 });
    assert.equal(pickRarity(d, 0), "secret");
    assert.equal(pickRarity(d, 0.0019), "secret");
    assert.equal(pickRarity(d, 0.0021), "prefecture");
    assert.equal(pickRarity(d, 0.0099), "prefecture");
    assert.equal(pickRarity(d, 0.011), "rare");
    assert.equal(pickRarity(d, 0.99), "normal");
    assert.equal(pickRarity(d, 1), "normal", "範囲外でも normal へフォールバック");
  });
});

describe("4. 各生きものの実効出現確率が不変（カテゴリ内件数）", () => {
  const byRarity = SEED_CHARACTERS.reduce<Record<string, number>>((acc, s) => {
    acc[s.rarity] = (acc[s.rarity] ?? 0) + 1;
    return acc;
  }, {});

  it("初期リリースのカテゴリ内件数が normal 84 / rare 1 / legendary 4", () => {
    // 実効確率 = カテゴリ確率 ÷ カテゴリ内件数。件数が変わると1種あたりの確率が変わる。
    assert.deepEqual(byRarity, { normal: 84, rare: 1, legendary: 4 });
    assert.equal(SEED_CHARACTERS.length, 89);
  });

  it("ワールド別件数が ground 74 / sky 15", () => {
    const byWorld = SEED_CHARACTERS.reduce<Record<string, number>>((acc, s) => {
      acc[s.world] = (acc[s.world] ?? 0) + 1;
      return acc;
    }, {});
    assert.deepEqual(byWorld, { ground: 74, sky: 15 });
  });

  it("seed の (id, rarity, world) 集合のハッシュが不変", () => {
    const key = SEED_CHARACTERS.map((s) => `${s.id}:${s.rarity}:${s.world}`).sort();
    assert.equal(hash(key), "06094f581e9ce76a", "抽選母集団が変わった");
  });
});

describe("5. 解放（legendary）の母数が不変", () => {
  it("ground の normal 完成対象が 69 件", () => {
    const groundNormals = SEED_CHARACTERS.filter((s) => s.world === "ground" && s.rarity === "normal");
    assert.equal(groundNormals.length, 69);
  });

  it("sky の normal 完成対象が 15 件", () => {
    const skyNormals = SEED_CHARACTERS.filter((s) => s.world === "sky" && s.rarity === "normal");
    assert.equal(skyNormals.length, 15);
  });
});

describe("6. GPS / フレンドの影響が不変", () => {
  it("GPS 無効時、prefecture 分は normal へ戻る", () => {
    const on = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 1 });
    const off = rarityDistribution({ prefectureAvailable: false, friendEffectLevel: 1 });
    assert.ok(Math.abs(off.normal - (on.normal + on.prefecture)) < 1e-12);
    assert.equal(off.rare, on.rare, "GPS は rare へ影響しない");
    assert.equal(off.secret, on.secret, "GPS は secret へ影響しない");
  });

  it("effectiveFriendCount / unseenWeightMultiplier が不変", () => {
    assert.equal(effectiveFriendCount(-5), 0);
    assert.equal(effectiveFriendCount(200), DAILY_FRIEND_CAP);
    assert.ok(unseenWeightMultiplier(0) >= 1, "未発見の重みは1以上");
    assert.ok(unseenWeightMultiplier(100) >= unseenWeightMultiplier(0), "友だちが多いほど未発見が出やすい");
  });
});
