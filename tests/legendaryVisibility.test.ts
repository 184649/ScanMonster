import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CatalogCharacter, CatalogRare } from "../src/data/characterCatalog.generated.ts";
import {
  completedNormalWorlds,
  isLegendaryLocked,
  isWorldLegendaryUnlocked,
  shouldRevealLegendary,
  visibleLegendaryEntries,
  visibleLegendaryEntriesForWorld
} from "../src/services/legendaryVisibility.core.ts";

const normal = (id: string, worldGroup: string, hasImage = true): CatalogCharacter => ({
  id,
  realmGroup: "life",
  worldGroup,
  no: 1,
  name: id,
  speciesJa: id,
  speciesEn: id,
  hasImage,
  status: ""
});
const legendary = (id: string, worldGroup: string): CatalogRare => ({
  id,
  realmGroup: "life",
  worldGroup,
  no: 1,
  name: id,
  speciesJa: id,
  speciesEn: id,
  hasImage: true,
  description: ""
});

// ground: g1,g2 / water: w1,w2。伝説: Lg(ground), Lw(water)。
const normals = [normal("g1", "ground"), normal("g2", "ground"), normal("w1", "water"), normal("w2", "water")];
const legendaries = [legendary("Lg", "ground"), legendary("Lw", "water")];

describe("完了ワールド判定（§3）", () => {
  it("normal未完了はワールド未解放", () => {
    const done = completedNormalWorlds(normals, new Set(["g1"]));
    assert.ok(!done.has("ground"));
  });
  it("normal全発見でそのワールドのみ解放（独立）", () => {
    const done = completedNormalWorlds(normals, new Set(["g1", "g2"]));
    assert.ok(done.has("ground"));
    assert.ok(!done.has("water")); // 地上解放でも水は未解放
  });
});

describe("未解放時は伝説を一切出さない（§4 秘匿）", () => {
  const owned = new Set<string>(); // 何も持っていない
  const done = completedNormalWorlds(normals, owned);
  it("伝説エントリを返さない（存在・総数が漏れない）", () => {
    assert.equal(visibleLegendaryEntries(legendaries, owned, done).length, 0);
  });
  it("ワールド単位でも空", () => {
    assert.equal(visibleLegendaryEntriesForWorld(legendaries, "ground", owned, done).length, 0);
  });
  it("isWorldLegendaryUnlocked=false", () => {
    assert.equal(isWorldLegendaryUnlocked("ground", done), false);
  });
});

describe("解放後は伝説を表示可能（§5/§23）", () => {
  const owned = new Set(["g1", "g2"]); // ground だけ完了
  const done = completedNormalWorlds(normals, owned);
  const visible = visibleLegendaryEntries(legendaries, owned, done);
  it("解放ワールドの伝説のみ表示（未発見はシルエット＝owned:false）", () => {
    assert.equal(visible.length, 1);
    assert.equal(visible[0]!.entry.id, "Lg");
    assert.equal(visible[0]!.owned, false); // 未発見 → シルエット
  });
  it("未解放ワールド(water)の伝説は含まれない（独立）", () => {
    assert.ok(!visible.some((v) => v.entry.id === "Lw"));
  });
  it("発見済み伝説は owned:true（通常カード）", () => {
    const owned2 = new Set(["g1", "g2", "Lg"]);
    const done2 = completedNormalWorlds(normals, owned2);
    const v2 = visibleLegendaryEntries(legendaries, owned2, done2);
    assert.equal(v2[0]!.owned, true);
  });
  it("未発見伝説はロック（詳細遷移不可）／発見済みは解除", () => {
    assert.equal(isLegendaryLocked(legendaries[0]!, owned, done), true); // Lg 未発見
    assert.equal(isLegendaryLocked(legendaries[0]!, new Set(["g1", "g2", "Lg"]), done), false);
  });
});

describe("解放演出の二重表示防止（§4 二重表示）", () => {
  it("未演出の解放ワールドのみ true、記録後は false", () => {
    assert.equal(shouldRevealLegendary("ground", new Set()), true);
    assert.equal(shouldRevealLegendary("ground", new Set(["ground"])), false);
    assert.equal(shouldRevealLegendary(undefined, new Set()), false);
  });
});
