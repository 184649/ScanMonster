import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BASE_RATES, MAX_RATES, pickRarity, rarityDistribution, type ScanRarity } from "../src/rates.ts";
import { computeFriendEffectLevel, nextFriendEffectState } from "../src/friendEffect.ts";

const round = (v: number) => Math.round(v * 10000) / 10000;
const sum = (d: Record<ScanRarity, number>) => d.normal + d.rare + d.prefecture + d.secret;

describe("通常スキャン確率モデル（§4/§5）", () => {
  it("基本確率（Lv0・GPS有効）は 96/3/0.8/0.2、合計1", () => {
    const d = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 0 });
    assert.equal(round(d.normal), BASE_RATES.normal);
    assert.equal(round(d.rare), BASE_RATES.rare);
    assert.equal(round(d.prefecture), BASE_RATES.prefecture);
    assert.equal(round(d.secret), BASE_RATES.secret);
    assert.equal(round(sum(d)), 1);
  });

  it("GPS無効なら prefecture は 0% で、その分 normal に戻る", () => {
    const d = rarityDistribution({ prefectureAvailable: false, friendEffectLevel: 0 });
    assert.equal(d.prefecture, 0);
    assert.equal(round(d.normal), round(BASE_RATES.normal + BASE_RATES.prefecture)); // 0.968
    assert.equal(round(sum(d)), 1);
  });

  it("フレンド効果Lv3で上限（rare5% / pref2.5% / secret1% / normal91.5%）", () => {
    const d = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 3 });
    assert.equal(round(d.rare), MAX_RATES.rare);
    assert.equal(round(d.prefecture), MAX_RATES.prefecture);
    assert.equal(round(d.secret), MAX_RATES.secret);
    assert.equal(round(d.normal), 0.915);
  });

  it("レベルが上がると rare/pref/secret が増え normal が減る・上限を超えない", () => {
    const l0 = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 0 });
    const l2 = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 2 });
    const l3 = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 3 });
    assert.ok(l2.rare > l0.rare && l3.rare >= l2.rare);
    assert.ok(l2.secret > l0.secret);
    assert.ok(l2.normal < l0.normal);
    assert.ok(l3.rare <= MAX_RATES.rare && l3.prefecture <= MAX_RATES.prefecture && l3.secret <= MAX_RATES.secret);
  });

  it("pickRarity は normal/rare/prefecture/secret のみ（friend/variant/limited は出ない）", () => {
    const d = rarityDistribution({ prefectureAvailable: true, friendEffectLevel: 3 });
    const allowed = new Set(["normal", "rare", "prefecture", "secret"]);
    for (let i = 0; i < 100; i++) {
      assert.ok(allowed.has(pickRarity(d, i / 100)));
    }
    assert.equal(pickRarity(d, 0), "secret"); // roll 0 は先頭
    assert.equal(pickRarity(d, 0.999), "normal");
  });
});

describe("フレンド効果（§5.3）", () => {
  it("レベルは新規フレンド数と連続日数で上がる", () => {
    assert.equal(computeFriendEffectLevel({ newFriendCount: 0, streakDays: 0 }), 0);
    assert.equal(computeFriendEffectLevel({ newFriendCount: 0, streakDays: 3 }), 1);
    assert.equal(computeFriendEffectLevel({ newFriendCount: 0, streakDays: 7 }), 2);
    assert.equal(computeFriendEffectLevel({ newFriendCount: 3, streakDays: 1 }), 2); // 6+1=7
    assert.equal(computeFriendEffectLevel({ newFriendCount: 6, streakDays: 0 }), 3);
  });

  it("同じ相手/同日連打は新規フレンド数を増やさない（isNewFriend=false）", () => {
    const prev = { streakDays: 2, newFriendCount: 1, lastFriendQrDate: "2026-07-07" };
    const same = nextFriendEffectState({ prev, today: "2026-07-07", isNewFriend: false });
    assert.equal(same.newFriendCount, 1); // 増えない
    assert.ok(same.streakDays >= 1);
  });

  it("連続日数：翌日は+1、間が空くと1にリセット、新規は+1", () => {
    const prev = { streakDays: 2, newFriendCount: 1, lastFriendQrDate: "2026-07-07" };
    const nextDay = nextFriendEffectState({ prev, today: "2026-07-08", isNewFriend: true });
    assert.equal(nextDay.streakDays, 3);
    assert.equal(nextDay.newFriendCount, 2);
    const gap = nextFriendEffectState({ prev, today: "2026-07-20", isNewFriend: false });
    assert.equal(gap.streakDays, 1);
  });
});
