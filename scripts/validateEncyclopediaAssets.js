/**
 * 図鑑特化版：新しい自然史イラストの技術検査。
 *
 * 対象は assets/encyclopedia/ 配下だけ。旧キャラクター画像（assets/characters/）は
 * 従来基準のまま validateReleaseAssets.js が担当し、この検査の対象にしない。
 *
 * RGBA 形式であることだけを合格条件にしない。実際の透明画素を数える。
 *   - 1024×1024
 *   - PNG として正常に開ける（シグネチャ・IHDR・IEND・zlib 展開）
 *   - RGBA（colorType=6）
 *   - alpha 最小値 < 255（＝透明画素が実在する）
 *   - 透明画素数 > 0
 *   - 四隅が透明（背景色・市松模様の焼き込み検出）
 *   - 生きものが画面外で切れていない（外周1px が全て透明）
 *
 * 「全身1体か」「対象種として識別できるか」「文字・ロゴ・台座・風景が無いか」は
 * 画素検査だけでは判定できないため、目視チェックリストとして報告する（自動合格にしない）。
 *
 * 終了コード: 0=全件合格 / 1=不合格あり / 2=対象画像が1枚も無い（未生成）
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const root = path.join(__dirname, "..");
const targetDir = path.join(root, "assets", "encyclopedia");
const EXPECTED_SIZE = 1024;
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** PNG を解析して {width,height,colorType,bitDepth,idat} を返す。壊れていれば null。 */
const parsePng = (buf) => {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  let off = 8;
  let ihdr = null;
  let sawIend = false;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      ihdr = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        interlace: data[12]
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") {
      sawIend = true;
      break;
    }
    off += 12 + len;
  }
  if (!ihdr || !sawIend) return null;
  return { ...ihdr, idat: Buffer.concat(idat) };
};

/** Paeth predictor（PNG フィルタ type 4）。 */
const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** RGBA8 の PNG をデコードして生画素（Uint8Array, 4byte/px）を返す。 */
const decodeRgba8 = (png) => {
  const { width, height, idat } = png;
  const bpp = 4;
  const stride = width * bpp;
  const raw = zlib.inflateSync(idat);
  const out = Buffer.alloc(height * stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = raw.subarray(pos, pos + stride);
    pos += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev ? prev[x] : 0;
      const c = x >= bpp && prev ? prev[x - bpp] : 0;
      const v = line[x];
      cur[x] =
        filter === 0 ? v : filter === 1 ? v + a : filter === 2 ? v + b : filter === 3 ? v + ((a + b) >> 1) : v + paeth(a, b, c);
    }
  }
  return out;
};

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

/** 1枚を検査して不合格理由の配列を返す。 */
const inspect = (abs) => {
  const errors = [];
  const buf = fs.readFileSync(abs);
  const png = parsePng(buf);
  if (!png) return ["PNG として開けない（シグネチャ / IHDR / IEND のいずれかが不正）"];

  if (png.width !== EXPECTED_SIZE || png.height !== EXPECTED_SIZE) {
    errors.push(`寸法が ${png.width}x${png.height}（期待 ${EXPECTED_SIZE}x${EXPECTED_SIZE}）`);
  }
  if (png.colorType !== 6) {
    errors.push(`colorType=${png.colorType}（期待 6=RGBA。透明背景を持てない形式）`);
    return errors; // 画素検査は RGBA でのみ行う
  }
  if (png.bitDepth !== 8) {
    errors.push(`bitDepth=${png.bitDepth}（期待 8）`);
    return errors;
  }
  if (png.interlace !== 0) {
    errors.push("インターレース PNG は対象外");
    return errors;
  }

  let px;
  try {
    px = decodeRgba8(png);
  } catch (e) {
    return [`画素デコードに失敗: ${e.message}`];
  }

  const { width, height } = png;
  let minAlpha = 255;
  let transparent = 0;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i];
    if (a < minAlpha) minAlpha = a;
    if (a === 0) transparent += 1;
  }
  if (minAlpha === 255) errors.push("alpha が全画素 255（RGBA だが透明画素が無い＝背景が焼き込まれている）");
  if (transparent === 0) errors.push("完全透明な画素が 0（真の透明背景ではない）");

  // 四隅：背景色・市松模様の焼き込み検出
  const alphaAt = (x, y) => px[(y * width + x) * 4 + 3];
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ];
  const opaqueCorners = corners.filter(([x, y]) => alphaAt(x, y) !== 0);
  if (opaqueCorners.length > 0) {
    errors.push(`四隅に不透明画素がある（背景色または市松模様の焼き込み）: ${opaqueCorners.length}/4 隅`);
  }

  // 外周1px が全て透明か（＝主要部位が画面外で切れていない）
  let edgeOpaque = 0;
  for (let x = 0; x < width; x += 1) {
    if (alphaAt(x, 0) !== 0) edgeOpaque += 1;
    if (alphaAt(x, height - 1) !== 0) edgeOpaque += 1;
  }
  for (let y = 0; y < height; y += 1) {
    if (alphaAt(0, y) !== 0) edgeOpaque += 1;
    if (alphaAt(width - 1, y) !== 0) edgeOpaque += 1;
  }
  if (edgeOpaque > 0) errors.push(`画像の外周に不透明画素が ${edgeOpaque} 個（全身が切れている可能性）`);

  // 被写体が小さすぎる／大きすぎる（明らかな構図不良のみ検出）
  const ratio = 1 - transparent / (width * height);
  if (ratio < 0.05) errors.push(`不透明画素が ${(ratio * 100).toFixed(1)}%（被写体が小さすぎる、または空画像）`);

  return errors;
};

module.exports = { parsePng, decodeRgba8, inspect, listPngs, EXPECTED_SIZE };

if (require.main !== module) return;

const files = listPngs(targetDir);

console.log(`[validate:encyclopedia] 対象: assets/encyclopedia/  検出 ${files.length} 枚`);

if (files.length === 0) {
  console.log("NOT_GENERATED: 自然史図鑑イラストがまだ 1 枚も存在しません。");
  console.log("（これは失敗ではなく未生成です。生成後に再実行してください。合格とは報告しないこと。）");
  process.exit(2);
}

let ng = 0;
for (const abs of files) {
  const rel = path.relative(root, abs).replace(/\\/g, "/");
  const errors = inspect(abs);
  if (errors.length === 0) {
    console.log(`  OK   ${rel}`);
  } else {
    ng += 1;
    console.log(`  NG   ${rel}`);
    for (const e of errors) console.log(`         - ${e}`);
  }
}

console.log("");
console.log("--- 自動判定できない項目（目視で確認すること。自動合格にしない） ---");
console.log("  1. 生きものが 1 体だけか（全身）");
console.log("  2. 対象種として識別できるか");
console.log("  3. 文字・ロゴ・台座・風景が写り込んでいないか");
console.log("  4. 実在生物にファンタジー装飾が付いていないか");
console.log("  5. RARE が通常種と同じ骨格か / LEGEND が古い復元になっていないか");
console.log("");
console.log(`結果: 合格 ${files.length - ng} / 不合格 ${ng} / 全 ${files.length}`);
process.exit(ng > 0 ? 1 : 0);
