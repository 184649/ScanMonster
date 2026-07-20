/**
 * 現行正式キャラクター画像の実測監査（**読み取り専用**）。
 *
 * これは v6 採用画像の監査ではない。現在リポジトリに存在する正式画像を、
 * 技術情報だけ実測して記録する（画風の採否・v6適合性は判定しない）。
 *
 * 画像本体は一切変更しない（読み取りのみ。書き込みは監査結果 JSON/MD だけ）。
 *
 * 使い方:
 *   node scripts/auditCharacterAssets.js [id ...]
 *   引数なしのときは既定の5件（Sheep/Gorilla/Elephant/Gecko/Mole）を監査する。
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const { inspectPng, PNG_ANALYSIS_THRESHOLDS } = require("./pngInspect");

const root = path.join(__dirname, "..");

/** 既定の監査対象。カタログID → 表示用メタ。 */
const DEFAULT_TARGETS = [
  { id: "ground_sheep", name: "ツノヒツジ", motif: "羊 / Sheep" },
  { id: "ground_gorilla", name: "ゴリマル", motif: "ゴリラ / Gorilla" },
  { id: "ground_elephant", name: "ゾウノコ", motif: "ゾウ / Elephant" },
  { id: "ground_gecko", name: "ヤモリン", motif: "ヤモリ / Gecko" },
  { id: "ground_mole", name: "モグリット", motif: "モグラ / Mole" }
];

/** 画像 manifest から id → 正式相対パスを引く（正式パスの唯一の根拠）。 */
const loadOfficialPaths = () => {
  const src = fs.readFileSync(path.join(root, "src", "assets", "characterImages.generated.ts"), "utf8");
  const i = src.indexOf("export const CHARACTER_IMAGES");
  const section = src.slice(i, src.indexOf("};", i));
  const map = new Map();
  for (const m of section.matchAll(/"([^"]+)":\s*require\("\.\.\/\.\.\/([^"]+)"\)/g)) {
    map.set(m[1], m[2]);
  }
  return map;
};

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

const auditOne = (target, officialPaths) => {
  const rel = officialPaths.get(target.id);
  const base = {
    id: target.id,
    characterName: target.name,
    motifSpecies: target.motif,
    officialPath: rel ?? null
  };

  if (!rel) {
    return { ...base, finalStatus: "FAIL", errors: ["画像 manifest に正式パスが登録されていない"], warnings: [] };
  }

  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    return { ...base, finalStatus: "FAIL", errors: [`正式パスにファイルが存在しない: ${rel}`], warnings: [] };
  }

  const buf = fs.readFileSync(abs);
  // 期待値＝manifest の正式パス。実体＝実際に読み込んだパス。両者を照合する。
  const analysis = inspectPng(buf, {
    expectedFileName: path.basename(rel),
    actualFileName: path.basename(abs),
    expectedOutputPath: rel,
    actualPath: path.relative(root, abs)
  });

  return {
    ...base,
    fileName: path.basename(rel),
    sha256: sha256(buf),
    fileSize: buf.length,
    ...analysis
  };
};

const targets = process.argv.slice(2).length > 0
  ? process.argv.slice(2).map((id) => ({ id, name: id, motif: "" }))
  : DEFAULT_TARGETS;

const officialPaths = loadOfficialPaths();
const results = targets.map((t) => auditOne(t, officialPaths));

const outDir = path.join(root, "docs", "asset-audits");
fs.mkdirSync(outDir, { recursive: true });

const report = {
  _comment:
    "現行正式キャラクター画像の実測監査。v6 採用画像の監査ではない。技術情報のみを記録し、画風の採否・v6 適合性は判定しない。画像本体は変更していない（読み取り専用）。",
  auditedAt: new Date().toISOString().slice(0, 10),
  auditKind: "current-official-character-assets",
  thresholds: PNG_ANALYSIS_THRESHOLDS,
  summary: {
    total: results.length,
    pass: results.filter((r) => r.finalStatus === "PASS").length,
    passWithWarnings: results.filter((r) => r.finalStatus === "PASS_WITH_WARNINGS").length,
    fail: results.filter((r) => r.finalStatus === "FAIL").length
  },
  results
};

const jsonPath = path.join(outDir, "current-character-assets-audit.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

// ---- 人間が読む概要（Markdown）----
const n = (v) => (typeof v === "number" ? v.toLocaleString("en-US") : "—");
const yn = (v) => (v === true ? "有" : v === false ? "**無**" : "—");
const md = [];
md.push("# 現行正式キャラクター画像の実測監査");
md.push("");
md.push("> **これは v6 採用画像の監査ではありません。**");
md.push("> 現在このリポジトリに存在する正式画像を、技術情報だけ実測した結果です。");
md.push("> 画風の採否・v6 適合性は判定していません。**画像本体は変更していません（読み取り専用）。**");
md.push("");
md.push(`監査日: ${report.auditedAt}　／　対象 ${report.summary.total} 件`);
md.push("");
md.push(
  `結果: **PASS ${report.summary.pass}** / PASS_WITH_WARNINGS ${report.summary.passWithWarnings} / **FAIL ${report.summary.fail}**`
);
md.push("");
md.push("## 一覧");
md.push("");
md.push("| id | キャラ名 | モデル生物 | 寸法 | mode | IEND | alphaMin | 完全透明 | 半透明 | 判定 |");
md.push("|---|---|---|---|---|---|---|---|---|---|");
for (const r of results) {
  md.push(
    `| \`${r.id}\` | ${r.characterName} | ${r.motifSpecies || "—"} | ${r.width ?? "—"}×${r.height ?? "—"} | ${r.mode ?? "—"} | ${yn(r.iendPassed)} | ${r.alphaMin ?? "—"} | ${n(r.fullyTransparentPixelCount)} | ${n(r.partiallyTransparentPixelCount)} | **${r.finalStatus}** |`
  );
}
md.push("");
md.push("## 明細");
for (const r of results) {
  md.push("");
  md.push(`### ${r.characterName}（\`${r.id}\`）— ${r.finalStatus}`);
  md.push("");
  md.push(`- 正式パス: \`${r.officialPath ?? "—"}\``);
  md.push(`- SHA-256: \`${r.sha256 ?? "—"}\``);
  md.push(`- ファイルサイズ: ${n(r.fileSize)} バイト`);
  md.push(`- 寸法 / colorType / mode: ${r.width ?? "—"}×${r.height ?? "—"} / ${r.colorType ?? "—"} / ${r.mode ?? "—"}`);
  md.push(`- PNG decode: ${yn(r.decodePassed)}　IEND: ${yn(r.iendPassed)}`);
  md.push(`- alphaMin / alphaMax: ${r.alphaMin ?? "—"} / ${r.alphaMax ?? "—"}`);
  md.push(
    `- 透明画素: 合計 ${n(r.transparentPixelCount)}（完全透明 ${n(r.fullyTransparentPixelCount)} / 半透明 ${n(r.partiallyTransparentPixelCount)}）／不透明 ${n(r.opaquePixelCount)}`
  );
  if (r.cornerPixels) {
    md.push(`- 四隅 RGBA: ${r.cornerPixels.map((c) => `(${c.r},${c.g},${c.b},${c.a})`).join(" ")}`);
  }
  const flags = [
    ["市松模様焼き込み", r.checkerboardWarning],
    ["緑背景残存", r.greenBackgroundWarning],
    ["水色背景残存", r.cyanBackgroundWarning],
    ["白背景残存", r.whiteBackgroundWarning],
    ["単色背景残存", r.solidBackgroundWarning],
    ["背景色フリンジ", r.edgeFringeWarning],
    ["外周見切れ", r.clippingWarning]
  ];
  md.push(`- 背景・見切れの疑い: ${flags.filter(([, v]) => v).map(([k]) => k).join(" / ") || "**なし**"}`);
  if ((r.errors ?? []).length > 0) {
    md.push("- **確定エラー**:");
    for (const e of r.errors) md.push(`  - ${e}`);
  }
  if ((r.warnings ?? []).length > 0) {
    md.push("- 警告:");
    for (const w of r.warnings) md.push(`  - ${w}`);
  }
}
md.push("");
md.push("## 判定の定義");
md.push("");
md.push("- **PASS**: 確定エラー・警告ともになし");
md.push("- **PASS_WITH_WARNINGS**: 確定エラーなし。警告のみ（警告だけで FAIL にはしない）");
md.push("- **FAIL**: 確定エラーあり（decode 失敗／寸法不一致／IEND 欠落／完全不透明／透明画素0／名前・パス不一致など）");
md.push("");
md.push("しきい値は `scripts/pngInspect.js` の `PNG_ANALYSIS_THRESHOLDS` に名称付き定数として定義しています。");
md.push("");
const mdPath = path.join(outDir, "current-character-assets-audit.md");
fs.writeFileSync(mdPath, `${md.join("\n")}\n`, "utf8");

console.log(`[audit] ${results.length} 件を監査しました → ${path.relative(root, jsonPath).replace(/\\/g, "/")}`);
for (const r of results) {
  const mark = r.finalStatus === "PASS" ? "OK  " : r.finalStatus === "PASS_WITH_WARNINGS" ? "WARN" : "FAIL";
  console.log(`  ${mark} ${r.id} ${r.width ?? "?"}x${r.height ?? "?"} alphaMin=${r.alphaMin ?? "-"} ${r.officialPath ?? ""}`);
  for (const e of r.errors ?? []) console.log(`         ERROR: ${e}`);
  for (const w of r.warnings ?? []) console.log(`         WARN : ${w}`);
}
console.log(
  `結果: PASS ${report.summary.pass} / PASS_WITH_WARNINGS ${report.summary.passWithWarnings} / FAIL ${report.summary.fail}`
);
