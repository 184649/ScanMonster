/**
 * Phase 1A パイロット画像の技術検証。npm run validate:phase1-pilot
 *
 * 検証対象は assets/characters/phase1-pilot.json の selectedCandidate に指定された画像だけ。
 *
 * ⚠️ これは**技術検証のみ**であり、画像の美的品質・生物学的正しさは判定しない。
 *    視覚評価は reports/evaluation.json（人間または視覚モデルによる採点）で別途行う。
 *    技術検証の合格を「品質合格」として報告してはいけない。
 *
 * 未生成（selectedCandidate=null）は **エラーではなく「未生成」として報告**し、
 * 「画像が無いのに成功」とは扱わない（全件未生成なら exit 2 = 未完了）。
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const pilotPath = path.join(root, "assets", "characters", "phase1-pilot.json");
const OFFICIAL_DIR = path.join(root, "assets", "characters");
const PILOT_ROOT = path.join(root, "assets", "characters", "_pilot");
const MIN_BYTES = 20 * 1024; // 1024x1024 の透過PNGとして極端に小さいものを弾く

const sha256 = (buf) => require("crypto").createHash("sha256").update(buf).digest("hex");

/** PNG の基本情報を読む（依存追加なしの自前パーサ）。 */
const readPng = (buf) => {
  const info = { signature: false, ihdr: false, iend: false, width: 0, height: 0, bitDepth: 0, colorType: -1, interlace: 0, truncated: false };
  if (buf.length < 8) return info;
  info.signature = buf.slice(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (!info.signature) return info;
  if (buf.toString("ascii", 12, 16) === "IHDR") {
    info.ihdr = true;
    info.width = buf.readUInt32BE(16);
    info.height = buf.readUInt32BE(20);
    info.bitDepth = buf[24];
    info.colorType = buf[25];
    info.interlace = buf[28];
  }
  let off = 8;
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (off + 12 + len > buf.length) {
      info.truncated = true;
      break;
    }
    if (type === "IEND") {
      info.iend = true;
      break;
    }
    off += 12 + len;
  }
  return info;
};

/** アルファの分布を調べる（デコードは jimp。既存依存のみ使用）。 */
const inspectAlpha = async (abs) => {
  const { Jimp } = require("jimp");
  const img = await Jimp.read(abs); // デコード不能ならここで throw
  const { width, height, data } = img.bitmap;
  let transparent = 0;
  let opaque = 0;
  const total = width * height;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 0) transparent++;
    else if (a === 255) opaque++;
  }
  return { width, height, total, transparent, opaque, transparentRatio: transparent / total, opaqueRatio: opaque / total };
};

const main = async () => {
  if (!fs.existsSync(pilotPath)) {
    console.error(`[validate:phase1-pilot] パイロット管理ファイルがありません: ${path.relative(root, pilotPath)}`);
    process.exit(1);
  }
  const pilot = JSON.parse(fs.readFileSync(pilotPath, "utf8"));
  const entries = pilot.selectedCharacters || [];

  console.log("=== Phase 1 パイロット画像 技術検証 ===");
  console.log(`phase=${pilot.phase} status=${pilot.status} 対象=${entries.length}種`);
  console.log("※ これは技術検証のみです。美的品質・生物学的正しさは reports/evaluation.json で別途評価してください。\n");

  const errors = [];
  const seenHash = new Map();
  let generated = 0;
  let notGenerated = 0;

  // 画像 manifest に _pilot が混入していないか（誤登録の検出）
  const manifestPath = path.join(root, "src", "assets", "characterImages.generated.ts");
  if (fs.existsSync(manifestPath)) {
    const manifest = fs.readFileSync(manifestPath, "utf8");
    if (/_pilot/.test(manifest)) errors.push("画像 manifest に _pilot のパスが混入しています（パイロットを manifest へ登録してはいけません）");
  }
  // catalog / seed への混入
  for (const [label, p] of [
    ["app catalog", path.join(root, "src", "data", "characterCatalog.generated.ts")],
    ["server seed", path.join(root, "server", "src", "characterSeed.generated.ts")]
  ]) {
    if (fs.existsSync(p) && /_pilot|phase1-pilot/.test(fs.readFileSync(p, "utf8"))) {
      errors.push(`${label} に _pilot / phase1-pilot が混入しています`);
    }
  }

  for (const e of entries) {
    const label = `${e.id} (${e.speciesJa})`;
    if (!e.selectedCandidate) {
      notGenerated++;
      console.log(`  [未生成] ${label}: selectedCandidate 未指定 → generationStatus=${e.generationStatus} / validationStatus=${e.validationStatus}`);
      if (e.validationStatus !== "not_validated") errors.push(`${e.id}: 画像未生成なのに validationStatus が not_validated ではありません`);
      if (e.promotedToOfficial) errors.push(`${e.id}: 画像未生成なのに promotedToOfficial=true です`);
      continue;
    }

    generated++;
    const rel = e.selectedCandidate;
    const abs = path.join(root, rel);

    // 正式アセットのパスへ誤保存していないか
    const absNorm = path.resolve(abs);
    if (absNorm.startsWith(path.resolve(OFFICIAL_DIR)) && !absNorm.startsWith(path.resolve(PILOT_ROOT))) {
      errors.push(`${e.id}: 正式アセット領域へ保存されています（パイロットは _pilot 配下のみ）: ${rel}`);
      continue;
    }
    // 期待するパイロットパス配下か
    if (!absNorm.startsWith(path.resolve(path.join(root, e.pilotOutputPath)))) {
      errors.push(`${e.id}: pilotOutputPath (${e.pilotOutputPath}) の外にあります: ${rel}`);
      continue;
    }
    if (!fs.existsSync(abs)) {
      errors.push(`${e.id}: ファイルが存在しません: ${rel}`);
      continue;
    }

    const buf = fs.readFileSync(abs);
    const png = readPng(buf);
    const problems = [];
    if (buf.length < MIN_BYTES) problems.push(`ファイルサイズが小さすぎます (${buf.length} bytes < ${MIN_BYTES})`);
    if (!png.signature) problems.push("PNG シグネチャが不正");
    if (!png.ihdr) problems.push("IHDR がありません");
    if (!png.iend) problems.push("IEND がありません（ファイルが途中で切れています）");
    if (png.truncated) problems.push("チャンクが途中で切断されています");
    if (png.width !== 1024 || png.height !== 1024) problems.push(`寸法が 1024x1024 ではありません (${png.width}x${png.height})`);
    if (png.colorType !== 6 && png.colorType !== 4) problems.push(`アルファチャンネルがありません (colorType=${png.colorType})`);

    // 重複検出
    const h = sha256(buf);
    if (seenHash.has(h)) problems.push(`同一画像の重複です（${seenHash.get(h)} と同じ内容）`);
    else seenHash.set(h, e.id);

    // デコードとアルファ分布
    let alpha = null;
    if (png.signature && png.iend && !png.truncated) {
      try {
        alpha = await inspectAlpha(abs);
        if (alpha.transparentRatio === 0) problems.push("完全不透明画像です（透明背景がありません）");
        if (alpha.opaqueRatio === 0 && alpha.transparentRatio === 1) problems.push("完全透明画像です（何も描かれていません）");
        if (alpha.transparentRatio > 0.98) problems.push(`ほぼ全面が透明です (透明率 ${(alpha.transparentRatio * 100).toFixed(1)}%)`);
      } catch (err) {
        problems.push(`デコードできません: ${String(err.message).slice(0, 60)}`);
      }
    }

    if (problems.length > 0) {
      console.log(`  [NG] ${label}: ${rel}`);
      for (const p of problems) console.log(`        - ${p}`);
      errors.push(`${e.id}: ${problems.length} 件の技術的問題`);
    } else {
      console.log(
        `  [OK] ${label}: ${rel}  ${png.width}x${png.height} colorType=${png.colorType} ` +
          `透明率=${(alpha.transparentRatio * 100).toFixed(1)}% ${buf.length}bytes`
      );
      if (typeof e.score === "number" && e.score < (pilot.scoreThreshold ?? 88)) {
        errors.push(`${e.id}: score=${e.score} が閾値 ${pilot.scoreThreshold ?? 88} 未満なのに selectedCandidate に指定されています`);
      }
    }
  }

  console.log(`\n生成済み: ${generated} / 未生成: ${notGenerated} / 対象: ${entries.length}`);

  if (errors.length > 0) {
    console.error(`\nFAILED: ${errors.length} 件`);
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
  if (generated === 0) {
    console.log("\nNOT_GENERATED: パイロット画像はまだ1枚も生成されていません（技術検証は未実施）。");
    console.log("ChatGPT Work で docs/legacy-character-prompts/phase1-pilot-prompts/ のプロンプトを実行し、_pilot 配下へ配置してください。");
    process.exit(2);
  }
  if (notGenerated > 0) {
    console.log(`\nPARTIAL: ${generated}種のみ検証しました。残り ${notGenerated}種は未生成です。`);
    process.exit(2);
  }
  console.log("\nOK: 全5種の技術検証を通過しました（※品質評価は別途 evaluation.json で行うこと）。");
};

main().catch((err) => {
  console.error("[validate:phase1-pilot] 想定外のエラー:", err);
  process.exit(1);
});
