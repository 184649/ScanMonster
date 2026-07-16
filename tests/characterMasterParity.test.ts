import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildCatalog, loadClassification } from "../scripts/catalogBuild.js";
import { CATALOG_LEGENDARIES, CATALOG_NORMALS, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";
import { SEED_CHARACTERS } from "../server/src/characterSeed.generated.ts";

/**
 * キャラクター一元化の整合性テスト（releaseStatus 明示モデル・89/89/0）。
 * 正本 = character_master.json + character-classification.json。
 * 重要：hasImage は releaseStatus を決定・降格しない。initial 画像欠損があれば missing として検出（future にしない）。
 * 現状：初期 89 体すべて画像投入済み（旧「不足4体」= White Tiger/Tsuchinoko/Yeti/Underground Dweller は解決済み）。
 * 生成物（app catalog / server seed）は buildable（initial∩hasImage=89）で一致する。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "assets", "characters");
const master = JSON.parse(fs.readFileSync(path.join(charactersDir, "character_master.json"), "utf8"));
const classification = loadClassification(charactersDir);
type Entry = { id: string; worldGroup: string; hasImage: boolean; releaseStatus: string };
const full = buildCatalog({ root, charactersDir, master, classification }) as {
  characters: Entry[];
  rares: Entry[];
  legendaries: Entry[];
  missingInitialAssets: Array<{ id: string; world: string; rarity: string }>;
};
const all = [...full.characters, ...full.rares, ...full.legendaries];
const byId = new Map(all.map((c) => [c.id, c]));
const legIds = new Set(full.legendaries.map((c) => c.id));
const rareIds = new Set(full.rares.map((c) => c.id));

// 旧「不足4体」。現在は画像投入済み（解決済み）。canonical initial の一員である点は不変。
const FORMERLY_MISSING_4 = [
  "ground_rare_white_tiger",
  "ground_rare_tsuchinoko",
  "ground_rare_yeti",
  "ground_rare_underground_dweller"
];

describe("初期リリース 89/89/0（hasImageで降格しない・全画像投入済み）", () => {
  it("canonical initial = 89", () => {
    assert.equal(all.filter((c) => c.releaseStatus === "initial").length, 89);
  });
  it("asset complete initial = 89", () => {
    assert.equal(all.filter((c) => c.releaseStatus === "initial" && c.hasImage).length, 89);
  });
  it("missing initial = 0（全 initial に画像あり）", () => {
    assert.deepEqual(full.missingInitialAssets.map((m) => m.id).sort(), []);
  });
  it("旧不足4体は releaseStatus=initial かつ画像投入済み（hasImage=true）", () => {
    for (const id of FORMERLY_MISSING_4) {
      const c = byId.get(id)!;
      assert.equal(c.releaseStatus, "initial", `${id} が initial でない`);
      assert.equal(c.hasImage, true, `${id} は画像投入済みのはず`);
    }
  });
});

describe("rarity 分類（21 legendary 維持・実在は rare）", () => {
  it("classification.rarity は legendary 21 件 ＋ 既存互換の rare 1 件（White Tiger）", () => {
    const map = classification.rarity as Record<string, string>;
    const vals = Object.values(map);
    assert.equal(vals.length, 22);
    assert.equal(vals.filter((v) => v === "legendary").length, 21);
    // Phase 0.5: Excel は normal だが既存 catalog/seed/DB は rare のため、既存互換として rare で固定中（要決定）。
    assert.equal(map["ground_rare_white_tiger"], "rare");
  });
  it("Fenrir/Kraken/Tsuchinoko/Yeti/Underground Dweller は legendary", () => {
    for (const id of [
      "ground_rare_fenrir",
      "waterside_rare_kraken",
      "ground_rare_tsuchinoko",
      "ground_rare_yeti",
      "ground_rare_underground_dweller",
      "phantom_rare_dragon",
      "phantom_rare_phoenix",
      "planet_rare_alien"
    ]) {
      assert.ok(legIds.has(id), `${id} が legendary でない`);
      assert.ok(!rareIds.has(id), `${id} が rare に残存`);
    }
  });
  it("White Tiger / Megalodon / Coelacanth は rare（実在）", () => {
    for (const id of ["ground_rare_white_tiger", "waterside_rare_megalodon", "waterside_rare_coelacanth"]) {
      assert.ok(rareIds.has(id), `${id} が rare でない`);
      assert.ok(!legIds.has(id), `${id} が legendary に誤分類`);
    }
  });
});

describe("future は image有無に関わらず future のまま", () => {
  it("Kraken(future+画像あり) は future / bug(future) も future", () => {
    assert.equal(byId.get("waterside_rare_kraken")!.releaseStatus, "future");
    const bug = all.find((c) => c.worldGroup === "bug");
    if (bug) assert.equal(bug.releaseStatus, "future");
  });
});

describe("生成物(89)は buildable=initial∩hasImage と一致（server=app）", () => {
  const catById = new Map<string, { rarity: string; world: string }>();
  for (const c of CATALOG_NORMALS) catById.set(c.id, { rarity: "normal", world: c.worldGroup });
  for (const c of CATALOG_RARES) catById.set(c.id, { rarity: "rare", world: c.worldGroup });
  for (const c of CATALOG_LEGENDARIES) catById.set(c.id, { rarity: "legendary", world: c.worldGroup });
  const buildableIds = new Set(all.filter((c) => c.releaseStatus === "initial" && c.hasImage).map((c) => c.id));

  it("app catalog = server seed = buildable(89) の同一ID集合", () => {
    assert.equal(catById.size, 89);
    assert.equal(SEED_CHARACTERS.length, 89);
    assert.deepEqual([...buildableIds].sort(), [...new Set(SEED_CHARACTERS.map((s) => s.id))].sort());
    for (const s of SEED_CHARACTERS) {
      const c = catById.get(s.id);
      assert.ok(c, `seed ${s.id} が catalog に無い`);
      assert.equal(c!.rarity, s.rarity);
      assert.equal(c!.world, s.world);
    }
  });

  it("§16 ワールドごと VISIBLE=DRAWABLE=UNLOCK normal（ID集合・欠損4はnormalでないので不影響）", () => {
    for (const world of ["ground", "sky"]) {
      const visible = new Set(CATALOG_NORMALS.filter((c) => c.worldGroup === world).map((c) => c.id));
      const drawable = new Set(SEED_CHARACTERS.filter((s) => s.world === world && s.rarity === "normal").map((s) => s.id));
      assert.deepEqual([...visible].sort(), [...drawable].sort(), `${world}: normal集合不一致`);
    }
  });

  it("Fenrir は初期 catalog/seed の legendary（地上の伝説）／Kraken・phantom は出さない", () => {
    assert.ok(CATALOG_LEGENDARIES.some((c) => c.id === "ground_rare_fenrir"));
    assert.ok(SEED_CHARACTERS.some((s) => s.id === "ground_rare_fenrir" && s.rarity === "legendary"));
    assert.ok(!CATALOG_LEGENDARIES.some((c) => c.id === "waterside_rare_kraken"));
    assert.ok(!SEED_CHARACTERS.some((s) => s.world === "phantom"));
  });
});
