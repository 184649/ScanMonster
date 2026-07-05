import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const workbookPath = path.join(repoRoot, "assets", "characters", "Character.xlsx");
const outputDir = path.join(repoRoot, "tmp", "character-xlsx-work", "outputs");
const previewDir = path.join(repoRoot, "tmp", "character-xlsx-work", "previews");

const loadWorkbook = async () => {
  const input = await FileBlob.load(workbookPath);
  return SpreadsheetFile.importXlsx(input);
};

const colName = (index) => {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const mod = (n - 1) % 26;
    s = String.fromCharCode(65 + mod) + s;
    n = Math.floor((n - mod) / 26);
  }
  return s;
};

const toRows = (values) =>
  values.map((row) => row.map((value) => (value === undefined || value === null ? "" : String(value).trim())));

const getUsedRows = (sheet) => {
  const used = sheet.getUsedRange(true);
  if (!used) {
    return [];
  }
  return toRows(used.values ?? []);
};

const sheetNames = async (workbook) => {
  const inspected = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 20000 });
  return inspected.ndjson
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((item) => item.name)
    .map((item) => item.name);
};

const summarize = async () => {
  const workbook = await loadWorkbook();
  const names = await sheetNames(workbook);
  const summary = [];
  for (const name of names) {
    const sheet = workbook.worksheets.getItem(name);
    const rows = getUsedRows(sheet);
    const headers = rows[0] ?? [];
    const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell !== ""));
    summary.push({
      sheet: name,
      rows: dataRows.length,
      headers,
      sample: dataRows.slice(0, 5)
    });
  }
  console.log(JSON.stringify(summary, null, 2));
};

const renderPreview = async () => {
  const workbook = await loadWorkbook();
  await fs.mkdir(previewDir, { recursive: true });
  const names = await sheetNames(workbook);
  for (const name of names) {
    const safeName = name.replace(/[\\/:*?"<>|]/g, "_");
    const blob = await workbook.render({ sheetName: name, range: "A1:L18", scale: 1, format: "png" });
    await fs.writeFile(path.join(previewDir, `${safeName}.png`), new Uint8Array(await blob.arrayBuffer()));
  }
  console.log(previewDir);
};

const dumpRows = async () => {
  const workbook = await loadWorkbook();
  const names = await sheetNames(workbook);
  const result = {};
  for (const name of names) {
    const sheet = workbook.worksheets.getItem(name);
    result[name] = getUsedRows(sheet);
  }
  const outPath = path.join(outputDir, "character_rows.json");
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(result, null, 2), "utf8");
  console.log(outPath);
};

const command = process.argv[2] ?? "summary";

try {
  if (command === "summary") {
    await summarize();
  } else if (command === "render") {
    await renderPreview();
  } else if (command === "dump") {
    await dumpRows();
  } else {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
} catch (error) {
  console.error(error?.stack ?? error);
  process.exit(1);
}

export { colName, getUsedRows, loadWorkbook, outputDir, previewDir, workbookPath };
