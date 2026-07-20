import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { inspectPng, PNG_ANALYSIS_THRESHOLDS } = require("../scripts/pngInspect.js") as {
  inspectPng: (buf: Buffer, expectations?: Record<string, unknown>) => PngAnalysis;
  PNG_ANALYSIS_THRESHOLDS: Record<string, unknown> & { EXPECTED_SIZE: number };
};
const { inspectFile } = require("../scripts/validateEncyclopediaAssets.js") as {
  inspectFile: (abs: string, opts?: { expectedId?: string }) => PngAnalysis & { filePath: string; expectedId: string };
};

type PngAnalysis = {
  width: number | null;
  height: number | null;
  colorType: number | null;
  mode: string | null;
  alphaMin: number | null;
  alphaMax: number | null;
  transparentPixelCount: number | null;
  fullyTransparentPixelCount: number | null;
  partiallyTransparentPixelCount: number | null;
  opaquePixelCount: number | null;
  decodePassed: boolean;
  iendPassed: boolean;
  dimensionPassed: boolean;
  transparencyPassed: boolean;
  filenamePassed: boolean;
  outputPathPassed: boolean;
  checkerboardWarning: boolean;
  greenBackgroundWarning: boolean;
  cyanBackgroundWarning: boolean;
  whiteBackgroundWarning: boolean;
  solidBackgroundWarning: boolean;
  edgeFringeWarning: boolean;
  clippingWarning: boolean;
  errors: string[];
  warnings: string[];
  finalStatus: "PASS" | "PASS_WITH_WARNINGS" | "FAIL";
};

/**
 * 画像検査器そのもののテスト。
 *
 * **実キャラクター画像は一切加工しない。** 合成PNGをテスト内で生成して検証する。
 * 確定エラーと警告が分離され、警告だけの画像が FAIL にならないことを固定する。
 */

const SIZE = PNG_ANALYSIS_THRESHOLDS.EXPECTED_SIZE;

const crc32 = (buf: Buffer): number => {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
};

const chunk = (type: string, data: Buffer): Buffer => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

type Rgba = [number, number, number, number];

/** RGBA8 の PNG を合成する。 */
const makePng = (size: number, pixel: (x: number, y: number) => Rgba): Buffer => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y += 1) {
    raw[p] = 0;
    p += 1;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = pixel(x, y);
      raw[p] = r;
      raw[p + 1] = g;
      raw[p + 2] = b;
      raw[p + 3] = a;
      p += 4;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0))
  ]);
};

/** 中央の円だけが不透明、外周は完全透明。半透明の縁も持つ＝合格すべき画像。 */
const healthy =
  (size: number, body: Rgba = [180, 140, 90, 255]) =>
  (x: number, y: number): Rgba => {
    const c = size / 2;
    const d = Math.hypot(x - c, y - c);
    const r = size * 0.35;
    if (d < r - 2) return body;
    // 半透明のアンチエイリアス縁（フリンジ検出の分母になる）
    if (d < r) return [body[0], body[1], body[2], 128];
    return [0, 0, 0, 0];
  };

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "worldawn-png-"));
const write = (name: string, buf: Buffer): string => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, buf);
  return p;
};
const analyze = (buf: Buffer) => inspectPng(buf);

describe("正常系", () => {
  const buf = makePng(SIZE, healthy(SIZE));
  const r = analyze(buf);

  it("1024×1024・RGBA・IEND あり・decode 成功", () => {
    assert.equal(r.width, SIZE);
    assert.equal(r.height, SIZE);
    assert.equal(r.colorType, 6);
    assert.equal(r.mode, "RGBA");
    assert.equal(r.decodePassed, true);
    assert.equal(r.iendPassed, true);
    assert.equal(r.dimensionPassed, true);
  });

  it("本物の完全透明背景と半透明エッジを数えられる", () => {
    assert.ok(r.fullyTransparentPixelCount! > 0, "完全透明が0");
    assert.ok(r.partiallyTransparentPixelCount! > 0, "半透明エッジが0");
    assert.ok(r.opaquePixelCount! > 0, "不透明が0");
    assert.equal(
      r.transparentPixelCount,
      r.fullyTransparentPixelCount! + r.partiallyTransparentPixelCount!,
      "透明画素の合計が内訳と一致しない"
    );
    assert.equal(
      r.fullyTransparentPixelCount! + r.partiallyTransparentPixelCount! + r.opaquePixelCount!,
      SIZE * SIZE,
      "画素数の合計が一致しない"
    );
    assert.equal(r.alphaMin, 0);
    assert.equal(r.alphaMax, 255);
    assert.equal(r.transparencyPassed, true);
  });

  it("警告なしで PASS", () => {
    assert.deepEqual(r.errors, []);
    assert.deepEqual(r.warnings, []);
    assert.equal(r.finalStatus, "PASS");
  });
});

describe("確定エラー", () => {
  it("完全不透明 RGBA（透明画素0）", () => {
    const r = analyze(makePng(SIZE, () => [238, 236, 231, 255]));
    assert.ok(
      r.errors.some((e) => e.includes("alpha が全画素 255")),
      JSON.stringify(r.errors)
    );
    assert.ok(
      r.errors.some((e) => e.includes("完全透明な画素が 0")),
      JSON.stringify(r.errors)
    );
    assert.equal(r.transparencyPassed, false);
    assert.equal(r.finalStatus, "FAIL");
  });

  it("1254×1254 は寸法不一致", () => {
    const r = analyze(makePng(1254, healthy(1254)));
    assert.equal(r.dimensionPassed, false);
    assert.ok(
      r.errors.some((e) => e.includes("1254x1254")),
      JSON.stringify(r.errors)
    );
    assert.equal(r.finalStatus, "FAIL");
  });

  it("512×512 は寸法不一致", () => {
    const r = analyze(makePng(512, healthy(512)));
    assert.equal(r.dimensionPassed, false);
    assert.ok(r.errors.some((e) => e.includes("512x512")));
  });

  it("PNG 破損（シグネチャ不正）", () => {
    const r = analyze(Buffer.from("not a png at all", "ascii"));
    assert.equal(r.decodePassed, false);
    assert.equal(r.finalStatus, "FAIL");
    assert.ok(r.errors.some((e) => e.includes("PNG として開けない")));
  });

  it("IEND 欠落（切り詰め）", () => {
    const full = makePng(SIZE, healthy(SIZE));
    const r = analyze(full.subarray(0, full.length - 12));
    assert.equal(r.iendPassed, false);
    assert.ok(r.errors.some((e) => e.includes("IEND")));
    assert.equal(r.finalStatus, "FAIL");
  });

  it("ファイル名不一致", () => {
    const r = inspectPng(makePng(SIZE, healthy(SIZE)), {
      expectedFileName: "ground_sheep.png",
      actualFileName: "sheep_v2.png"
    });
    assert.equal(r.filenamePassed, false);
    assert.ok(r.errors.some((e) => e.includes("ファイル名が一致しない")));
    assert.equal(r.finalStatus, "FAIL");
  });

  it("outputPath 不一致", () => {
    const r = inspectPng(makePng(SIZE, healthy(SIZE)), {
      expectedOutputPath: "assets/encyclopedia/normal/ground_sheep.png",
      actualPath: "assets/encyclopedia/rare/ground_sheep.png"
    });
    assert.equal(r.outputPathPassed, false);
    assert.ok(r.errors.some((e) => e.includes("outputPath が一致しない")));
  });

  it("ほぼ空の画像（被写体が小さすぎる）", () => {
    const r = analyze(makePng(SIZE, (x, y) => (x < 8 && y < 8 ? [0, 0, 0, 255] : [0, 0, 0, 0])));
    assert.ok(
      r.errors.some((e) => e.includes("被写体が小さすぎる")),
      JSON.stringify(r.errors)
    );
  });
});

describe("背景残存の警告（誤検出を避けるため確定エラーにしない）", () => {
  /** 中央に被写体、周囲は背景色（透明化に失敗した状態）。 */
  const fullBackground = (color: Rgba) =>
    makePng(SIZE, (x, y) => {
      const c = SIZE / 2;
      return Math.hypot(x - c, y - c) < SIZE * 0.3 ? [180, 140, 90, 255] : color;
    });

  it("緑背景が全面に残っている", () => {
    const r = analyze(fullBackground([0, 200, 60, 255]));
    assert.equal(r.greenBackgroundWarning, true, "緑背景を検出できていない");
    assert.ok(r.warnings.some((w) => w.includes("緑系")));
  });

  it("水色背景が全面に残っている", () => {
    const r = analyze(fullBackground([0, 190, 210, 255]));
    assert.equal(r.cyanBackgroundWarning, true, "水色背景を検出できていない");
    assert.ok(r.warnings.some((w) => w.includes("水色系")));
  });

  it("白背景が全面に残っている", () => {
    const r = analyze(fullBackground([252, 252, 252, 255]));
    assert.equal(r.whiteBackgroundWarning, true, "白背景を検出できていない");
  });

  it("単色背景として検出される", () => {
    const r = analyze(fullBackground([120, 90, 200, 255]));
    assert.equal(r.solidBackgroundWarning, true, "単色背景を検出できていない");
  });

  it("背景の一部だけが残っていても外周の割合で検出できる", () => {
    // 上半分だけ緑背景が残っている
    const r = analyze(
      makePng(SIZE, (x, y) => {
        const c = SIZE / 2;
        if (Math.hypot(x - c, y - c) < SIZE * 0.3) return [180, 140, 90, 255];
        return y < SIZE / 2 ? [0, 200, 60, 255] : [0, 0, 0, 0];
      })
    );
    assert.equal(r.greenBackgroundWarning, true, "部分的な緑背景を検出できていない");
  });

  it("市松模様の焼き込み", () => {
    const r = analyze(
      makePng(SIZE, (x, y) => {
        const on = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
        return on ? [255, 255, 255, 255] : [204, 204, 204, 255];
      })
    );
    assert.equal(r.checkerboardWarning, true, "市松模様を検出できていない");
  });

  it("外周見切れ（被写体が画面外へ出ている）", () => {
    const r = analyze(makePng(SIZE, (x, y) => (y > 100 ? [120, 90, 60, 255] : [0, 0, 0, 0])));
    assert.equal(r.clippingWarning, true, "見切れを検出できていない");
  });
});

describe("背景色フリンジの警告", () => {
  /** 被写体は茶色だが、半透明のふちだけが背景色に染まっている状態。 */
  const fringed = (fringe: Rgba) =>
    makePng(SIZE, (x, y) => {
      const c = SIZE / 2;
      const d = Math.hypot(x - c, y - c);
      const r = SIZE * 0.35;
      if (d < r - 3) return [180, 140, 90, 255];
      if (d < r) return fringe;
      return [0, 0, 0, 0];
    });

  it("緑色フリンジ", () => {
    const r = analyze(fringed([0, 200, 60, 140]));
    assert.equal(r.edgeFringeWarning, true, "緑フリンジを検出できていない");
    assert.ok(r.warnings.some((w) => w.includes("フリンジ")));
  });

  it("水色フリンジ", () => {
    const r = analyze(fringed([0, 190, 210, 140]));
    assert.equal(r.edgeFringeWarning, true, "水色フリンジを検出できていない");
  });

  it("通常の茶色い縁はフリンジ扱いしない", () => {
    const r = analyze(fringed([180, 140, 90, 128]));
    assert.equal(r.edgeFringeWarning, false, "正常な半透明縁を誤検出している");
  });
});

describe("誤検出しないこと（被写体そのものが緑・水色の生きもの）", () => {
  it("中央の被写体だけが緑で外周が透明なら、緑背景と誤判定しない", () => {
    const r = analyze(makePng(SIZE, healthy(SIZE, [0, 200, 60, 255])));
    assert.equal(r.greenBackgroundWarning, false, "緑の生きものを背景残存と誤判定している");
    assert.equal(r.solidBackgroundWarning, false, "緑の生きものを単色背景と誤判定している");
    assert.equal(r.finalStatus, "PASS", `緑の生きものが PASS にならない: ${JSON.stringify(r.warnings)}`);
  });

  it("中央の被写体だけが水色で外周が透明なら、水色背景と誤判定しない", () => {
    const r = analyze(makePng(SIZE, healthy(SIZE, [0, 190, 210, 255])));
    assert.equal(r.cyanBackgroundWarning, false, "水色の生きものを背景残存と誤判定している");
    assert.equal(r.finalStatus, "PASS", `水色の生きものが PASS にならない: ${JSON.stringify(r.warnings)}`);
  });

  it("白い生きもの（羊など）を白背景と誤判定しない", () => {
    const r = analyze(makePng(SIZE, healthy(SIZE, [250, 250, 248, 255])));
    assert.equal(r.whiteBackgroundWarning, false, "白い生きものを背景残存と誤判定している");
  });
});

describe("警告だけなら FAIL にしない", () => {
  it("見切れ警告があっても、確定エラーが無ければ PASS_WITH_WARNINGS", () => {
    const r = analyze(
      makePng(SIZE, (x, y) => {
        const c = SIZE / 2;
        if (Math.hypot(x - c, y - c) < SIZE * 0.3) return [180, 140, 90, 255];
        // 左端だけ細い不透明の線（見切れ相当）
        return x < 2 ? [180, 140, 90, 255] : [0, 0, 0, 0];
      })
    );
    assert.equal(r.clippingWarning, true);
    assert.deepEqual(r.errors, [], "警告だけなのにエラーが出ている");
    assert.equal(r.finalStatus, "PASS_WITH_WARNINGS", "警告だけで FAIL になっている");
  });
});

describe("機械可読出力のフィールド", () => {
  it("仕様どおりのフィールドをすべて持つ", () => {
    const p = write("ground_sheep.png", makePng(SIZE, healthy(SIZE)));
    const r = inspectFile(p, { expectedId: "ground_sheep" });
    for (const key of [
      "filePath",
      "fileName",
      "expectedId",
      "expectedOutputPath",
      "width",
      "height",
      "colorType",
      "mode",
      "alphaMin",
      "alphaMax",
      "transparentPixelCount",
      "fullyTransparentPixelCount",
      "partiallyTransparentPixelCount",
      "opaquePixelCount",
      "decodePassed",
      "iendPassed",
      "dimensionPassed",
      "transparencyPassed",
      "filenamePassed",
      "outputPathPassed",
      "checkerboardWarning",
      "greenBackgroundWarning",
      "cyanBackgroundWarning",
      "whiteBackgroundWarning",
      "solidBackgroundWarning",
      "edgeFringeWarning",
      "clippingWarning",
      "errors",
      "warnings",
      "finalStatus"
    ]) {
      assert.ok(key in (r as unknown as Record<string, unknown>), `フィールド ${key} が無い`);
    }
  });

  it("finalStatus は PASS / PASS_WITH_WARNINGS / FAIL のいずれか", () => {
    const r = analyze(makePng(SIZE, healthy(SIZE)));
    assert.ok(["PASS", "PASS_WITH_WARNINGS", "FAIL"].includes(r.finalStatus));
  });

  it("しきい値が名称付き定数として公開されている", () => {
    assert.equal(PNG_ANALYSIS_THRESHOLDS.EXPECTED_SIZE, 1024);
    const keys = Object.keys(PNG_ANALYSIS_THRESHOLDS);
    assert.ok(keys.length >= 10, "しきい値が定数化されていない");
    for (const k of keys) assert.match(k, /^[A-Z0-9_]+$/, `${k} が定数名の形式でない`);
  });
});

describe("旧アセットは新基準の対象外", () => {
  it("assets/encyclopedia/ 以外を検査対象にしていない", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "scripts", "validateEncyclopediaAssets.js"), "utf8");
    assert.match(src, /"assets",\s*"encyclopedia"/, "検査対象が assets/encyclopedia 固定になっていない");
    assert.ok(
      !/assets[\\/]+characters/.test(src.replace(/\/\*[\s\S]*?\*\//g, "")),
      "旧キャラクター画像を新基準で検査してしまっている"
    );
  });
});
