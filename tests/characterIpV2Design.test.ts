import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const designDir = path.join(root, "design", "character-ip-v2");
const promptDir = path.join(root, "docs", "phase2-silhouette-prompts");

const schemaNames = [
  "species-motif.schema.json",
  "character-identity.schema.json",
  "character-motif-relation.schema.json",
  "character-form.schema.json",
  "legacy-character-mapping.schema.json",
  "presentation-mode.schema.json"
];

const exampleNames = [
  "species-motifs.example.json",
  "flagship-character-briefs.example.json",
  "legacy-character-mapping.example.json"
];

const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(designDir, file), "utf8"));

const requireKeys = (value: Record<string, unknown>, keys: string[], label: string) => {
  for (const key of keys) assert.ok(Object.hasOwn(value, key), `${label}: required key ${key} is missing`);
};

test("Phase 2A JSON documents parse and schemas declare required fields", () => {
  for (const file of [...schemaNames, ...exampleNames]) assert.doesNotThrow(() => readJson(file), file);

  for (const file of schemaNames) {
    const schema = readJson(file);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema", file);
    assert.ok(Array.isArray(schema.required) && schema.required.length > 0, `${file}: top-level required is empty`);
    for (const [name, def] of Object.entries(schema.$defs ?? {}) as Array<[string, { required?: string[] }]>) {
      assert.ok(Array.isArray(def.required) && def.required.length > 0, `${file}#${name}: required is empty`);
    }
  }

  for (const file of exampleNames) assert.equal(readJson(file).sampleOnly, true, `${file} is not marked sample-only`);
});

test("examples satisfy the proposal's required entity fields and motif limits", () => {
  const speciesSchema = readJson("species-motif.schema.json");
  const identitySchema = readJson("character-identity.schema.json");
  const relationSchema = readJson("character-motif-relation.schema.json");
  const mappingSchema = readJson("legacy-character-mapping.schema.json");
  const species = readJson("species-motifs.example.json");
  const flagship = readJson("flagship-character-briefs.example.json");
  const mappings = readJson("legacy-character-mapping.example.json");

  for (const item of species.motifs) requireKeys(item, speciesSchema.$defs.speciesMotif.required, item.motifId);
  for (const item of flagship.characters) requireKeys(item, identitySchema.$defs.characterIdentity.required, item.characterId);
  for (const item of mappings.mappings) requireKeys(item, mappingSchema.$defs.legacyCharacterMapping.required, item.legacyCharacterId);

  for (const set of flagship.relationSets) {
    requireKeys(set, relationSchema.$defs.relationSet.required, set.characterId);
    assert.ok(set.relations.length >= 1 && set.relations.length <= 3, `${set.characterId}: relation limit`);
    assert.equal(set.relations.filter((r: { role: string }) => r.role === "primary").length, 1, `${set.characterId}: primary count`);
    assert.ok(set.relations.reduce((sum: number, r: { weight: number }) => sum + r.weight, 0) <= 1, `${set.characterId}: weight sum`);
  }
});

test("prototype IDs do not collide with the current master and preserve legacy bindings", () => {
  const master = JSON.parse(fs.readFileSync(path.join(root, "assets", "characters", "character_master.json"), "utf8"));
  const legacyIds = new Set<string>(Object.values(master).flat().map((row: any) => row.id));
  const flagship = readJson("flagship-character-briefs.example.json");
  const mappings = readJson("legacy-character-mapping.example.json");

  const prototypeIds = flagship.characters.map((item: { characterId: string }) => item.characterId);
  assert.equal(new Set(prototypeIds).size, prototypeIds.length, "duplicate prototype ID");
  for (const id of prototypeIds) {
    assert.match(id, /^prototype_character_[a-z0-9]+(?:_[a-z0-9]+)*$/);
    assert.ok(!legacyIds.has(id), `${id} collides with a legacy ID`);
  }
  for (const mapping of mappings.mappings) {
    assert.ok(legacyIds.has(mapping.legacyCharacterId), `${mapping.legacyCharacterId} is not a real legacy ID`);
    assert.equal(mapping.preserveOfficialNumber, true);
    assert.equal(mapping.preserveDiscoveryHistory, true);
  }
});

test("the three flagships are structurally different and exclude sheep", () => {
  const flagship = readJson("flagship-character-briefs.example.json");
  const mappings = readJson("legacy-character-mapping.example.json");
  const master = JSON.parse(fs.readFileSync(path.join(root, "assets", "characters", "character_master.json"), "utf8"));
  const classification = JSON.parse(
    fs.readFileSync(path.join(root, "assets", "characters", "character-classification.json"), "utf8")
  );
  const masterById = new Map<string, any>(
    Object.entries(master).flatMap(([world, rows]: [string, any]) =>
      rows.map((row: any) => [row.id, { ...row, world }])
    )
  );
  assert.equal(flagship.characters.length, 3);
  assert.equal(new Set(flagship.characters.map((item: { bodyArchitecture: string }) => item.bodyArchitecture)).size, 3);
  for (const mapping of mappings.mappings) {
    const legacy = masterById.get(mapping.legacyCharacterId);
    assert.ok(legacy, `${mapping.legacyCharacterId}: missing master row`);
    assert.equal(legacy.world, "ground");
    assert.equal(classification.rarity[mapping.legacyCharacterId] ?? legacy.rarity, "normal");
    assert.equal(classification.releaseStatus.byId[mapping.legacyCharacterId], "initial");
  }
  const selected = JSON.stringify(flagship).toLowerCase();
  assert.ok(!selected.includes("ground_sheep"));
  assert.ok(!selected.includes("motif_species_sheep"));
});

test("Gate 1 prompts are one-copy blocks and stop before automatic selection", () => {
  const promptNames = ["01_hamster_silhouettes.md", "02_elephant_silhouettes.md", "03_snake_silhouettes.md"];
  for (const file of promptNames) {
    const source = fs.readFileSync(path.join(promptDir, file), "utf8").replace(/\r\n/g, "\n");
    assert.equal((source.match(/^```/gm) ?? []).length, 2, `${file}: expected one fenced block`);
    assert.equal((source.match(/```text\n[\s\S]*?\n```/g) ?? []).length, 1, `${file}: block is not continuous`);
    for (const required of ["8案", "4列×2行", "黒一色", "白一色", "目", "質感", "陰影", "文字", "装備", "自動選定"]) {
      assert.ok(source.includes(required), `${file}: missing ${required}`);
    }
    assert.match(source, /自動選定[\s\S]{0,30}行わず/);
    assert.match(source, /ユーザー[\s\S]{0,60}最大2つ/);
  }
});

test("runtime sources do not import the isolated design area or prototype IDs", () => {
  const roots = [path.join(root, "src"), path.join(root, "server", "src"), path.join(root, "scripts")];
  const visit = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? visit(full) : /\.(?:js|ts|tsx)$/.test(entry.name) ? [full] : [];
    });

  for (const file of roots.flatMap(visit)) {
    const source = fs.readFileSync(file, "utf8");
    assert.ok(!source.includes("design/character-ip-v2"), `${path.relative(root, file)} imports design data`);
    assert.ok(!source.includes("prototype_character_"), `${path.relative(root, file)} contains a prototype ID`);
  }
});
