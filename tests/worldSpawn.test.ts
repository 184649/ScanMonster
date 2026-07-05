import { test } from "node:test";
import assert from "node:assert/strict";

import {
  pickWorldByRates,
  selectWorldSpawn,
  spawnableWorldGroups,
  hasSpawnableWorld
} from "../src/services/worldSpawn.core.ts";

type C = { id: string; worldGroup: string; hasImage: boolean };
const ch = (id: string, worldGroup: string, hasImage = true): C => ({ id, worldGroup, hasImage });

const characters: C[] = [
  ch("g1", "ground"),
  ch("g2", "ground"),
  ch("w1", "waterside"),
  ch("s1", "sky"),
  ch("b1", "bug", false) // 虫は画像なし
];
const rares: C[] = [
  ch("rg", "ground"),
  ch("rw", "waterside", false) // 水辺レアは画像なし
];

const zero = () => 0;

test("spawnableWorldGroups は画像実在キャラのある解放ワールドだけ返す", () => {
  assert.deepEqual(spawnableWorldGroups(characters, ["ground", "bug"]), ["ground"]);
  assert.deepEqual(spawnableWorldGroups(characters, ["bug"]), []);
  assert.equal(hasSpawnableWorld(characters, ["bug"]), false);
});

test("未解放ワールドのキャラは出ない（解放ワールド内から選ばれる）", () => {
  const pick = selectWorldSpawn(characters, rares, {
    unlockedWorlds: ["ground"],
    rates: {},
    wantRare: false,
    rng: zero
  });
  assert.equal(pick?.kind, "normal");
  assert.equal(pick?.world, "ground");
  if (pick?.kind === "normal") {
    assert.equal(pick.character.worldGroup, "ground");
  }
});

test("所持状況を考慮しない（未発見優先なし＝プールは所持を問わない）", () => {
  // core は所持情報を持たない＝全キャラが候補。プールに両方が含まれることを確認。
  const worlds = spawnableWorldGroups(characters, ["ground"]);
  assert.deepEqual(worlds, ["ground"]);
  const groundChars = characters.filter((c) => c.worldGroup === "ground" && c.hasImage);
  assert.deepEqual(groundChars.map((c) => c.id), ["g1", "g2"]);
});

test("wantRare は解放ワールドの画像実在レアから選ぶ", () => {
  const pick = selectWorldSpawn(characters, rares, {
    unlockedWorlds: ["ground"],
    rates: {},
    wantRare: true,
    rng: zero
  });
  assert.equal(pick?.kind, "rare");
  assert.equal(pick?.world, "ground");
});

test("レアが無い/画像なしなら通常へフォールバック", () => {
  const pick = selectWorldSpawn(characters, rares, {
    unlockedWorlds: ["waterside"],
    rates: {},
    wantRare: true,
    rng: zero
  });
  assert.equal(pick?.kind, "normal");
  assert.equal(pick?.world, "waterside");
});

test("pickWorldByRates はブースト補正（rates）を反映する", () => {
  assert.equal(pickWorldByRates(["ground", "sky"], { ground: 0.9, sky: 0.1 }, () => 0.5), "ground");
  assert.equal(pickWorldByRates(["ground", "sky"], { ground: 0.9, sky: 0.1 }, () => 0.95), "sky");
});

test("rates が無ければ均等抽選になる", () => {
  assert.equal(pickWorldByRates(["ground", "waterside"], {}, () => 0), "ground");
  assert.equal(pickWorldByRates(["ground", "waterside"], {}, () => 0.99), "waterside");
});
