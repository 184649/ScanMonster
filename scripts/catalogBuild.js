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

const buildCatalog = ({ root, charactersDir, master, classification = {} }) => {
  const rarityOverrides = classification.rarity || {};
  const rs = classification.releaseStatus || {};
  const worldDefault = rs.worldDefault || {};
  const byIdStatus = rs.byId || {};
  const missingInitialAssets = []; // releaseStatus=initial だが画像が解決できないもの（future へ降格しない・release gate で失敗）。
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
  const secrets = []; // secret は通常 catalog へ出さない（呼び出し側で秘匿）。
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

      // id は「manifest の rarity」から決めて安定させる（rarity 上書きしても id は変わらない・§9）。
      const manifestRarity = String(row.rarity || "").trim().toLowerCase();
      const isRareM = manifestRarity === "rare";
      const isLegendaryM = manifestRarity === "legendary";
      const prefix = isLegendaryM ? `${worldGroup}_legendary` : isRareM ? `${worldGroup}_rare` : worldGroup;
      let id = `${prefix}_${slug(en)}`;
      if (seenIds.has(id)) id = `${id}_${row.no || seenIds.size}`;
      seenIds.add(id);

      // 実効 rarity（classification.rarity による分類修正。id は据え置き）。
      const effRarity = rarityOverrides[id] || manifestRarity || "normal";
      const effRarityFolder = effRarity === "legendary" ? "legendary" : effRarity === "rare" ? "rare" : effRarity === "secret" ? "secret" : "normal";

      // 画像解決は「実効 rarity」フォルダで行う（<world>/<effRarity>/<英名>.png と <world>/<英名>/ の両対応）。
      const hasImage = addImage(id, findImageFor(worldGroup, en, effRarity === "rare", effRarityFolder));

      // releaseStatus は明示のみ（byId > worldDefault > future）。**hasImage で決定・降格しない。**
      const releaseStatus = byIdStatus[id] || worldDefault[worldGroup] || "future";
      // initial なのに画像が無い＝missing（future へ降格せず、release gate で失敗させる）。
      if (releaseStatus === "initial" && !hasImage) {
        missingInitialAssets.push({
          id,
          name: (row.name || row["キャラ名"] || en).trim(),
          speciesEn: en,
          world: worldGroup,
          rarity: effRarity,
          expectedPaths: [
            `assets/characters/${worldGroup}/${effRarityFolder}/${en}.png`,
            `assets/characters/${worldGroup}/${en}/${en}.png`
          ]
        });
      }

      const entry = {
        id,
        realmGroup,
        worldGroup,
        no: Number(row.no) || 0,
        name: (row.name || row["キャラ名"] || en).trim(),
        speciesJa: (row.speciesJa || row["和名"] || "").trim(),
        speciesEn: en,
        hasImage,
        releaseStatus,
        description: (row.description || row["説明"] || "").trim()
      };
      if (effRarity === "legendary") legendaries.push(entry);
      else if (effRarity === "rare") rares.push(entry);
      else if (effRarity === "secret") secrets.push(entry);
      else characters.push({ ...entry, status: (row.status || row["作成状況"] || "").trim() });
    }
  }

  return { characters, rares, legendaries, secrets, imageEntries, missingInitialAssets };
};

/** character-classification.json を読み込む（rarity 分類修正 + releaseStatus の正本レイヤ）。 */
const loadClassification = (charactersDir) => {
  const p = path.join(charactersDir, "character-classification.json");
  const empty = { rarity: {}, releaseStatus: { worldDefault: {}, byId: {} } };
  if (!fs.existsSync(p)) return empty;
  try {
    const c = JSON.parse(fs.readFileSync(p, "utf8"));
    return { rarity: c.rarity || {}, releaseStatus: c.releaseStatus || { worldDefault: {}, byId: {} } };
  } catch {
    return empty;
  }
};

module.exports = { buildCatalog, loadClassification, normImageKey, imageKeysFor };
