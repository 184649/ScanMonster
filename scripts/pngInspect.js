/**
 * PNG の実測解析（純粋・依存なし・読み取り専用）。
 *
 * 画像検査器（validateEncyclopediaAssets）と監査スクリプト（auditCharacterAssets）の共通実装。
 * Node 標準の zlib だけを使い、新規依存は追加しない。
 *
 * 設計方針：
 *  - **確定エラーと警告を分離する。** 警告だけの画像を自動的に FAIL にしない。
 *  - **色検出は単一画素で判定しない。** 外周・四隅・占有率・連続性を併用し、
 *    被写体そのものが緑や水色の生きものを背景残存と誤判定しにくくする。
 *  - しきい値はすべて名称付き定数（PNG_ANALYSIS_THRESHOLDS）で管理する。
 */
const zlib = require("zlib");

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * 検査のしきい値。すべて名称付きで、マジックナンバーをコードへ埋め込まない。
 */
const PNG_ANALYSIS_THRESHOLDS = {
  /** 期待する出力寸法（正方形）。 */
  EXPECTED_SIZE: 1024,
  /** 外周として扱う帯の幅（px）。この範囲を「背景であるべき領域」とみなす。 */
  EDGE_BAND_PX: 8,
  /** 外周帯のうち、不透明画素がこの割合を超えたら「背景が残っている」と疑う。 */
  EDGE_OPAQUE_RATIO_WARN: 0.2,
  /** 見切れ判定：画像のいちばん外側1pxのうち不透明がこの割合を超えたら疑う。 */
  OUTER_LINE_OPAQUE_RATIO_WARN: 0.02,
  /** 被写体が小さすぎる（ほぼ空画像）と判断する不透明画素の割合。 */
  MIN_OPAQUE_RATIO: 0.05,
  /** 緑背景とみなす色域（HSV 相当の簡易判定）。 */
  GREEN_HUE_MIN: 75,
  GREEN_HUE_MAX: 165,
  /** 水色（シアン）背景とみなす色相域。 */
  CYAN_HUE_MIN: 165,
  CYAN_HUE_MAX: 200,
  /** 背景残存とみなすための最低彩度。くすんだ体色を拾わないため高めに設定する。 */
  BACKGROUND_MIN_SATURATION: 0.25,
  /** 背景残存とみなすための最低明度。 */
  BACKGROUND_MIN_VALUE: 0.35,
  /** 外周帯の不透明画素のうち、対象色がこの割合を超えたら背景残存を疑う。 */
  EDGE_COLOR_RATIO_WARN: 0.6,
  /** 白背景とみなす明度の下限と彩度の上限。 */
  WHITE_MIN_VALUE: 0.88,
  WHITE_MAX_SATURATION: 0.08,
  /** 単色背景とみなす：外周帯の不透明画素のうち同系色がこの割合を超える。 */
  SOLID_EDGE_RATIO_WARN: 0.85,
  /** 単色とみなす色の距離（0-255 空間のユークリッド距離）。 */
  SOLID_COLOR_DISTANCE: 24,
  /** 市松模様の1マスとして想定するサイズ候補（px）。 */
  CHECKER_CELL_SIZES: [8, 16, 32],
  /** 市松判定：2色が交互に並ぶ一致率がこの割合を超えたら疑う。 */
  CHECKER_MATCH_RATIO_WARN: 0.85,
  /** フリンジ判定：半透明画素のうち対象色がこの割合を超えたら疑う。 */
  FRINGE_RATIO_WARN: 0.35,
  /** フリンジ判定の対象とする最小の半透明画素数（少なすぎると統計にならない）。 */
  FRINGE_MIN_SAMPLES: 200,
  /**
   * フリンジ判定：半透明画素の色相が、被写体本体の平均色相からこの角度以上離れているときだけ
   * 「背景色が縁に残っている」とみなす。被写体自身が緑や水色の生きものを誤検出しないため。
   */
  FRINGE_HUE_DISTANCE_MIN: 40
};

const T = PNG_ANALYSIS_THRESHOLDS;

/** PNG のチャンクを解析する。壊れていれば null。 */
const parsePng = (buf) => {
  if (buf.length < 8 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  let off = 8;
  let ihdr = null;
  let sawIend = false;
  const idat = [];
  while (off + 8 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString("ascii", off + 4, off + 8);
    if (off + 12 + len > buf.length && type !== "IEND") break;
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
  if (!ihdr) return null;
  return { ...ihdr, sawIend, idat: Buffer.concat(idat) };
};

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
};

/** RGBA8 の PNG をデコードして生画素を返す。 */
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

/** RGB → HSV（h:0-360, s:0-1, v:0-1）。色域判定に使う。 */
const rgbToHsv = (r, g, b) => {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / d) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / d + 2);
    else h = 60 * ((rn - gn) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max };
};

const isGreenish = (r, g, b) => {
  const { h, s, v } = rgbToHsv(r, g, b);
  return h >= T.GREEN_HUE_MIN && h < T.GREEN_HUE_MAX && s >= T.BACKGROUND_MIN_SATURATION && v >= T.BACKGROUND_MIN_VALUE;
};

const isCyanish = (r, g, b) => {
  const { h, s, v } = rgbToHsv(r, g, b);
  return h >= T.CYAN_HUE_MIN && h < T.CYAN_HUE_MAX && s >= T.BACKGROUND_MIN_SATURATION && v >= T.BACKGROUND_MIN_VALUE;
};

const isWhitish = (r, g, b) => {
  const { s, v } = rgbToHsv(r, g, b);
  return v >= T.WHITE_MIN_VALUE && s <= T.WHITE_MAX_SATURATION;
};

/**
 * PNG を実測する。
 *
 * @param {Buffer} buf PNG のバイト列
 * @param {{expectedFileName?: string, expectedOutputPath?: string, actualPath?: string}} expectations
 */
const inspectPng = (buf, expectations = {}) => {
  const errors = [];
  const warnings = [];

  const base = {
    width: null,
    height: null,
    colorType: null,
    mode: null,
    alphaMin: null,
    alphaMax: null,
    transparentPixelCount: null,
    fullyTransparentPixelCount: null,
    partiallyTransparentPixelCount: null,
    opaquePixelCount: null,
    cornerPixels: null,
    decodePassed: false,
    iendPassed: false,
    dimensionPassed: false,
    transparencyPassed: false,
    filenamePassed: true,
    outputPathPassed: true,
    checkerboardWarning: false,
    greenBackgroundWarning: false,
    cyanBackgroundWarning: false,
    whiteBackgroundWarning: false,
    solidBackgroundWarning: false,
    edgeFringeWarning: false,
    clippingWarning: false
  };

  // ---- 名前・パス照合（画素に依存しないので先に判定する）----
  if (expectations.expectedFileName && expectations.actualFileName !== undefined) {
    base.filenamePassed = expectations.actualFileName === expectations.expectedFileName;
    if (!base.filenamePassed) {
      errors.push(`ファイル名が一致しない: ${expectations.actualFileName}（期待 ${expectations.expectedFileName}）`);
    }
  }
  if (expectations.expectedOutputPath && expectations.actualPath !== undefined) {
    const norm = (p) => String(p).replace(/\\/g, "/");
    base.outputPathPassed = norm(expectations.actualPath) === norm(expectations.expectedOutputPath);
    if (!base.outputPathPassed) {
      errors.push(`outputPath が一致しない: ${norm(expectations.actualPath)}（期待 ${norm(expectations.expectedOutputPath)}）`);
    }
  }

  const png = parsePng(buf);
  if (!png) {
    errors.push("PNG として開けない（シグネチャ / IHDR が不正）");
    return { ...base, errors, warnings, finalStatus: "FAIL" };
  }

  base.width = png.width;
  base.height = png.height;
  base.colorType = png.colorType;
  base.mode = { 0: "GRAY", 2: "RGB", 3: "PALETTE", 4: "GRAY_ALPHA", 6: "RGBA" }[png.colorType] ?? `UNKNOWN(${png.colorType})`;
  base.iendPassed = png.sawIend;
  if (!png.sawIend) errors.push("IEND チャンクが無い（ファイルが途中で切れている）");

  base.dimensionPassed = png.width === T.EXPECTED_SIZE && png.height === T.EXPECTED_SIZE;
  if (!base.dimensionPassed) {
    errors.push(`寸法が ${png.width}x${png.height}（期待 ${T.EXPECTED_SIZE}x${T.EXPECTED_SIZE}）`);
  }

  if (png.colorType !== 6) {
    errors.push(`colorType=${png.colorType}（${base.mode}）。透明背景を持てない形式`);
    return { ...base, errors, warnings, finalStatus: "FAIL" };
  }
  if (png.bitDepth !== 8 || png.interlace !== 0) {
    errors.push(`bitDepth=${png.bitDepth} / interlace=${png.interlace}（期待 8 / 0）`);
    return { ...base, errors, warnings, finalStatus: "FAIL" };
  }

  let px;
  try {
    px = decodeRgba8(png);
    base.decodePassed = true;
  } catch (e) {
    errors.push(`画素デコードに失敗: ${e.message}`);
    return { ...base, errors, warnings, finalStatus: "FAIL" };
  }

  const { width, height } = png;
  const at = (x, y) => {
    const i = (y * width + x) * 4;
    return { r: px[i], g: px[i + 1], b: px[i + 2], a: px[i + 3] };
  };

  // ---- アルファ統計 ----
  let alphaMin = 255;
  let alphaMax = 0;
  let fullyTransparent = 0;
  let partiallyTransparent = 0;
  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) {
    const a = px[i];
    if (a < alphaMin) alphaMin = a;
    if (a > alphaMax) alphaMax = a;
    if (a === 0) fullyTransparent += 1;
    else if (a < 255) partiallyTransparent += 1;
    else opaque += 1;
  }
  base.alphaMin = alphaMin;
  base.alphaMax = alphaMax;
  base.fullyTransparentPixelCount = fullyTransparent;
  base.partiallyTransparentPixelCount = partiallyTransparent;
  base.opaquePixelCount = opaque;
  base.transparentPixelCount = fullyTransparent + partiallyTransparent;

  if (alphaMin === 255) errors.push("alpha が全画素 255（RGBA だが透明画素が無い＝背景が焼き込まれている）");
  if (fullyTransparent === 0) errors.push("完全透明な画素が 0（真の透明背景ではない）");
  base.transparencyPassed = alphaMin < 255 && fullyTransparent > 0;

  const totalPx = width * height;
  const opaqueRatio = opaque / totalPx;
  if (opaqueRatio < T.MIN_OPAQUE_RATIO) {
    errors.push(`不透明画素が ${(opaqueRatio * 100).toFixed(1)}%（被写体が小さすぎる、または空画像）`);
  }

  // ---- 四隅 ----
  base.cornerPixels = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1]
  ].map(([x, y]) => {
    const p = at(x, y);
    return { x, y, r: p.r, g: p.g, b: p.b, a: p.a };
  });

  // ---- 外周帯の収集（背景であるべき領域）----
  // 単一画素ではなく帯で見ることで、被写体の色を背景と誤判定しにくくする。
  const band = Math.min(T.EDGE_BAND_PX, Math.floor(Math.min(width, height) / 4));
  const edgeOpaque = [];
  let edgeTotal = 0;
  const pushEdge = (x, y) => {
    edgeTotal += 1;
    const p = at(x, y);
    if (p.a > 0) edgeOpaque.push(p);
  };
  for (let y = 0; y < band; y += 1) for (let x = 0; x < width; x += 1) pushEdge(x, y);
  for (let y = height - band; y < height; y += 1) for (let x = 0; x < width; x += 1) pushEdge(x, y);
  for (let x = 0; x < band; x += 1) for (let y = band; y < height - band; y += 1) pushEdge(x, y);
  for (let x = width - band; x < width; x += 1) for (let y = band; y < height - band; y += 1) pushEdge(x, y);

  const edgeOpaqueRatio = edgeTotal === 0 ? 0 : edgeOpaque.length / edgeTotal;

  // 外周に不透明が十分ある場合だけ、その色を調べる（被写体が中央だけなら調べない）。
  if (edgeOpaqueRatio > T.EDGE_OPAQUE_RATIO_WARN && edgeOpaque.length > 0) {
    const green = edgeOpaque.filter((p) => isGreenish(p.r, p.g, p.b)).length / edgeOpaque.length;
    const cyan = edgeOpaque.filter((p) => isCyanish(p.r, p.g, p.b)).length / edgeOpaque.length;
    const white = edgeOpaque.filter((p) => isWhitish(p.r, p.g, p.b)).length / edgeOpaque.length;

    if (green > T.EDGE_COLOR_RATIO_WARN) {
      base.greenBackgroundWarning = true;
      warnings.push(`外周の不透明画素の ${(green * 100).toFixed(0)}% が緑系（緑背景の残存が疑われる）`);
    }
    if (cyan > T.EDGE_COLOR_RATIO_WARN) {
      base.cyanBackgroundWarning = true;
      warnings.push(`外周の不透明画素の ${(cyan * 100).toFixed(0)}% が水色系（水色背景の残存が疑われる）`);
    }
    if (white > T.EDGE_COLOR_RATIO_WARN) {
      base.whiteBackgroundWarning = true;
      warnings.push(`外周の不透明画素の ${(white * 100).toFixed(0)}% が白系（白背景の残存が疑われる）`);
    }

    // 単色背景：外周の不透明画素が1色に集中しているか。
    const ref = edgeOpaque[0];
    const near =
      edgeOpaque.filter((p) => Math.hypot(p.r - ref.r, p.g - ref.g, p.b - ref.b) <= T.SOLID_COLOR_DISTANCE).length /
      edgeOpaque.length;
    if (near > T.SOLID_EDGE_RATIO_WARN) {
      base.solidBackgroundWarning = true;
      warnings.push(`外周の不透明画素の ${(near * 100).toFixed(0)}% が同系色（単色背景の残存が疑われる）`);
    }

    // 市松模様：外周帯が2色でセル単位に交互配置されているか。
    for (const cell of T.CHECKER_CELL_SIZES) {
      let match = 0;
      let checked = 0;
      for (let y = 0; y < band; y += 1) {
        for (let x = 0; x < width - cell; x += cell) {
          const a = at(x, y);
          const b = at(x + cell, y);
          if (a.a === 0 || b.a === 0) continue;
          checked += 1;
          // 隣接セルで色が明確に変わり、かつどちらも彩度が低い＝市松の典型。
          const diff = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
          const lowSat = rgbToHsv(a.r, a.g, a.b).s < 0.15 && rgbToHsv(b.r, b.g, b.b).s < 0.15;
          if (diff > T.SOLID_COLOR_DISTANCE && lowSat) match += 1;
        }
      }
      if (checked >= 8 && match / checked > T.CHECKER_MATCH_RATIO_WARN) {
        base.checkerboardWarning = true;
        warnings.push(`外周にセル ${cell}px の市松模様が疑われる（一致率 ${((match / checked) * 100).toFixed(0)}%）`);
        break;
      }
    }
  }

  // ---- 見切れ：いちばん外側1px に不透明があるか ----
  let outerOpaque = 0;
  let outerTotal = 0;
  for (let x = 0; x < width; x += 1) {
    outerTotal += 2;
    if (at(x, 0).a > 0) outerOpaque += 1;
    if (at(x, height - 1).a > 0) outerOpaque += 1;
  }
  for (let y = 0; y < height; y += 1) {
    outerTotal += 2;
    if (at(0, y).a > 0) outerOpaque += 1;
    if (at(width - 1, y).a > 0) outerOpaque += 1;
  }
  const outerRatio = outerTotal === 0 ? 0 : outerOpaque / outerTotal;
  if (outerRatio > T.OUTER_LINE_OPAQUE_RATIO_WARN) {
    base.clippingWarning = true;
    warnings.push(`画像の外周1pxの ${(outerRatio * 100).toFixed(1)}% が不透明（被写体の見切れが疑われる）`);
  }

  // ---- フリンジ：半透明画素に背景色が残っていないか ----
  if (partiallyTransparent >= T.FRINGE_MIN_SAMPLES && opaque > 0) {
    // 被写体本体の平均色相。縁の色がこれと近ければ「被写体自身のアンチエイリアス」であり、
    // 背景色の残りではない（緑のヤモリ・水色の魚を誤検出しないための基準）。
    let sr = 0;
    let sg = 0;
    let sb = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i + 3] !== 255) continue;
      sr += px[i];
      sg += px[i + 1];
      sb += px[i + 2];
    }
    const bodyHue = rgbToHsv(sr / opaque, sg / opaque, sb / opaque).h;
    const hueDistance = (a, b) => {
      const d = Math.abs(a - b) % 360;
      return d > 180 ? 360 - d : d;
    };

    let greenFringe = 0;
    let cyanFringe = 0;
    let samples = 0;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = at(x, y);
        if (p.a === 0 || p.a === 255) continue;
        samples += 1;
        // 本体と色相が近い縁は被写体自身の縁なので数えない。
        if (hueDistance(rgbToHsv(p.r, p.g, p.b).h, bodyHue) < T.FRINGE_HUE_DISTANCE_MIN) continue;
        if (isGreenish(p.r, p.g, p.b)) greenFringe += 1;
        else if (isCyanish(p.r, p.g, p.b)) cyanFringe += 1;
      }
    }
    if (samples > 0) {
      const g = greenFringe / samples;
      const c = cyanFringe / samples;
      if (g > T.FRINGE_RATIO_WARN || c > T.FRINGE_RATIO_WARN) {
        base.edgeFringeWarning = true;
        warnings.push(
          `半透明画素の ${(Math.max(g, c) * 100).toFixed(0)}% が本体と異なる${g >= c ? "緑" : "水色"}系（背景色フリンジが疑われる）`
        );
      }
    }
  }

  const finalStatus = errors.length > 0 ? "FAIL" : warnings.length > 0 ? "PASS_WITH_WARNINGS" : "PASS";
  return { ...base, errors, warnings, finalStatus };
};

module.exports = { inspectPng, parsePng, decodeRgba8, rgbToHsv, PNG_ANALYSIS_THRESHOLDS };
