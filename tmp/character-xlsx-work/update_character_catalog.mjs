import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const workbookPath = path.join(repoRoot, "assets", "characters", "Character.xlsx");
const masterPath = path.join(repoRoot, "assets", "characters", "character_master.json");
const outputDir = path.join(repoRoot, "tmp", "character-xlsx-work", "outputs");
const backupDir = path.join(repoRoot, "tmp", "character-xlsx-work", "backups");

const BASE_HEADERS = ["No", "キャラ名", "和名", "英名", "作成状況", "カタログ区分", "親種族和名", "親種族英名", "別個体メモ"];
const VARIANT_HEADERS = ["元シート", "元No", "キャラ名", "和名", "英名", "カタログ区分", "親種族和名", "親種族英名", "別個体メモ", "削除理由"];
const WORLD_SHEETS = ["動物", "魚", "虫", "植物", "恐竜", "宇宙"];

const toCellText = (value) => (value === undefined || value === null ? "" : String(value).trim());
const slug = (value) =>
  toCellText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const loadWorkbook = async () => {
  const input = await FileBlob.load(workbookPath);
  return SpreadsheetFile.importXlsx(input);
};

const getSheetNames = async (workbook) => {
  const inspected = await workbook.inspect({ kind: "sheet", include: "id,name", maxChars: 20000 });
  return inspected.ndjson
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .filter((item) => item.name)
    .map((item) => item.name);
};

const getRows = (sheet) => {
  const used = sheet.getUsedRange(true);
  const values = used?.values ?? [];
  return values.map((row) => row.map(toCellText));
};

const readRecords = (sheet) => {
  const rows = getRows(sheet);
  const headers = rows[0] ?? [];
  const index = Object.fromEntries(headers.map((header, i) => [header, i]));
  return rows
    .slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => ({
      no: toCellText(row[index.No] ?? row[0]),
      name: toCellText(row[index["キャラ名"]] ?? row[1]),
      speciesJa: toCellText(row[index["和名"]] ?? row[2]),
      speciesEn: toCellText(row[index["英名"]] ?? row[3]),
      status: toCellText(row[index["作成状況"]] ?? row[4]),
      catalogType: toCellText(row[index["カタログ区分"]]),
      parentSpeciesJa: toCellText(row[index["親種族和名"]]),
      parentSpeciesEn: toCellText(row[index["親種族英名"]]),
      variantMemo: toCellText(row[index["別個体メモ"]]),
      description: toCellText(row[index["説明"]])
    }));
};

const rowKey = (row) => slug(row.speciesEn || row.speciesJa || row.name);

const variantRules = {
  動物: {
    snow_leopard: ["ヒョウ", "Leopard", "ヒョウ種の雪山型として扱う"]
  },
  魚: {
    young_yellowtail: ["ブリ", "Yellowtail", "ブリ種の成長段階として扱う"],
    great_white_shark: ["サメ", "Shark", "サメ種の大型別個体として扱う"],
    hammerhead_shark: ["サメ", "Shark", "サメ種の頭部形状違いとして扱う"],
    whale_shark: ["サメ", "Shark", "サメ種の大型別個体として扱う"],
    manta_ray: ["エイ", "Ray", "エイ種の大型別個体として扱う"],
    deep_sea_anglerfish: ["アンコウ", "Anglerfish", "アンコウ種の深海型として扱う"],
    spiny_lobster: ["ロブスター", "Lobster", "ロブスター種の別個体として扱う"],
    snow_crab: ["カニ", "Crab", "カニ種の寒冷地型として扱う"],
    red_king_crab: ["カニ", "Crab", "カニ種の大型別個体として扱う"],
    black_sea_bream: ["タイ", "Sea Bream", "タイ種の色違い・近縁型として扱う"]
  },
  虫: {
    hercules_beetle: ["カブトムシ", "Rhinoceros Beetle", "カブトムシ種の大型別個体として扱う"],
    sawtooth_stag_beetle: ["クワガタ", "Stag Beetle", "クワガタ種のあご形状違いとして扱う"],
    miyama_stag_beetle: ["クワガタ", "Stag Beetle", "クワガタ種の山地型として扱う"],
    cabbage_white_butterfly: ["蝶", "Butterfly", "蝶種の白色型として扱う"],
    swallowtail_butterfly: ["蝶", "Butterfly", "蝶種の大型別個体として扱う"],
    black_swallowtail: ["蝶", "Butterfly", "蝶種の黒色型として扱う"],
    great_purple_emperor: ["蝶", "Butterfly", "蝶種の高レア別個体として扱う"],
    morpho_butterfly: ["蝶", "Butterfly", "蝶種の発光色違いとして扱う"],
    genji_firefly: ["ホタル", "Firefly", "ホタル種の地域型として扱う"],
    heike_firefly: ["ホタル", "Firefly", "ホタル種の地域型として扱う"],
    autumn_darter: ["トンボ", "Dragonfly", "トンボ種の季節型として扱う"],
    golden_ringed_dragonfly: ["トンボ", "Dragonfly", "トンボ種の大型別個体として扱う"],
    damselfly: ["トンボ", "Dragonfly", "トンボ種の細身別個体として扱う"],
    black_ant: ["アリ", "Ant", "アリ種の色違いとして扱う"],
    leafcutter_ant: ["アリ", "Ant", "アリ種の行動違いとして扱う"],
    army_ant: ["アリ", "Ant", "アリ種の群れ型として扱う"],
    fire_ant: ["アリ", "Ant", "アリ種の危険型として扱う"],
    orchid_mantis: ["カマキリ", "Mantis", "カマキリ種の擬態型として扱う"],
    migratory_locust: ["バッタ", "Grasshopper", "バッタ種の群生型として扱う"],
    rice_grasshopper: ["バッタ", "Grasshopper", "バッタ種の田園型として扱う"],
    tsukutsukuboshi_cicada: ["セミ", "Cicada", "セミ種の鳴き声違いとして扱う"],
    minmin_cicada: ["セミ", "Cicada", "セミ種の鳴き声違いとして扱う"],
    evening_cicada: ["セミ", "Cicada", "セミ種の夕暮れ型として扱う"],
    white_spotted_longhorn_beetle: ["カミキリムシ", "Longhorn Beetle", "カミキリムシ種の模様違いとして扱う"],
    ladybug_larva: ["テントウムシ", "Ladybug", "テントウムシ種の幼体として扱う"],
    mosquito_larva: ["カ", "Mosquito", "カ種の幼体として扱う"],
    antlion_larva: ["ウスバカゲロウ", "Antlion", "ウスバカゲロウ種の幼体として扱う"],
    green_caterpillar: ["芋虫", "Caterpillar", "芋虫種の緑色型として扱う"],
    hairy_caterpillar: ["芋虫", "Caterpillar", "芋虫種の毛並み違いとして扱う"],
    inchworm: ["芋虫", "Caterpillar", "芋虫種の歩き方違いとして扱う"],
    cocoon: ["蛾", "Moth", "蛾・蝶系のさなぎ段階として扱う"],
    tarantula: ["クモ", "Spider", "クモ種の大型別個体として扱う"],
    ground_beetle: ["オサムシ", "Ground Beetle", "重複英名のためゴミムシ側を別個体候補へ退避"]
  },
  植物: {
    dwarf_bamboo: ["タケ", "Bamboo", "タケ種の小型別個体として扱う"],
    japanese_iris: ["アヤメ", "Iris", "アヤメ種の和風別個体として扱う"],
    maple_tree: ["モミジ", "Maple", "モミジ種の樹木型として扱う"],
    lotus_root: ["ハス", "Lotus", "ハス種の地下茎部位として扱う"],
    royal_fern: ["シダ", "Fern", "シダ種の山菜型として扱う"],
    bracken: ["シダ", "Fern", "シダ種の山菜型として扱う"]
  },
  宇宙: {
    full_moon: ["月", "Moon", "月の満ち欠け違いとして扱う"],
    crescent_moon: ["月", "Moon", "月の満ち欠け違いとして扱う"],
    new_moon: ["月", "Moon", "月の満ち欠け違いとして扱う"],
    icy_moon: ["月", "Moon", "衛星の環境違いとして扱う"],
    volcanic_moon: ["月", "Moon", "衛星の環境違いとして扱う"],
    ocean_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"],
    desert_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"],
    forest_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"],
    ice_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"],
    lava_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"],
    cloud_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"],
    machine_planet: ["惑星", "Planet", "惑星種の環境違いとして扱う"]
  }
};

const additions = {
  動物: [
    ["センザンコ", "センザンコウ", "Pangolin"],
    ["ツチブタン", "ツチブタ", "Aardvark"],
    ["バイソン", "バイソン", "Bison"],
    ["トナカイン", "トナカイ", "Reindeer"]
  ],
  魚: [
    ["タラマル", "タラ", "Cod"],
    ["ニシンル", "ニシン", "Herring"],
    ["ボラロン", "ボラ", "Mullet"],
    ["ハタノコ", "ハタ", "Grouper"],
    ["カワカマスン", "カワカマス", "Pike"],
    ["ティラピィ", "ティラピア", "Tilapia"],
    ["キビナゴン", "キビナゴ", "Silver-stripe Round Herring"],
    ["メルルーサン", "メルルーサ", "Hake"],
    ["アメフラシィ", "アメフラシ", "Sea Hare"],
    ["オキアミン", "オキアミ", "Krill"]
  ],
  虫: [
    ["クモマル", "クモ", "Spider"],
    ["ダニミィ", "ダニ", "Mite"],
    ["マダニン", "マダニ", "Tick"],
    ["ノミピョン", "ノミ", "Flea"],
    ["シラミン", "シラミ", "Louse"],
    ["チャタテム", "チャタテムシ", "Booklouse"],
    ["コナジラミィ", "コナジラミ", "Whitefly"],
    ["クサカゲロウル", "クサカゲロウ", "Lacewing"],
    ["ヘビトンボン", "ヘビトンボ", "Dobsonfly"],
    ["センブリン", "センブリ", "Alderfly"],
    ["トビケラン", "トビケラ", "Caddisfly"],
    ["アザミウマル", "アザミウマ", "Thrips"],
    ["ハネカクシン", "ハネカクシ", "Rove Beetle"],
    ["マダラシミィ", "マダラシミ", "Firebrat"],
    ["ムシヒキアブン", "ムシヒキアブ", "Robber Fly"],
    ["ハナアブル", "ハナアブ", "Hoverfly"],
    ["ヒメバチン", "ヒメバチ", "Ichneumon Wasp"],
    ["グンバイムシ", "グンバイムシ", "Lace Bug"],
    ["サシガメン", "サシガメ", "Assassin Bug"],
    ["トコジラミィ", "トコジラミ", "Bed Bug"],
    ["ミズカマキリ", "ミズカマキリ", "Water Scorpion"],
    ["ミズムシン", "ミズムシ", "Water Boatman"],
    ["マツモムシィ", "マツモムシ", "Backswimmer"],
    ["カギムシン", "カギムシ", "Velvet Worm"],
    ["カニムシン", "カニムシ", "Pseudoscorpion"],
    ["ザトウムシィ", "ザトウムシ", "Harvestman"],
    ["ゲジゲジン", "ゲジ", "House Centipede"],
    ["コムカデン", "コムカデ", "Symphylan"],
    ["エダヒゲムシ", "エダヒゲムシ", "Pauropod"],
    ["イシノミィ", "イシノミ", "Bristletail"],
    ["ラクダムシン", "ラクダムシ", "Snakefly"],
    ["シロアリモドキ", "シロアリモドキ", "Webspinner"],
    ["ハバチモドキ", "キバチ", "Horntail"]
  ],
  植物: [
    ["カシロン", "カシ", "Oak"],
    ["ブナミィ", "ブナ", "Beech"],
    ["クリノコ", "クリ", "Chestnut"],
    ["クルミン", "クルミ", "Walnut"],
    ["バナナラ", "バナナ", "Banana"],
    ["パインノコ", "パイナップル", "Pineapple"]
  ],
  宇宙: [
    ["惑星ノヴァ", "惑星", "Planet"],
    ["準惑星ライト", "準惑星", "Dwarf Planet"],
    ["系外惑星ロン", "系外惑星", "Exoplanet"],
    ["小惑星帯スター", "小惑星帯", "Asteroid Belt"],
    ["オールト雲ミィ", "オールトの雲", "Oort Cloud"],
    ["カイパーベルトノヴァ", "カイパーベルト", "Kuiper Belt"],
    ["暗黒物質ライト", "暗黒物質", "Dark Matter"],
    ["暗黒エネルギーロン", "暗黒エネルギー", "Dark Energy"],
    ["重力レンズスター", "重力レンズ", "Gravitational Lens"],
    ["宇宙背景ミィ", "宇宙マイクロ波背景", "Cosmic Microwave Background"],
    ["太陽風ノヴァ", "太陽風", "Solar Wind"],
    ["磁気圏ライト", "磁気圏", "Magnetosphere"]
  ]
};

const rareFallbacks = [
  ["妖精", "妖精", "Fairy"],
  ["小人", "小人", "Dwarf"],
  ["エルフ", "エルフ", "Elf"],
  ["ユニコーン", "ユニコーン", "Unicorn"],
  ["グリフォン", "グリフォン", "Griffin"],
  ["ペガサス", "ペガサス", "Pegasus"]
];

const buildWorldRows = (sheetName, records, variants) => {
  const rules = variantRules[sheetName] ?? {};
  const seenBaseKeys = new Set();
  const baseRows = [];

  for (const row of records) {
    const key = rowKey(row);
    const rule = rules[key];
    const isGroundBeetleDuplicate =
      sheetName === "虫" && key === "ground_beetle" && row.speciesJa === "ゴミムシ";

    if (rule && (key !== "ground_beetle" || isGroundBeetleDuplicate)) {
      const [parentJa, parentEn, memo] = rule;
      variants.push({
        sourceSheet: sheetName,
        originalNo: row.no,
        name: row.name,
        speciesJa: row.speciesJa,
        speciesEn: row.speciesEn,
        catalogType: "variant_candidate",
        parentSpeciesJa: parentJa,
        parentSpeciesEn: parentEn,
        variantMemo: memo,
        reason: "同種族の別個体候補のため、ベース100体から除外"
      });
      continue;
    }

    if (!row.speciesJa && !row.speciesEn && !row.name) {
      continue;
    }

    if (seenBaseKeys.has(key)) {
      variants.push({
        sourceSheet: sheetName,
        originalNo: row.no,
        name: row.name,
        speciesJa: row.speciesJa,
        speciesEn: row.speciesEn,
        catalogType: "variant_candidate",
        parentSpeciesJa: "",
        parentSpeciesEn: "",
        variantMemo: "重複候補として退避",
        reason: "英名キー重複のため、ベース100体から除外"
      });
      continue;
    }
    seenBaseKeys.add(key);

    baseRows.push({
      ...row,
      catalogType: "base_species",
      parentSpeciesJa: "",
      parentSpeciesEn: "",
      variantMemo: ""
    });
  }

  for (const [name, speciesJa, speciesEn] of additions[sheetName] ?? []) {
    if (baseRows.length >= 100) {
      break;
    }
    const key = slug(speciesEn);
    if (seenBaseKeys.has(key)) {
      continue;
    }
    seenBaseKeys.add(key);
    baseRows.push({
      no: "",
      name,
      speciesJa,
      speciesEn,
      status: "",
      catalogType: "base_species",
      parentSpeciesJa: "",
      parentSpeciesEn: "",
      variantMemo: "",
      description: ""
    });
  }

  if (baseRows.length !== 100) {
    throw new Error(`${sheetName} must have 100 base rows, got ${baseRows.length}`);
  }

  return baseRows.map((row, index) => ({ ...row, no: String(index + 1) }));
};

const buildRareRows = (records) => {
  const rows = [];
  for (const row of records) {
    if (!row.name && !row.speciesJa && !row.speciesEn) {
      continue;
    }
    rows.push({
      ...row,
      name: row.name || row.speciesJa,
      speciesJa: row.speciesJa || row.name,
      catalogType: "rare",
      parentSpeciesJa: "",
      parentSpeciesEn: "",
      variantMemo: ""
    });
  }

  let fallbackIndex = 0;
  for (const row of rows) {
    if (!row.speciesEn) {
      const fallback = rareFallbacks[fallbackIndex++];
      if (fallback) {
        row.name = row.name || fallback[0];
        row.speciesJa = row.speciesJa || fallback[1];
        row.speciesEn = fallback[2];
      }
    }
  }

  return rows.map((row, index) => ({ ...row, no: String(index + 1) }));
};

const matrixForRows = (rows) => [
  BASE_HEADERS,
  ...rows.map((row) => [
    row.no,
    row.name,
    row.speciesJa,
    row.speciesEn,
    row.status,
    row.catalogType,
    row.parentSpeciesJa,
    row.parentSpeciesEn,
    row.variantMemo
  ])
];

const variantMatrix = (rows) => [
  VARIANT_HEADERS,
  ...rows.map((row) => [
    row.sourceSheet,
    row.originalNo,
    row.name,
    row.speciesJa,
    row.speciesEn,
    row.catalogType,
    row.parentSpeciesJa,
    row.parentSpeciesEn,
    row.variantMemo,
    row.reason
  ])
];

const writeMatrix = (sheet, matrix) => {
  sheet.getRangeByIndexes(0, 0, 220, 14).clear({ applyTo: "all" });
  const rowCount = matrix.length;
  const colCount = matrix[0].length;
  const range = sheet.getRangeByIndexes(0, 0, rowCount, colCount);
  range.values = matrix;
  sheet.getRangeByIndexes(0, 0, 1, colCount).format.font = { bold: true };
  sheet.getRangeByIndexes(0, 0, rowCount, colCount).format.wrapText = false;
  sheet.getRangeByIndexes(0, 0, rowCount, colCount).format.autofitColumns();
  sheet.freezePanes.freezeRows(1);
};

const toMasterRows = (rows) =>
  rows.map((row) => ({
    no: row.no,
    name: row.name,
    speciesJa: row.speciesJa,
    speciesEn: row.speciesEn,
    status: row.status,
    catalogType: row.catalogType,
    parentSpeciesJa: row.parentSpeciesJa,
    parentSpeciesEn: row.parentSpeciesEn,
    variantMemo: row.variantMemo,
    description: row.description ?? ""
  }));

await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(backupDir, { recursive: true });
await fs.copyFile(workbookPath, path.join(backupDir, `Character.before-variant-cleanup.${Date.now()}.xlsx`));

const workbook = await loadWorkbook();
const sheetNames = await getSheetNames(workbook);
const variants = [];
const master = {};
const finalRowsBySheet = {};

for (const sheetName of WORLD_SHEETS) {
  if (!sheetNames.includes(sheetName)) {
    continue;
  }
  const sheet = workbook.worksheets.getItem(sheetName);
  const finalRows = buildWorldRows(sheetName, readRecords(sheet), variants);
  finalRowsBySheet[sheetName] = finalRows;
  master[sheetName] = toMasterRows(finalRows);
  writeMatrix(sheet, matrixForRows(finalRows));
}

if (sheetNames.includes("レア")) {
  const rareSheet = workbook.worksheets.getItem("レア");
  const rareRows = buildRareRows(readRecords(rareSheet));
  finalRowsBySheet["レア"] = rareRows;
  master["レア"] = toMasterRows(rareRows);
  writeMatrix(rareSheet, matrixForRows(rareRows));
}

master["別個体候補"] = variants.map((row, index) => ({
  no: String(index + 1),
  sourceSheet: row.sourceSheet,
  originalNo: row.originalNo,
  name: row.name,
  speciesJa: row.speciesJa,
  speciesEn: row.speciesEn,
  catalogType: row.catalogType,
  parentSpeciesJa: row.parentSpeciesJa,
  parentSpeciesEn: row.parentSpeciesEn,
  variantMemo: row.variantMemo,
  reason: row.reason
}));

const variantSheet = workbook.worksheets.getOrAdd("別個体候補");
writeMatrix(variantSheet, variantMatrix(variants));

await fs.writeFile(masterPath, `${JSON.stringify(master, null, 2)}\n`, "utf8");

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(workbookPath);
await output.save(path.join(outputDir, "Character.updated.xlsx"));

const summary = {
  workbookPath,
  outputCopy: path.join(outputDir, "Character.updated.xlsx"),
  worldCounts: Object.fromEntries(Object.entries(finalRowsBySheet).map(([sheet, rows]) => [sheet, rows.length])),
  variantCandidateCount: variants.length,
  variantCandidatesBySheet: variants.reduce((acc, row) => {
    acc[row.sourceSheet] = (acc[row.sourceSheet] ?? 0) + 1;
    return acc;
  }, {})
};

await fs.writeFile(path.join(outputDir, "variant_cleanup_summary.json"), JSON.stringify(summary, null, 2), "utf8");
console.log(JSON.stringify(summary, null, 2));
