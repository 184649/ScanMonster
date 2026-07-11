/**
 * 公開前の厳格アセット検証（release gate）。npm run validate:release-assets
 *
 * canonical から releaseStatus=initial のキャラを集計し、画像の有無を検証する。
 * hasImage は releaseStatus を変更しない。initial なのに画像が無いキャラ（missing）が1体でもあれば非0終了。
 * 通常のユニットテスト（npm test）とは別。現状は4体欠損のため「FAILED as expected: 4 missing」となるのが正しい。
 */
const fs = require("fs");
const path = require("path");

const { buildCatalog, loadClassification } = require("./catalogBuild");

const root = path.join(__dirname, "..");
const charactersDir = path.join(root, "assets", "characters");
const master = JSON.parse(fs.readFileSync(path.join(charactersDir, "character_master.json"), "utf8"));
const classification = loadClassification(charactersDir);

const built = buildCatalog({ root, charactersDir, master, classification });
const all = [...built.characters, ...built.rares, ...built.legendaries];
const initial = all.filter((c) => c.releaseStatus === "initial");
const complete = initial.filter((c) => c.hasImage);
const missing = built.missingInitialAssets;

console.log("=== WORLDAWN release asset validation ===");
console.log(`canonical initial      : ${initial.length}`);
console.log(`asset complete initial : ${complete.length}`);
console.log(`missing initial assets : ${missing.length}`);
if (missing.length > 0) {
  console.log("--- missing ---");
  for (const m of missing) {
    console.log(`  ${m.id}  ${m.name} / ${m.speciesEn}  [${m.world}/${m.rarity}]`);
    console.log(`    expected: ${m.expectedPaths[0]}`);
  }
  console.error(`\nFAILED: ${missing.length} missing initial assets（future へ降格せず。画像投入後に gen:catalog/gen:seed を再実行）。`);
  process.exit(1);
}
console.log("\nOK: all initial characters have assets.");
