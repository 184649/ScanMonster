import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CATALOG_CHARACTERS, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";
import {
  ownedCatalogIds,
  worldNormalEntries,
  worldProgress,
  worldRareEntries
} from "../src/services/worldDex.core.ts";

const groundWithImage = CATALOG_CHARACTERS.find((c) => c.worldGroup === "ground" && c.hasImage)!;

describe("worldDex.core", () => {
  it("ownedCatalogIds は characterId 優先、無ければ imageKey", () => {
    const ids = ownedCatalogIds([{ characterId: "animal_dog" }, { imageKey: "animal_cat" }, {}]);
    assert.ok(ids.has("animal_dog"));
    assert.ok(ids.has("animal_cat"));
    assert.equal(ids.size, 2);
  });

  it("worldNormalEntries は該当ワールド(worldGroup)のみ・No順・所持フラグ付き", () => {
    const owned = new Set<string>([groundWithImage.id]);
    const entries = worldNormalEntries(CATALOG_CHARACTERS, "ground", owned);
    assert.ok(entries.length > 0);
    assert.ok(entries.every((e) => e.entry.worldGroup === "ground"));
    // No 昇順
    for (let i = 1; i < entries.length; i++) {
      assert.ok(entries[i - 1]!.entry.no <= entries[i]!.entry.no);
    }
    // 所持フラグ
    const target = entries.find((e) => e.entry.id === groundWithImage.id)!;
    assert.equal(target.owned, true);
    assert.ok(entries.some((e) => !e.owned)); // 未所持も存在
  });

  it("worldProgress は 発見/総数/画像実在数 を正しく数える", () => {
    const owned = new Set<string>([groundWithImage.id]);
    const normals = worldNormalEntries(CATALOG_CHARACTERS, "ground", owned);
    const rares = worldRareEntries(CATALOG_RARES, "ground", owned);
    const p = worldProgress(normals, rares);
    assert.equal(p.total, normals.length + rares.length);
    assert.ok(p.discovered >= 1);
    assert.ok(p.imageReady > 0 && p.imageReady <= p.total);
    assert.ok(p.discovered <= p.total);
  });

  it("キャラのいないワールド（星座）は総数0・画像実在0", () => {
    const normals = worldNormalEntries(CATALOG_CHARACTERS, "constellation", new Set());
    const rares = worldRareEntries(CATALOG_RARES, "constellation", new Set());
    const p = worldProgress(normals, rares);
    assert.equal(p.total, 0);
    assert.equal(p.imageReady, 0);
    assert.equal(p.discovered, 0);
  });
});
