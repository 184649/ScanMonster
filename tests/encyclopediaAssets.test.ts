import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { inspect, EXPECTED_SIZE } = require("../scripts/validateEncyclopediaAssets.js") as {
  inspect: (abs: string) => string[];
  EXPECTED_SIZE: number;
};

/**
 * 図鑑特化版：新画像の技術検査が「RGBA であること」だけで合格させないことを固定する。
 * 実際に不良 PNG を合成し、検出できることを証明する（検査器そのもののテスト）。
 */

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

/** RGBA8 の PNG を合成する。pixel(x,y) は [r,g,b,a]。 */
const makePng = (size: number, pixel: (x: number, y: number) => [number, number, number, number]): Buffer => {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bitDepth
  ihdr[9] = 6; // colorType RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y += 1) {
    raw[p] = 0; // filter none
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

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "worldawn-enc-"));
const write = (name: string, buf: Buffer): string => {
  const p = path.join(tmp, name);
  fs.writeFileSync(p, buf);
  return p;
};

/** 中央に不透明な円、周囲は完全透明＝合格すべき画像。 */
const goodPixel = (size: number) => (x: number, y: number): [number, number, number, number] => {
  const c = size / 2;
  const inside = (x - c) ** 2 + (y - c) ** 2 < (size * 0.35) ** 2;
  return inside ? [180, 140, 90, 255] : [0, 0, 0, 0];
};

describe("図鑑イラストの技術検査", () => {
  it("1024×1024・真の透明背景の画像は合格する", () => {
    const p = write("ok.png", makePng(EXPECTED_SIZE, goodPixel(EXPECTED_SIZE)));
    assert.deepEqual(inspect(p), [], "正常な画像が不合格になった");
  });

  it("RGBA でも alpha が全画素255なら不合格（背景焼き込み）", () => {
    const p = write("opaque.png", makePng(EXPECTED_SIZE, () => [238, 236, 231, 255]));
    const errs = inspect(p);
    assert.ok(
      errs.some((e) => e.includes("alpha が全画素 255")),
      `透明画素なしを検出できていない: ${JSON.stringify(errs)}`
    );
    assert.ok(errs.some((e) => e.includes("四隅")), "四隅の焼き込みを検出できていない");
  });

  it("寸法が 1024×1024 でなければ不合格", () => {
    const p = write("small.png", makePng(512, goodPixel(512)));
    assert.ok(
      inspect(p).some((e) => e.includes("512x512")),
      "寸法違反を検出できていない"
    );
  });

  it("市松模様が焼き込まれていれば不合格", () => {
    const p = write("checker.png", makePng(EXPECTED_SIZE, (x, y) => {
      const on = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
      return on ? [255, 255, 255, 255] : [204, 204, 204, 255];
    }));
    const errs = inspect(p);
    assert.ok(errs.length > 0, "市松模様を検出できていない");
    assert.ok(errs.some((e) => e.includes("四隅") || e.includes("alpha")), JSON.stringify(errs));
  });

  it("被写体が画面外で切れていれば不合格（外周に不透明画素）", () => {
    const p = write("cropped.png", makePng(EXPECTED_SIZE, (x, y) => (y > 100 ? [120, 90, 60, 255] : [0, 0, 0, 0])));
    assert.ok(
      inspect(p).some((e) => e.includes("外周に不透明画素")),
      "見切れを検出できていない"
    );
  });

  it("ほぼ空の画像（被写体が小さすぎる）は不合格", () => {
    const p = write("empty.png", makePng(EXPECTED_SIZE, (x, y) => (x < 8 && y < 8 ? [0, 0, 0, 255] : [0, 0, 0, 0])));
    assert.ok(
      inspect(p).some((e) => e.includes("被写体が小さすぎる")),
      "空画像を検出できていない"
    );
  });

  it("PNG として壊れていれば不合格", () => {
    const p = write("broken.png", Buffer.from("not a png at all", "ascii"));
    assert.deepEqual(inspect(p), ["PNG として開けない（シグネチャ / IHDR / IEND のいずれかが不正）"]);
  });

  it("IEND が欠けた切り詰め PNG は不合格", () => {
    const full = makePng(EXPECTED_SIZE, goodPixel(EXPECTED_SIZE));
    const p = write("truncated.png", full.subarray(0, full.length - 12));
    assert.deepEqual(inspect(p), ["PNG として開けない（シグネチャ / IHDR / IEND のいずれかが不正）"]);
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
