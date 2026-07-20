import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CATALOG_CHARACTERS, CATALOG_LEGENDARIES, CATALOG_RARES } from "../src/data/characterCatalog.generated.ts";
import { SEED_CHARACTERS } from "../server/src/characterSeed.generated.ts";
import { isPublishable, DEFAULT_FICTION_DISCLAIMER, type SpeciesProfile } from "../src/types/speciesProfile.ts";
import { profileFieldsFor, dexClassLabel, dexClassNote } from "../src/data/speciesProfile.core.ts";

/**
 * 図鑑特化版：図鑑分類（dexClass）と図鑑プロフィールの回帰テスト。
 * dexClass は表示専用であり、rarity・抽選・解放条件へ影響しないことを固定する。
 */
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const charactersDir = path.join(root, "assets", "characters");
const classification = JSON.parse(
  fs.readFileSync(path.join(charactersDir, "character-classification.json"), "utf8")
) as { rarity: Record<string, string>; dexClass: { byId: Record<string, string> } };
const master = JSON.parse(fs.readFileSync(path.join(charactersDir, "character_master.json"), "utf8")) as Record<
  string,
  Array<{ id: string; rarity: string }>
>;
const profilesFile = JSON.parse(fs.readFileSync(path.join(charactersDir, "species-profiles.json"), "utf8")) as {
  profiles: Record<string, SpeciesProfile>;
};
const profiles = profilesFile.profiles;

const VALID = new Set(["NORMAL", "RARE", "LEGEND", "SECRET"]);
const effRarity = (id: string, raw: string) => classification.rarity[id] ?? raw;
const allRows = Object.values(master).flat();

describe("dexClass は表示専用で、抽選へ影響しない", () => {
  it("dexClass の値がすべて有効な4分類", () => {
    for (const [id, v] of Object.entries(classification.dexClass.byId)) {
      assert.ok(VALID.has(v), `${id}: 不正な dexClass "${v}"`);
    }
  });

  it("dexClass の上書き対象がすべて実在するID", () => {
    const ids = new Set(allRows.map((r) => r.id));
    for (const id of Object.keys(classification.dexClass.byId)) {
      assert.ok(ids.has(id), `存在しないID への上書き: ${id}`);
    }
  });

  it("server seed に dexClass が載っていない（サーバは従来どおり rarity のみ参照）", () => {
    const src = fs.readFileSync(path.join(root, "server", "src", "characterSeed.generated.ts"), "utf8");
    assert.ok(!src.includes("dexClass"), "seed に dexClass が混入している");
    assert.equal(SEED_CHARACTERS.length, 89);
  });

  it("抽選母集団（rarity 別件数）が dexClass 追加後も不変", () => {
    const by: Record<string, number> = {};
    for (const s of SEED_CHARACTERS) by[s.rarity] = (by[s.rarity] ?? 0) + 1;
    assert.deepEqual(by, { normal: 84, rare: 1, legendary: 4 });
  });

  it("dexClass を変えても rarity は1件も変わっていない", () => {
    // classification.rarity（＝抽選に効く上書き）は 22 件のまま。
    assert.equal(Object.keys(classification.rarity).length, 22);
    assert.equal(classification.rarity["ground_rare_white_tiger"], "rare");
  });
});

describe("全461件の図鑑分類", () => {
  const dexOf = (id: string, raw: string): string => {
    const o = classification.dexClass.byId[id];
    if (o) return o;
    const r = effRarity(id, raw);
    return r === "legendary" ? "LEGEND" : r === "rare" ? "RARE" : r === "secret" ? "SECRET" : "NORMAL";
  };

  it("461件が NORMAL 436 / RARE 1 / LEGEND 1 / SECRET 23", () => {
    const by: Record<string, number> = {};
    for (const r of allRows) {
      const d = dexOf(r.id, r.rarity);
      by[d] = (by[d] ?? 0) + 1;
    }
    assert.deepEqual(by, { NORMAL: 436, RARE: 1, LEGEND: 1, SECRET: 23 });
    assert.equal(allRows.length, 461);
  });

  it("空想生物（phantom / planet）はすべて SECRET", () => {
    for (const w of ["phantom", "planet"]) {
      for (const r of master[w] ?? []) {
        assert.equal(dexOf(r.id, r.rarity), "SECRET", `${r.id} が SECRET でない`);
      }
    }
  });

  it("旧 legendary（空想生物）は SECRET だが rarity は legendary のまま＝解放条件は不変", () => {
    const legendaryIds = allRows.filter((r) => effRarity(r.id, r.rarity) === "legendary").map((r) => r.id);
    assert.equal(legendaryIds.length, 21);
    for (const id of legendaryIds) {
      assert.equal(classification.dexClass.byId[id], "SECRET", `${id} の図鑑分類が SECRET でない`);
    }
    // 解放は rarity=legendary に紐づくため、図鑑分類を変えても発見方法は変わらない。
    for (const s of SEED_CHARACTERS.filter((x) => x.rarity === "legendary")) {
      assert.equal(classification.dexClass.byId[s.id], "SECRET");
    }
  });

  it("White Tiger（白変種）は RARE、Megalodon（絶滅生物）は LEGEND", () => {
    assert.equal(dexOf("ground_rare_white_tiger", "rare"), "RARE");
    assert.equal(dexOf("waterside_rare_megalodon", "rare"), "LEGEND");
  });

  it("絶滅危惧種を理由に RARE にしていない（図鑑分類は NORMAL）", () => {
    for (const id of ["ground_saola", "waterside_vaquita", "sky_kakapo", "sky_japanese_crested_ibis"]) {
      assert.equal(classification.dexClass.byId[id], "NORMAL", `${id} が NORMAL でない`);
    }
  });

  it("カタログの全エントリが dexClass を持つ", () => {
    for (const c of [...CATALOG_CHARACTERS, ...CATALOG_RARES, ...CATALOG_LEGENDARIES]) {
      assert.ok(VALID.has(c.dexClass), `${c.id}: dexClass が不正 "${c.dexClass}"`);
    }
  });

  it("初期89件の図鑑分類が NORMAL 84 / RARE 1 / SECRET 4", () => {
    const by: Record<string, number> = {};
    for (const s of SEED_CHARACTERS) {
      const d = dexOf(s.id, s.rarity);
      by[d] = (by[d] ?? 0) + 1;
    }
    assert.deepEqual(by, { NORMAL: 84, RARE: 1, SECRET: 4 });
  });
});

describe("図鑑プロフィール（科学情報）", () => {
  it("パイロットは10種", () => {
    assert.equal(Object.keys(profiles).length, 10);
  });

  it("すべてのプロフィールが実在IDを指している", () => {
    const ids = new Set(allRows.map((r) => r.id));
    for (const id of Object.keys(profiles)) assert.ok(ids.has(id), `存在しないID: ${id}`);
  });

  it("未確認（confirmed 以外）は公開されない", () => {
    for (const [id, p] of Object.entries(profiles)) {
      if (p.reviewStatus === "confirmed") continue;
      assert.equal(isPublishable(p, "NORMAL"), false, `${id}: 未確認なのに公開可能`);
      assert.equal(isPublishable(p, "SECRET"), false, `${id}: 未確認なのに公開可能`);
    }
  });

  it("出典が無い実在生物は confirmed でも公開されない", () => {
    const noSource: SpeciesProfile = { reviewStatus: "confirmed", sources: [] };
    assert.equal(isPublishable(noSource, "NORMAL"), false);
    assert.equal(isPublishable(noSource, "LEGEND"), false);
    assert.equal(isPublishable(noSource, "RARE"), false);
  });

  it("空想生物は但し書きがあれば出典なしでも公開できる", () => {
    const fiction: SpeciesProfile = {
      reviewStatus: "confirmed",
      sources: [],
      fictionDisclaimer: DEFAULT_FICTION_DISCLAIMER
    };
    assert.equal(isPublishable(fiction, "SECRET"), true);
  });

  it("未調査（プロフィール無し）は公開されない", () => {
    assert.equal(isPublishable(undefined, "NORMAL"), false);
    assert.equal(isPublishable(undefined, "SECRET"), false);
  });

  it("実在生物のプロフィールは出典を持つ", () => {
    for (const [id, p] of Object.entries(profiles)) {
      if (id === "ground_rare_yeti") continue; // 空想生物
      assert.ok(p.sources.length > 0, `${id}: 出典が無い`);
      for (const s of p.sources) {
        assert.ok(s.url.startsWith("http"), `${id}: 出典URLが不正`);
        assert.ok(s.title.length > 0, `${id}: 出典タイトルが無い`);
      }
    }
  });

  it("空想生物は fictionDisclaimer を持ち、科学フィールドを持たない", () => {
    const yeti = profiles["ground_rare_yeti"]!;
    assert.ok(yeti.fictionDisclaimer, "但し書きが無い");
    assert.match(yeti.fictionDisclaimer!, /科学的証拠はありません/);
    assert.equal(yeti.scientificName ?? null, null, "空想生物に学名が付いている");
    assert.equal(yeti.conservationStatus ?? null, null, "空想生物に保全状況が付いている");
  });

  it("RARE は通常種へ関連付けられている", () => {
    const wt = profiles["ground_rare_white_tiger"]!;
    assert.equal(wt.baseSpeciesId, "ground_tiger");
    assert.ok(wt.variantMechanism, "発生機序が無い");
    assert.match(wt.variantType!, /白変/);
  });

  it("LEGEND は復元の不確実性を保持している", () => {
    const meg = profiles["waterside_rare_megalodon"]!;
    assert.ok(meg.uncertainFeatures, "議論がある復元が記録されていない");
    assert.ok(meg.wellSupportedFeatures, "確実性の高い復元が記録されていない");
    assert.ok(meg.geologicalPeriod, "生息年代が無い");
  });

  it("保全状況はレアリティと別項目として扱われている", () => {
    const el = profiles["ground_elephant"]!;
    assert.ok(el.conservationStatus, "保全状況が無い");
    assert.match(el.conservationStatus!, /レアリティとは無関係/);
  });
});

describe("図鑑の表示分岐", () => {
  it("実在生物と空想生物で表示項目が異なる", () => {
    const normal = profileFieldsFor("NORMAL").map((f) => f.key);
    const secret = profileFieldsFor("SECRET").map((f) => f.key);
    assert.ok(normal.includes("conservationStatus"));
    assert.ok(!secret.includes("conservationStatus"), "空想生物に保全状況を表示している");
    assert.ok(!secret.includes("scientificName"), "空想生物に学名を表示している");
    assert.ok(secret.includes("fictionalOrigin"));
  });

  it("LEGEND は復元の議論がある部分を表示する", () => {
    const legend = profileFieldsFor("LEGEND").map((f) => f.key);
    assert.ok(legend.includes("uncertainFeatures"));
    assert.ok(legend.includes("wellSupportedFeatures"));
    assert.ok(!legend.includes("conservationStatus"), "絶滅生物に保全状況を表示している");
  });

  it("RARE は通常種の情報も併せて表示する", () => {
    const rare = profileFieldsFor("RARE").map((f) => f.key);
    assert.ok(rare.includes("variantType"));
    assert.ok(rare.includes("variantMechanism"));
    assert.ok(rare.includes("distribution"), "通常種の生態情報も表示すべき");
  });

  it("4分類すべてにラベルと注記がある（実在と創作を区別する文言）", () => {
    for (const d of ["NORMAL", "RARE", "LEGEND", "SECRET"] as const) {
      assert.ok(dexClassLabel(d).length > 0);
      assert.ok(dexClassNote(d).length > 0);
    }
    assert.match(dexClassNote("SECRET"), /科学的証拠はありません/);
    assert.match(dexClassNote("LEGEND"), /絶滅/);
    assert.ok(!/科学的証拠はありません/.test(dexClassNote("NORMAL")), "現生生物に創作の注記が出ている");
  });
});
