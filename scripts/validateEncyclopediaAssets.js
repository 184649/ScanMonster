/**
 * 図鑑特化版：新しい自然史イラストの技術検査。
 *
 * 対象は assets/encyclopedia/ 配下だけ。旧キャラクター画像（assets/characters/）は
 * 従来基準のまま validateReleaseAssets.js が担当し、この検査の対象にしない。
 *
 * 実測は scripts/pngInspect.js が行う（監査スクリプトと共通実装）。
 * RGBA 形式であることだけを合格条件にせず、**実際に画素をデコードして透明を数える**。
 *
 * 確定エラーと警告を分離する。**警告だけの画像を自動的に FAIL にしない。**
 *   確定エラー: decode 失敗 / 寸法不一致 / IEND 欠落 / 完全不透明 / 透明画素0 /
 *               ファイル名不一致 / outputPath 不一致 / 被写体が小さすぎる
 *   警告      : 緑背景・水色背景・白背景・単色背景の残存 / 市松模様 / 背景色フリンジ / 外周見切れ
 *
 * 「全身1体か」「対象種として識別できるか」「文字・ロゴ・台座・風景が無いか」は
 * 画素検査だけでは判定できないため、目視チェックリストとして報告する（自動合格にしない）。
 *
 * 終了コード: 0=不合格なし / 1=不合格あり / 2=対象画像が1枚も無い（未生成）
 *
 * 検査結果は docs/asset-audits/encyclopedia-assets-validation.json へ機械可読で出力する。
 */
const fs = require("fs");
const path = require("path");

const { inspectPng, PNG_ANALYSIS_THRESHOLDS } = require("./pngInspect");

const root = path.join(__dirname, "..");
const targetDir = path.join(root, "assets", "encyclopedia");

const listPngs = (dir) => {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listPngs(p));
    else if (e.isFile() && e.name.toLowerCase().endsWith(".png")) out.push(p);
  }
  return out;
};

/**
 * 1枚を検査する。
 * ファイル名は `<id>.png`、保存先は `assets/encyclopedia/<dexclass>/<id>.png` を期待する。
 *
 * @param {string} abs 画像の絶対パス
 * @param {{expectedId?: string}} [opts] 期待する ID（省略時はファイル名から導出）
 */
const inspectFile = (abs, opts = {}) => {
  const rel = path.relative(root, abs).replace(/\\/g, "/");
  const fileName = path.basename(abs);
  const expectedId = opts.expectedId ?? path.basename(abs, ".png");
  const dexClassDir = path.basename(path.dirname(abs));
  const expectedOutputPath = `assets/encyclopedia/${dexClassDir}/${expectedId}.png`;

  const buf = fs.readFileSync(abs);
  const analysis = inspectPng(buf, {
    expectedFileName: `${expectedId}.png`,
    actualFileName: fileName,
    expectedOutputPath,
    actualPath: rel
  });

  return { filePath: rel, fileName, expectedId, expectedOutputPath, ...analysis };
};

module.exports = { inspectFile, listPngs, PNG_ANALYSIS_THRESHOLDS };

if (require.main !== module) return;

const files = listPngs(targetDir);

console.log(`[validate:encyclopedia] 対象: assets/encyclopedia/  検出 ${files.length} 枚`);

if (files.length === 0) {
  console.log("NOT_GENERATED: 自然史図鑑イラストがまだ 1 枚も存在しません。");
  console.log("（これは失敗ではなく未生成です。生成後に再実行してください。合格とは報告しないこと。）");
  process.exit(2);
}

const results = files.map((abs) => inspectFile(abs));
const failed = results.filter((r) => r.finalStatus === "FAIL");
const warned = results.filter((r) => r.finalStatus === "PASS_WITH_WARNINGS");

for (const r of results) {
  const mark = r.finalStatus === "PASS" ? "OK  " : r.finalStatus === "PASS_WITH_WARNINGS" ? "WARN" : "NG  ";
  console.log(`  ${mark} ${r.filePath}`);
  for (const e of r.errors) console.log(`         ERROR: ${e}`);
  for (const w of r.warnings) console.log(`         WARN : ${w}`);
}

const outDir = path.join(root, "docs", "asset-audits");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "encyclopedia-assets-validation.json"),
  `${JSON.stringify(
    {
      validatedAt: new Date().toISOString().slice(0, 10),
      thresholds: PNG_ANALYSIS_THRESHOLDS,
      summary: {
        total: results.length,
        pass: results.length - failed.length - warned.length,
        passWithWarnings: warned.length,
        fail: failed.length
      },
      results
    },
    null,
    2
  )}\n`,
  "utf8"
);

console.log("");
console.log("--- 自動判定できない項目（目視で確認すること。自動合格にしない） ---");
console.log("  1. 生きものが 1 体だけか（全身）");
console.log("  2. 対象種として識別できるか");
console.log("  3. 文字・ロゴ・台座・風景が写り込んでいないか");
console.log("  4. 実在生物にファンタジー装飾が付いていないか");
console.log("  5. RARE が通常種と同じ骨格か / LEGEND が古い復元になっていないか");
console.log("");
console.log(
  `結果: PASS ${results.length - failed.length - warned.length} / PASS_WITH_WARNINGS ${warned.length} / FAIL ${failed.length}（全 ${results.length}）`
);
process.exit(failed.length > 0 ? 1 : 0);
