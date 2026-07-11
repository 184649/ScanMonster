/**
 * カタログ構築の純粋ロジック（副作用は「与えられたディレクトリの読み取り」のみ・書き込みなし）。
 * generateCharacterData.js と単体テストの双方から使う。段3。
 *
 * buildCatalog({ root, charactersDir, master }) →
 *   { characters, rares, legendaries, imageEntries }
 *  - rarity 列（normal/rare/legendary）で振り分け。
 *  - 画像解決は ①<world>/<英名>/ ②<world>/<rarity>/<英名>.png（フラット）③再帰 の順。
 */
const fs = require("fs");
const path = require("path");

const realmOf = (w) => {
  if (["ground", "waterside", "sky", "bug", "scale", "phantom"].includes(w)) return "life";
  if (["planet", "constellation"].includes(w)) return "space";
  if (["bc", "jomon", "heisei"].includes(w)) return "history";
  if (["atom", "virus"].includes(w)) return "micro";
  if (["staple_food", "dessert"].includes(w)) return "food";
  return "";
};

const slug = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const toPosix = (value) => value.split(path.sep).join("/");

const normImageKey = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\.png$/i, "")
    .replace(/[^a-z0-9]+/g, "");

const IMAGE_ALIASES = {
  rhinocerosbeetle: ["beetle"],
  raccoondog: ["tanuki"],
  hippopotamus: ["hippo"]
};

const collectDirectories = (dir) => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return [];
  const dirs = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const abs = path.join(dir, entry.name);
    dirs.push(abs, ...collectDirectories(abs));
  }
  return dirs;
};

const firstPng = (dir) => {
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return null;
  const png = fs.readdirSync(dir).find((f) => f.toLowerCase().endsWith(".png"));
  return png ? path.join(dir, png) : null;
};

const imageKeysFor = (speciesEn, isRare) => {
  const base = normImageKey(speciesEn);
  const keys = new Set([base, ...(IMAGE_ALIASES[base] ?? [])]);
  if (isRare) keys.add(normImageKey(`rare_${speciesEn}`));
  return keys;
};

const buildCatalog = ({ root, charactersDir, master }) => {
  const worldImageDirs = new Map();
  const getWorldImageDirs = (worldGroup) => {
    if (!worldImageDirs.has(worldGroup)) {
      const worldRoot = path.join(charactersDir, worldGroup);
      const dirs = collectDirectories(worldRoot).sort(
        (a, b) => path.relative(worldRoot, a).split(path.sep).length - path.relative(worldRoot, b).split(path.sep).length
      );
      worldImageDirs.set(worldGroup, dirs);
    }
    return worldImageDirs.get(worldGroup);
  };

  // <world>/<rarity>/<file>.png（rarity 直下にフラット配置）から英名一致のPNGを探す。§19。
  const findFlatPngInRarity = (worldGroup, rarity, speciesEn, isRare) => {
    const rarityDir = path.join(charactersDir, worldGroup, rarity);
    if (!fs.existsSync(rarityDir) || !fs.statSync(rarityDir).isDirectory()) return null;
    const keys = imageKeysFor(speciesEn, isRare);
    const match = fs
      .readdirSync(rarityDir)
      .filter((f) => f.toLowerCase().endsWith(".png"))
      .find((f) => keys.has(normImageKey(f)));
    return match ? path.join(rarityDir, match) : null;
  };

  const findImageFor = (worldGroup, speciesEn, isRare, rarity) => {
    // 1) 従来: <world>/<英名>/<英名>.png
    const worldPng = firstPng(path.join(charactersDir, worldGroup, speciesEn));
    if (worldPng) return worldPng;
    // 2) 新構成: <world>/<rarity>/<英名>.png（フラット）
    if (rarity) {
      const flat = findFlatPngInRarity(worldGroup, rarity, speciesEn, isRare);
      if (flat) return flat;
    }
    // 3) 再帰探索: <world>/**/<英名>/*.png（<world>/<rarity>/<英名>/<英名>.png もここで拾える）
    const keys = imageKeysFor(speciesEn, isRare);
    const worldDirMatch = getWorldImageDirs(worldGroup).find((dir) => keys.has(normImageKey(path.basename(dir))));
    return worldDirMatch ? firstPng(worldDirMatch) : null;
  };

  const characters = [];
  const rares = [];
  const legendaries = [];
  const imageEntries = [];
  const seenIds = new Set();
  const addImage = (id, abs) => {
    if (!abs) return false;
    imageEntries.push({ id, abs, requirePath: "../../" + toPosix(path.relative(root, abs)) });
    return true;
  };

  for (const [worldGroup, rows] of Object.entries(master)) {
    if (!Array.isArray(rows)) continue;
    const realmGroup = realmOf(worldGroup);
    for (const row of rows) {
      const en = (row.speciesEn || row["英名"] || "").trim();
      if (!en) continue;

      const rarityCol = String(row.rarity || "").trim().toLowerCase();
      const isRare = rarityCol === "rare";
      const isLegendary = rarityCol === "legendary";
      const rarityFolder = isLegendary ? "legendary" : isRare ? "rare" : "normal";
      const prefix = isLegendary ? `${worldGroup}_legendary` : isRare ? `${worldGroup}_rare` : worldGroup;
      let id = `${prefix}_${slug(en)}`;
      if (seenIds.has(id)) id = `${id}_${row.no || seenIds.size}`;
      seenIds.add(id);

      const hasImage = addImage(id, findImageFor(worldGroup, en, isRare, rarityFolder));
      const entry = {
        id,
        realmGroup,
        worldGroup,
        no: Number(row.no) || 0,
        name: (row.name || row["キャラ名"] || en).trim(),
        speciesJa: (row.speciesJa || row["和名"] || "").trim(),
        speciesEn: en,
        hasImage,
        description: (row.description || row["説明"] || "").trim()
      };
      if (isLegendary) legendaries.push(entry);
      else if (isRare) rares.push(entry);
      else characters.push({ ...entry, status: (row.status || row["作成状況"] || "").trim() });
    }
  }

  return { characters, rares, legendaries, imageEntries };
};

module.exports = { buildCatalog, normImageKey, imageKeysFor };
