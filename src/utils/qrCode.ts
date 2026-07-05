/**
 * 依存を増やさずにQRコードのモジュール行列を生成する自己完結ジェネレータ。
 *
 * アルゴリズムは Project Nayuki "QR Code generator"（MITライセンス, byte mode）の
 * 忠実な移植。出力は boolean[][]（true=黒）で、react-native-svg で描画する。
 * フレンドQRのペイロード（ASCII 数十文字）に十分なバージョン1〜40に対応。
 */

export type QrMatrix = {
  /** 一辺のモジュール数（4*version+17）。 */
  size: number;
  /** modules[y][x] === true なら黒モジュール。 */
  modules: boolean[][];
};

export type EccLevel = "L" | "M" | "Q" | "H";

const MIN_VERSION = 1;
const MAX_VERSION = 40;

const PENALTY_N1 = 3;
const PENALTY_N2 = 3;
const PENALTY_N3 = 40;
const PENALTY_N4 = 10;

// 各行 = ECCレベル（L,M,Q,H）、列 = バージョン（index0 は未使用）。
const ECC_CODEWORDS_PER_BLOCK: number[][] = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
];

const NUM_ERROR_CORRECTION_BLOCKS: number[][] = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
];

// ECC ordinal と format bits。L=0,M=1,Q=2,H=3。
const ECC_ORDINAL: Record<EccLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };
const ECC_FORMAT_BITS: Record<EccLevel, number> = { L: 1, M: 0, Q: 3, H: 2 };

const getBit = (value: number, index: number): boolean => ((value >>> index) & 1) !== 0;

const toUtf8 = (text: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i);

    // サロゲートペア結合。
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
        i += 1;
      }
    }

    if (code < 0x80) {
      bytes.push(code);
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
  }
  return bytes;
};

const getNumRawDataModules = (version: number): number => {
  let result = (16 * version + 128) * version + 64;
  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    result -= (25 * numAlign - 10) * numAlign - 55;
    if (version >= 7) {
      result -= 36;
    }
  }
  return result;
};

const getNumDataCodewords = (version: number, ecl: EccLevel): number => {
  const ord = ECC_ORDINAL[ecl];
  return (
    Math.floor(getNumRawDataModules(version) / 8) -
    ECC_CODEWORDS_PER_BLOCK[ord]![version]! * NUM_ERROR_CORRECTION_BLOCKS[ord]![version]!
  );
};

const byteModeCharCountBits = (version: number): number => (version <= 9 ? 8 : 16);

const reedSolomonMultiply = (x: number, y: number): number => {
  let z = 0;
  for (let i = 7; i >= 0; i -= 1) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z & 0xff;
};

const reedSolomonComputeDivisor = (degree: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < degree - 1; i += 1) {
    result.push(0);
  }
  result.push(1);

  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = 0; j < result.length; j += 1) {
      result[j] = reedSolomonMultiply(result[j]!, root);
      if (j + 1 < result.length) {
        result[j] = result[j]! ^ result[j + 1]!;
      }
    }
    root = reedSolomonMultiply(root, 0x02);
  }
  return result;
};

const reedSolomonComputeRemainder = (data: number[], divisor: number[]): number[] => {
  const result: number[] = divisor.map(() => 0);
  for (const b of data) {
    const factor = b ^ (result.shift() as number);
    result.push(0);
    divisor.forEach((coef, i) => {
      result[i] = result[i]! ^ reedSolomonMultiply(coef, factor);
    });
  }
  return result;
};

const getAlignmentPatternPositions = (version: number): number[] => {
  if (version === 1) {
    return [];
  }
  const size = version * 4 + 17;
  const numAlign = Math.floor(version / 7) + 2;
  const step = version === 32 ? 26 : Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
  const result: number[] = [6];
  for (let pos = size - 7; result.length < numAlign; pos -= step) {
    result.splice(1, 0, pos);
  }
  return result;
};

type Grid = {
  size: number;
  modules: boolean[][];
  isFunction: boolean[][];
};

const setFunctionModule = (grid: Grid, x: number, y: number, isDark: boolean): void => {
  grid.modules[y]![x] = isDark;
  grid.isFunction[y]![x] = true;
};

const drawFinderPattern = (grid: Grid, x: number, y: number): void => {
  for (let dy = -4; dy <= 4; dy += 1) {
    for (let dx = -4; dx <= 4; dx += 1) {
      const dist = Math.max(Math.abs(dx), Math.abs(dy));
      const xx = x + dx;
      const yy = y + dy;
      if (xx >= 0 && xx < grid.size && yy >= 0 && yy < grid.size) {
        setFunctionModule(grid, xx, yy, dist !== 2 && dist !== 4);
      }
    }
  }
};

const drawAlignmentPattern = (grid: Grid, x: number, y: number): void => {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      setFunctionModule(grid, x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
};

const drawFormatBits = (grid: Grid, ecl: EccLevel, mask: number): void => {
  const data = (ECC_FORMAT_BITS[ecl] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) {
    rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  }
  const bits = ((data << 10) | rem) ^ 0x5412;

  for (let i = 0; i <= 5; i += 1) {
    setFunctionModule(grid, 8, i, getBit(bits, i));
  }
  setFunctionModule(grid, 8, 7, getBit(bits, 6));
  setFunctionModule(grid, 8, 8, getBit(bits, 7));
  setFunctionModule(grid, 7, 8, getBit(bits, 8));
  for (let i = 9; i < 15; i += 1) {
    setFunctionModule(grid, 14 - i, 8, getBit(bits, i));
  }

  const size = grid.size;
  for (let i = 0; i < 8; i += 1) {
    setFunctionModule(grid, size - 1 - i, 8, getBit(bits, i));
  }
  for (let i = 8; i < 15; i += 1) {
    setFunctionModule(grid, 8, size - 15 + i, getBit(bits, i));
  }
  setFunctionModule(grid, 8, size - 8, true);
};

const drawVersion = (grid: Grid, version: number): void => {
  if (version < 7) {
    return;
  }
  let rem = version;
  for (let i = 0; i < 12; i += 1) {
    rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
  }
  const bits = (version << 12) | rem;
  for (let i = 0; i < 18; i += 1) {
    const color = getBit(bits, i);
    const a = grid.size - 11 + (i % 3);
    const b = Math.floor(i / 3);
    setFunctionModule(grid, a, b, color);
    setFunctionModule(grid, b, a, color);
  }
};

const drawFunctionPatterns = (grid: Grid, version: number, ecl: EccLevel): void => {
  const size = grid.size;
  for (let i = 0; i < size; i += 1) {
    setFunctionModule(grid, 6, i, i % 2 === 0);
    setFunctionModule(grid, i, 6, i % 2 === 0);
  }

  drawFinderPattern(grid, 3, 3);
  drawFinderPattern(grid, size - 4, 3);
  drawFinderPattern(grid, 3, size - 4);

  const alignPos = getAlignmentPatternPositions(version);
  const numAlign = alignPos.length;
  for (let i = 0; i < numAlign; i += 1) {
    for (let j = 0; j < numAlign; j += 1) {
      if ((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0)) {
        continue;
      }
      drawAlignmentPattern(grid, alignPos[i]!, alignPos[j]!);
    }
  }

  drawFormatBits(grid, ecl, 0);
  drawVersion(grid, version);
};

const drawCodewords = (grid: Grid, data: number[]): void => {
  const size = grid.size;
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) {
      right = 5;
    }
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const x = right - j;
        const upward = ((right + 1) & 2) === 0;
        const y = upward ? size - 1 - vert : vert;
        if (!grid.isFunction[y]![x] && i < data.length * 8) {
          grid.modules[y]![x] = getBit(data[i >>> 3]!, 7 - (i & 7));
          i += 1;
        }
      }
    }
  }
};

const applyMask = (grid: Grid, mask: number): void => {
  const size = grid.size;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      if (grid.isFunction[y]![x]) {
        continue;
      }
      let invert = false;
      switch (mask) {
        case 0:
          invert = (x + y) % 2 === 0;
          break;
        case 1:
          invert = y % 2 === 0;
          break;
        case 2:
          invert = x % 3 === 0;
          break;
        case 3:
          invert = (x + y) % 3 === 0;
          break;
        case 4:
          invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
          break;
        case 5:
          invert = ((x * y) % 2) + ((x * y) % 3) === 0;
          break;
        case 6:
          invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
        case 7:
          invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
          break;
        default:
          break;
      }
      if (invert) {
        grid.modules[y]![x] = !grid.modules[y]![x];
      }
    }
  }
};

const finderPenaltyAddHistory = (currentRunLength: number, runHistory: number[], size: number): void => {
  let run = currentRunLength;
  if (runHistory[0] === 0) {
    run += size;
  }
  runHistory.pop();
  runHistory.unshift(run);
};

const finderPenaltyCountPatterns = (runHistory: number[]): number => {
  const n = runHistory[1]!;
  const core = n > 0 && runHistory[2] === n && runHistory[3] === n * 3 && runHistory[4] === n && runHistory[5] === n;
  return (
    (core && runHistory[0]! >= n * 4 && runHistory[6]! >= n ? 1 : 0) +
    (core && runHistory[6]! >= n * 4 && runHistory[0]! >= n ? 1 : 0)
  );
};

const finderPenaltyTerminateAndCount = (
  currentRunColor: boolean,
  currentRunLength: number,
  runHistory: number[],
  size: number
): number => {
  let run = currentRunLength;
  if (currentRunColor) {
    finderPenaltyAddHistory(run, runHistory, size);
    run = 0;
  }
  run += size;
  finderPenaltyAddHistory(run, runHistory, size);
  return finderPenaltyCountPatterns(runHistory);
};

const getPenaltyScore = (grid: Grid): number => {
  const size = grid.size;
  const modules = grid.modules;
  let result = 0;

  for (let y = 0; y < size; y += 1) {
    let runColor = false;
    let runX = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let x = 0; x < size; x += 1) {
      if (modules[y]![x] === runColor) {
        runX += 1;
        if (runX === 5) {
          result += PENALTY_N1;
        } else if (runX > 5) {
          result += 1;
        }
      } else {
        finderPenaltyAddHistory(runX, runHistory, size);
        if (!runColor) {
          result += finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        }
        runColor = modules[y]![x]!;
        runX = 1;
      }
    }
    result += finderPenaltyTerminateAndCount(runColor, runX, runHistory, size) * PENALTY_N3;
  }

  for (let x = 0; x < size; x += 1) {
    let runColor = false;
    let runY = 0;
    const runHistory = [0, 0, 0, 0, 0, 0, 0];
    for (let y = 0; y < size; y += 1) {
      if (modules[y]![x] === runColor) {
        runY += 1;
        if (runY === 5) {
          result += PENALTY_N1;
        } else if (runY > 5) {
          result += 1;
        }
      } else {
        finderPenaltyAddHistory(runY, runHistory, size);
        if (!runColor) {
          result += finderPenaltyCountPatterns(runHistory) * PENALTY_N3;
        }
        runColor = modules[y]![x]!;
        runY = 1;
      }
    }
    result += finderPenaltyTerminateAndCount(runColor, runY, runHistory, size) * PENALTY_N3;
  }

  for (let y = 0; y < size - 1; y += 1) {
    for (let x = 0; x < size - 1; x += 1) {
      const color = modules[y]![x];
      if (color === modules[y]![x + 1] && color === modules[y + 1]![x] && color === modules[y + 1]![x + 1]) {
        result += PENALTY_N2;
      }
    }
  }

  let dark = 0;
  for (const row of modules) {
    for (const cell of row) {
      if (cell) {
        dark += 1;
      }
    }
  }
  const total = size * size;
  const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
  result += k * PENALTY_N4;

  return result;
};

const addEccAndInterleave = (data: number[], version: number, ecl: EccLevel): number[] => {
  const ord = ECC_ORDINAL[ecl];
  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[ord]![version]!;
  const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ord]![version]!;
  const rawCodewords = Math.floor(getNumRawDataModules(version) / 8);
  const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
  const shortBlockLen = Math.floor(rawCodewords / numBlocks);

  const blocks: number[][] = [];
  const rsDiv = reedSolomonComputeDivisor(blockEccLen);
  let k = 0;
  for (let i = 0; i < numBlocks; i += 1) {
    const dat = data.slice(k, k + shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1));
    k += dat.length;
    const ecc = reedSolomonComputeRemainder(dat, rsDiv);
    if (i < numShortBlocks) {
      dat.push(0);
    }
    blocks.push(dat.concat(ecc));
  }

  const result: number[] = [];
  for (let i = 0; i < blocks[0]!.length; i += 1) {
    blocks.forEach((block, j) => {
      if (i !== shortBlockLen - blockEccLen || j >= numShortBlocks) {
        result.push(block[i]!);
      }
    });
  }
  return result;
};

const buildDataCodewords = (bytes: number[], version: number, ecl: EccLevel): number[] => {
  const bits: number[] = [];
  const appendBits = (value: number, len: number): void => {
    for (let i = len - 1; i >= 0; i -= 1) {
      bits.push((value >>> i) & 1);
    }
  };

  appendBits(0x4, 4); // byte mode
  appendBits(bytes.length, byteModeCharCountBits(version));
  for (const b of bytes) {
    appendBits(b, 8);
  }

  const dataCapacityBits = getNumDataCodewords(version, ecl) * 8;
  appendBits(0, Math.min(4, dataCapacityBits - bits.length));
  appendBits(0, (8 - (bits.length % 8)) % 8);
  for (let padByte = 0xec; bits.length < dataCapacityBits; padByte ^= 0xec ^ 0x11) {
    appendBits(padByte, 8);
  }

  const dataCodewords = new Array<number>(bits.length >>> 3).fill(0);
  bits.forEach((bit, i) => {
    dataCodewords[i >>> 3]! |= bit << (7 - (i & 7));
  });
  return dataCodewords;
};

/**
 * テキストをQRコードのモジュール行列へエンコードする。
 * ECCは既定 M。バージョンは自動選択し、余裕があればECCを引き上げる（読み取り耐性向上）。
 */
export const generateQrMatrix = (text: string, minEcc: EccLevel = "M"): QrMatrix => {
  const bytes = toUtf8(text);

  // バージョン選択。
  let version = MIN_VERSION;
  for (; version <= MAX_VERSION; version += 1) {
    const usedBits = 4 + byteModeCharCountBits(version) + bytes.length * 8;
    if (usedBits <= getNumDataCodewords(version, minEcc) * 8) {
      break;
    }
    if (version === MAX_VERSION) {
      throw new Error("QRデータが大きすぎます。");
    }
  }

  // ECC引き上げ（同一バージョンで収まる範囲でより高いECCへ）。
  let ecl = minEcc;
  const usedBits = 4 + byteModeCharCountBits(version) + bytes.length * 8;
  for (const candidate of ["M", "Q", "H"] as EccLevel[]) {
    if (ECC_ORDINAL[candidate] > ECC_ORDINAL[ecl] && usedBits <= getNumDataCodewords(version, candidate) * 8) {
      ecl = candidate;
    }
  }

  const dataCodewords = buildDataCodewords(bytes, version, ecl);
  const allCodewords = addEccAndInterleave(dataCodewords, version, ecl);

  const size = version * 4 + 17;
  const grid: Grid = {
    size,
    modules: Array.from({ length: size }, () => new Array<boolean>(size).fill(false)),
    isFunction: Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  };

  drawFunctionPatterns(grid, version, ecl);
  drawCodewords(grid, allCodewords);

  // 最良マスクを選ぶ。
  let bestMask = 0;
  let minPenalty = Number.MAX_SAFE_INTEGER;
  for (let mask = 0; mask < 8; mask += 1) {
    applyMask(grid, mask);
    drawFormatBits(grid, ecl, mask);
    const penalty = getPenaltyScore(grid);
    if (penalty < minPenalty) {
      minPenalty = penalty;
      bestMask = mask;
    }
    applyMask(grid, mask); // 元に戻す。
  }

  applyMask(grid, bestMask);
  drawFormatBits(grid, ecl, bestMask);

  return { size, modules: grid.modules };
};
