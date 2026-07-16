/**
 * 公開前の厳格アセット検証（release gate）。npm run validate:release-assets
 *
 * canonical から releaseStatus=initial のキャラを集計し、画像の有無を検証する。
 * hasImage は releaseStatus を変更しない。initial なのに画像が無いキャラ（missing）が1体でもあれば非0終了。
 * 通常のユニットテスト（npm test）とは別。
 *
 * Phase 0 追加：initial 原画の PNG 健全性（IEND チャンクの存在＝切り詰め破損の検出）も検証する。
 * 破損原画はサムネイル生成が失敗し、原画とサムネイルのキー集合が一致しなくなるため、リリースを止める。
 */
const fs = require("fs");
const path = require("path");

const { buildCatalog, loadClassification } = require("./catalogBuild");

/** PNG が IEND チャンクを持つか（切り詰め破損の検出）。 */
const isCompletePng = (absPath) => {
  try {
    return fs.readFileSync(absPath).includes(Buffer.from("IEND", "ascii"));
  } catch {
    return false;
  }
};

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

// initial 原画の PNG 健全性（破損＝サムネイル生成不能＝原画/サムネのキー集合不一致の原因）。
const initialIds = new Set(initial.map((c) => c.id));
const corrupt = built.imageEntries.filter((e) => initialIds.has(e.id) && !isCompletePng(e.abs));
console.log(`corrupt initial images : ${corrupt.length}`);
if (corrupt.length > 0) {
  console.log("--- corrupt (PNG に IEND が無い＝ファイルが途中で切れている) ---");
  for (const e of corrupt) {
    console.log(`  ${e.id}  ${path.relative(root, e.abs)}  (${fs.statSync(e.abs).size} bytes)`);
  }
  console.error(
    `\nFAILED: ${corrupt.length} corrupt initial image(s)。原画が破損しているためサムネイルを生成できません。` +
      `\n対処: 該当の原画PNGを正常なファイルで再出力（同名・同パスで置き換え）→ npm run gen:catalog を再実行。`
  );
  process.exit(1);
}

console.log("\nOK: all initial characters have assets.");
