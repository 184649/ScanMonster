/**
 * Phase 0: キャラクターマスター生成前ガード（gen:catalog / gen:seed が共通で使用）。
 *
 * 目的：マスター生成系の事故（Excel編集ミス・シート混入・rarity潰れ・初期件数の意図しない変動）を
 * 生成前に検出し、**既存の生成物を壊さずに失敗させる**。
 *
 * 通常実行では初期リリース件数を EXPECTED_INITIAL_COUNT に固定する。
 * 意図的に初期件数を変更する場合のみ WORLDAWN_ALLOW_INITIAL_CHANGE=1 を指定する。
 */

/** 初期リリース対象の固定件数（classification.releaseStatus.byId で明示された89体）。 */
const EXPECTED_INITIAL_COUNT = 89;

/** 初期89体の rarity 構成（Phase 0.5 で固定。変わると legendary 解放条件＝normal完成判定が変わる）。 */
const EXPECTED_INITIAL_BY_RARITY = { normal: 84, rare: 1, legendary: 4, secret: 0 };

/** 初期89体の world 構成。 */
const EXPECTED_INITIAL_BY_WORLD = { ground: 74, sky: 15 };

/**
 * rarity 由来の ID を再生成した場合に現れる禁止 ID（既存 ID は ground_rare_* のまま維持する）。
 * ID 内の "rare" は歴史的経緯であり、現在の rarity を意味しない。
 */
const FORBIDDEN_REGENERATED_IDS = [
  "ground_legendary_fenrir",
  "ground_legendary_tsuchinoko",
  "ground_legendary_yeti",
  "ground_legendary_underground_dweller"
];

/** マスターに存在してよい world（＝Character.xlsx の対象シート）。master_prompt 等の管理シートは不可。 */
const ALLOWED_WORLDS = ["ground", "waterside", "sky", "bug", "phantom", "planet"];

/** rarity の正規値。 */
const VALID_RARITIES = ["normal", "rare", "legendary", "secret"];

/**
 * 生成前の安全検証。エラー文字列の配列を返す（空＝安全）。
 * @param {{master:object, classification:object, built:object}} input
 * @returns {string[]}
 */
const collectGenerationErrors = ({ master, classification, built }) => {
  const errors = [];

  // 1) 不正な world（master_prompt などの管理シート混入を含む）
  for (const world of Object.keys(master || {})) {
    if (!ALLOWED_WORLDS.includes(world)) {
      errors.push(`不正な world がマスターに含まれています: "${world}"（許可: ${ALLOWED_WORLDS.join(", ")}）`);
    }
  }

  // 2) 空欄 / 未知 rarity（normal への自動変換を許さない）
  for (const [world, rows] of Object.entries(master || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const raw = row.rarity === undefined || row.rarity === null ? "" : String(row.rarity);
      const rarity = raw.trim().toLowerCase();
      const who = `${world} / ${row.speciesEn || row.speciesJa || "(名称不明)"}`;
      if (rarity.length === 0) errors.push(`空欄 rarity がマスターに存在します: ${who}`);
      else if (!VALID_RARITIES.includes(rarity)) errors.push(`未知の rarity がマスターに存在します: ${who} = "${raw}"`);
    }
  }

  const all = [...(built.characters || []), ...(built.rares || []), ...(built.legendaries || []), ...(built.secrets || [])];
  const idsInBuild = new Set(all.map((c) => c.id));

  // 3) legendary が normal へ変換されていないか
  const legendaryIds = new Set((built.legendaries || []).map((c) => c.id));
  const normalIds = new Set((built.characters || []).map((c) => c.id));
  for (const [id, rarity] of Object.entries((classification && classification.rarity) || {})) {
    if (rarity !== "legendary") continue;
    if (!idsInBuild.has(id)) continue; // マスター未登録は 6) で扱う
    if (normalIds.has(id)) errors.push(`legendary 指定の ${id} が normal へ変換されています`);
    else if (!legendaryIds.has(id)) errors.push(`legendary 指定の ${id} が legendary として分類されていません`);
  }
  // マスター側 rarity=legendary の行も legendary バケットに入るべき
  for (const [world, rows] of Object.entries(master || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (String(row.rarity || "").trim().toLowerCase() !== "legendary") continue;
      const hit = all.find((c) => c.worldGroup === world && c.speciesEn === row.speciesEn);
      if (hit && normalIds.has(hit.id)) errors.push(`マスターで legendary の ${hit.id} が normal へ変換されています`);
    }
  }

  // 4) 同一 ID が複数 rarity バケットに所属していないか
  const buckets = new Map();
  const put = (id, kind) => {
    if (!buckets.has(id)) buckets.set(id, new Set());
    buckets.get(id).add(kind);
  };
  (built.characters || []).forEach((c) => put(c.id, "normal"));
  (built.rares || []).forEach((c) => put(c.id, "rare"));
  (built.legendaries || []).forEach((c) => put(c.id, "legendary"));
  (built.secrets || []).forEach((c) => put(c.id, "secret"));
  for (const [id, kinds] of buckets) {
    if (kinds.size > 1) errors.push(`同一 ID が複数 rarity に所属しています: ${id} → ${[...kinds].join(", ")}`);
  }

  // 5) initial 件数の固定（明示承認時のみ変更可）
  const initial = all.filter((c) => c.releaseStatus === "initial");
  const allowChange = process.env.WORLDAWN_ALLOW_INITIAL_CHANGE === "1";
  if (initial.length !== EXPECTED_INITIAL_COUNT && !allowChange) {
    errors.push(
      `initial が ${initial.length} 件です（期待 ${EXPECTED_INITIAL_COUNT} 件）。` +
        `意図的に初期件数を変更する場合のみ WORLDAWN_ALLOW_INITIAL_CHANGE=1 を指定してください。`
    );
  }

  // 6) initial 指定なのにマスターへ存在しない ID
  const byId = ((classification && classification.releaseStatus) || {}).byId || {};
  for (const [id, status] of Object.entries(byId)) {
    if (status === "initial" && !idsInBuild.has(id)) {
      errors.push(`initial 指定の ${id} がマスターに存在しません（ID が変わった可能性があります）`);
    }
  }

  // 7) master の id 空欄（Phase 0.5: ID は Excel の id 列が正本）
  for (const [world, rows] of Object.entries(master || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!String(row.id || "").trim()) errors.push(`master に id 空欄の行があります: ${world} / ${row.speciesEn || "(名称不明)"}`);
      if (!String(row.speciesEn || "").trim()) errors.push(`master に英名空欄の行があります: ${world} / id=${row.id || "(空)"}`);
    }
  }

  // 8) master ID 重複 / 同一IDに異なる英名 / 同一(world,英名)に異なるID
  const idToEn = new Map();
  const worldEnToId = new Map();
  for (const [world, rows] of Object.entries(master || {})) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const id = String(row.id || "").trim();
      const en = String(row.speciesEn || "").trim();
      if (!id || !en) continue;
      if (idToEn.has(id)) errors.push(`master の ID が重複しています: ${id}（${idToEn.get(id)} と ${en}）`);
      else idToEn.set(id, en);
      const k = `${world}|${en.toLowerCase()}|${String(row.no ?? "")}`;
      if (worldEnToId.has(k) && worldEnToId.get(k) !== id) {
        errors.push(`同一の world/英名/no に異なる ID: ${k} → ${worldEnToId.get(k)} と ${id}`);
      } else worldEnToId.set(k, id);
    }
  }

  // 9) rarity 由来で ID を作り直した痕跡（既存 ID を維持していれば発生しない）
  for (const bad of FORBIDDEN_REGENERATED_IDS) {
    if (idsInBuild.has(bad)) errors.push(`rarity 由来で ID が作り直されています: ${bad}（既存 ID を維持してください）`);
  }

  // 10) 初期89体の rarity 構成（legendary 解放条件＝normal完成判定に直結するため固定）
  const allowChange2 = process.env.WORLDAWN_ALLOW_INITIAL_CHANGE === "1";
  if (!allowChange2) {
    const actual = { normal: 0, rare: 0, legendary: 0, secret: 0 };
    for (const c of (built.characters || [])) if (c.releaseStatus === "initial") actual.normal++;
    for (const c of (built.rares || [])) if (c.releaseStatus === "initial") actual.rare++;
    for (const c of (built.legendaries || [])) if (c.releaseStatus === "initial") actual.legendary++;
    for (const c of (built.secrets || [])) if (c.releaseStatus === "initial") actual.secret++;
    for (const [k, want] of Object.entries(EXPECTED_INITIAL_BY_RARITY)) {
      if (actual[k] !== want) {
        errors.push(
          `初期89体の rarity 構成が変化しました: ${k} が ${actual[k]} 件（期待 ${want} 件）。` +
            `legendary 解放条件（normal 完成判定）が変わるため中止します。意図的な変更は WORLDAWN_ALLOW_INITIAL_CHANGE=1。`
        );
      }
    }
    // world 構成
    const byWorld = {};
    for (const c of initial) byWorld[c.worldGroup] = (byWorld[c.worldGroup] || 0) + 1;
    for (const [w, want] of Object.entries(EXPECTED_INITIAL_BY_WORLD)) {
      if ((byWorld[w] || 0) !== want) errors.push(`初期89体の world 構成が変化しました: ${w} が ${byWorld[w] || 0} 件（期待 ${want} 件）`);
    }
  }

  return errors;
};

/** エラーがあれば内容を出力して非0終了する。 */
const assertGenerationSafe = (label, input) => {
  const errors = collectGenerationErrors(input);
  if (errors.length === 0) return;
  console.error(`\n[${label}] 中止：マスター生成前ガードで ${errors.length} 件の問題を検出しました。既存の生成物は変更していません。`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(3);
};

module.exports = {
  EXPECTED_INITIAL_COUNT,
  EXPECTED_INITIAL_BY_RARITY,
  EXPECTED_INITIAL_BY_WORLD,
  FORBIDDEN_REGENERATED_IDS,
  ALLOWED_WORLDS,
  VALID_RARITIES,
  collectGenerationErrors,
  assertGenerationSafe
};
