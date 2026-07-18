import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { DEFAULT_CHARACTER_PRESENTATION_MODE } from "../src/config/characterPresentation.ts";
import {
  CATALOG_CHARACTERS,
  CATALOG_LEGENDARIES,
  CATALOG_RARES,
  type CatalogCharacter,
  type CatalogRare
} from "../src/data/characterCatalog.generated.ts";
import {
  createCharacterPresentationResolver,
  type CharacterPresentationSource
} from "../src/services/characterPresentation.core.ts";

type Entry = CatalogCharacter | CatalogRare;

const entries: { entry: Entry; rarity: string }[] = [
  ...CATALOG_CHARACTERS.map((entry) => ({ entry, rarity: "normal" })),
  ...CATALOG_RARES.map((entry) => ({ entry, rarity: "rare" })),
  ...CATALOG_LEGENDARIES.map((entry) => ({ entry, rarity: "legendary" }))
];

const sources: CharacterPresentationSource[] = entries.map(({ entry, rarity }, index) => ({
  identity: {
    characterId: entry.id,
    world: entry.worldGroup,
    rarity,
    releaseStatus: entry.releaseStatus,
    isDiscoverable: entry.releaseStatus === "initial",
    officialNumberScope: entry.id,
    discoveryHistoryScope: entry.id
  },
  displayName: entry.name,
  motifName: entry.speciesJa || entry.speciesEn,
  shortDescription: entry.description || undefined,
  imageSource: index + 1,
  thumbnailSource: index + 1000,
  presentationStatus: "legacy"
}));

const resolver = createCharacterPresentationResolver({
  sources,
  defaultMode: DEFAULT_CHARACTER_PRESENTATION_MODE
});

describe("CharacterPresentationResolver", () => {
  it("不明な characterId は例外や架空データを作らず undefined", () => {
    assert.doesNotThrow(() => resolver.resolveCharacterPresentation("unknown_character"));
    assert.equal(resolver.resolveCharacterPresentation("unknown_character"), undefined);
    assert.equal(resolver.getCharacterIdentity("unknown_character"), undefined);
  });

  it("既存89件で既存表示名・画像・サムネイルを返す", () => {
    assert.equal(entries.length, 89);
    for (const [index, { entry }] of entries.entries()) {
      const presentation = resolver.resolveCharacterPresentation(entry.id);
      assert.ok(presentation, entry.id);
      assert.equal(presentation.displayName, entry.name, `${entry.id} name`);
      assert.equal(presentation.imageSource, index + 1, `${entry.id} image`);
      assert.equal(presentation.thumbnailSource, index + 1000, `${entry.id} thumb`);
      assert.equal(presentation.presentationMode, "character");
      assert.equal(presentation.presentationStatus, "legacy");
    }
  });

  it("default mode は既存表示に相当する character", () => {
    assert.equal(DEFAULT_CHARACTER_PRESENTATION_MODE, "character");
    const hamster = CATALOG_CHARACTERS.find((entry) => entry.id === "ground_hamster")!;
    const presentation = resolver.resolveCharacterPresentation(hamster.id);
    assert.equal(presentation?.requestedMode, "character");
    assert.equal(presentation?.presentationMode, "character");
    assert.equal(presentation?.displayName, hamster.name);
  });

  it("zoological 未定義時は character 表示へ安全にfallback", () => {
    const presentation = resolver.resolveCharacterPresentation("ground_hamster", "zoological");
    assert.equal(presentation?.requestedMode, "zoological");
    assert.equal(presentation?.presentationMode, "character");
    assert.equal(presentation?.fallbackReason, "zoological-data-unavailable");
  });

  it("hybrid 未定義時は character 表示へ安全にfallback", () => {
    const presentation = resolver.resolveCharacterPresentation("ground_hamster", "hybrid");
    assert.equal(presentation?.requestedMode, "hybrid");
    assert.equal(presentation?.presentationMode, "character");
    assert.equal(presentation?.fallbackReason, "hybrid-data-unavailable");
  });

  it("未定義modeをdefaultに渡してもcharacter fallbackが循環しない", () => {
    const unsupportedDefault = createCharacterPresentationResolver({ sources, defaultMode: "hybrid" });
    const presentation = unsupportedDefault.resolveCharacterPresentation("ground_hamster");
    assert.equal(presentation?.requestedMode, "hybrid");
    assert.equal(presentation?.presentationMode, "character");
    assert.equal(presentation?.fallbackReason, "hybrid-data-unavailable");
  });

  it("resolver は rarity / releaseStatus / 発見・採番単位を変更しない", () => {
    const before = structuredClone(sources[0]!.identity);
    const presentation = resolver.resolveCharacterPresentation(before.characterId);
    const identity = resolver.getCharacterIdentity(before.characterId);
    assert.deepEqual(identity, before);
    assert.deepEqual(sources[0]!.identity, before);
    assert.equal("rarity" in presentation!, false);
    assert.equal("releaseStatus" in presentation!, false);
    assert.equal("characterDiscoveryNo" in presentation!, false);
    assert.equal("discoveryHistory" in presentation!, false);
  });

  it("画像欠損はmissing presentationとなり、例外を投げない", () => {
    const missingResolver = createCharacterPresentationResolver({
      defaultMode: "character",
      sources: [{
        identity: {
          characterId: "fixture_missing",
          world: "ground",
          rarity: "normal",
          releaseStatus: "initial",
          isDiscoverable: true,
          officialNumberScope: "fixture_missing",
          discoveryHistoryScope: "fixture_missing"
        },
        displayName: "表示準備中"
      }]
    });
    const presentation = missingResolver.resolveCharacterPresentation("fixture_missing");
    assert.equal(presentation?.presentationStatus, "missing");
    assert.equal(presentation?.fallbackReason, "image-unavailable");
    assert.equal(presentation?.imageSource, undefined);
    assert.equal(presentation?.thumbnailSource, undefined);
  });

  it("resolver は発見・採番・DB層へ依存せず、ground_sheepを別画像へ特別扱いしない", () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
    const core = fs.readFileSync(path.join(root, "src/services/characterPresentation.core.ts"), "utf8");
    const binding = fs.readFileSync(path.join(root, "src/services/characterPresentationResolver.ts"), "utf8");
    const avatar = fs.readFileSync(path.join(root, "src/components/MonsterAvatar.tsx"), "utf8");
    const authStore = fs.readFileSync(path.join(root, "src/stores/authStore.ts"), "utf8");
    const monsterStore = fs.readFileSync(path.join(root, "src/stores/monsterStore.ts"), "utf8");
    assert.doesNotMatch(core, /numberingService|scanService|storageService|characterSeed|database|db\./);
    assert.doesNotMatch(binding, /ground_sheep|Sheep\.png/);
    assert.doesNotMatch(authStore, /characterPresentationResolver/);
    assert.doesNotMatch(monsterStore, /characterPresentationResolver/);
    assert.match(avatar, /onError=\{\(\) => setImageFailed\(true\)\}/);
    assert.match(avatar, /useEffect\(\(\) => \{\s*setImageFailed\(false\);\s*\}, \[imageSource, resolvedImageKey\]\);/);
  });
});
