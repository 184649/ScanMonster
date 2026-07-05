/**
 * 領域・ワールドのマスターデータとロジック。
 *
 * - DPで解放するのは「ワールド」。領域は表示・拡張のためのテーマ分類。
 * - 解放コストは「何個目のワールド解放か」で決まる（種類に依存しない）。
 * - ワールドブーストは対象ワールドの出現率だけを上げる（レア確率は変えない）。
 */
import type { RealmGroup, WorldBoost, WorldGroup } from "../types/worlds";

export const REALM_GROUP_LABELS: Record<RealmGroup, string> = {
  life: "生物領域",
  space: "宇宙領域",
  history: "歴史領域",
  micro: "ミクロ領域",
  food: "食べ物領域"
};

export const WORLD_GROUP_LABELS: Record<WorldGroup, string> = {
  ground: "地上ワールド",
  waterside: "水辺ワールド",
  sky: "空ワールド",
  bug: "虫ワールド",
  scale: "うろこワールド",
  phantom: "まぼろしワールド",
  planet: "惑星ワールド",
  constellation: "星座ワールド",
  bc: "紀元前ワールド",
  jomon: "縄文ワールド",
  heisei: "平成ワールド",
  atom: "原子ワールド",
  virus: "ウイルスワールド",
  staple_food: "主食ワールド",
  dessert: "デザートワールド"
};

export const WORLD_GROUP_SHORT_LABELS: Record<WorldGroup, string> = {
  ground: "地上",
  waterside: "水辺",
  sky: "空",
  bug: "虫",
  scale: "うろこ",
  phantom: "まぼろし",
  planet: "惑星",
  constellation: "星座",
  bc: "紀元前",
  jomon: "縄文",
  heisei: "平成",
  atom: "原子",
  virus: "ウイルス",
  staple_food: "主食",
  dessert: "デザート"
};

export const WORLD_GROUP_EMOJI: Record<WorldGroup, string> = {
  ground: "🐾",
  waterside: "💧",
  sky: "🪽",
  bug: "🐞",
  scale: "🦎",
  phantom: "✨",
  planet: "🪐",
  constellation: "⭐",
  bc: "🦴",
  jomon: "🏺",
  heisei: "📼",
  atom: "⚛️",
  virus: "🦠",
  staple_food: "🍚",
  dessert: "🍰"
};

export const WORLD_GROUP_DESCRIPTIONS: Record<WorldGroup, string> = {
  ground: "地上で暮らすけものや陸の生き物が出現します。",
  waterside: "海・川・水辺にゆかりのある生き物が出現します。",
  sky: "鳥や翼を持つ、空を感じる生き物が出現します。",
  bug: "虫や小さな世界の生き物が出現します。",
  scale: "うろこを持つは虫類の拡張ワールド（将来）。",
  phantom: "幻・伝説の存在を扱う拡張ワールド（将来）。",
  planet: "惑星をモチーフにした拡張ワールド（将来）。",
  constellation: "星座をモチーフにした拡張ワールド（将来）。",
  bc: "紀元前をテーマにした拡張ワールド（将来）。",
  jomon: "縄文をテーマにした拡張ワールド（将来）。",
  heisei: "平成をテーマにした拡張ワールド（将来）。",
  atom: "原子をモチーフにした拡張ワールド（将来）。",
  virus: "ウイルスをモチーフにした拡張ワールド（将来）。",
  staple_food: "主食をモチーフにした拡張ワールド（将来）。",
  dessert: "デザートをモチーフにした拡張ワールド（将来）。"
};

export type WorldGroupDef = {
  key: WorldGroup;
  realm: RealmGroup;
  label: string;
  /** 初回リリースで実装対象か（生物領域の4ワールド）。 */
  initialRelease: boolean;
  order: number;
};

/** 領域 > ワールドの正式構成。順序＝表示順。 */
export const WORLD_GROUP_DEFS: WorldGroupDef[] = [
  { key: "ground", realm: "life", label: WORLD_GROUP_LABELS.ground, initialRelease: true, order: 1 },
  { key: "waterside", realm: "life", label: WORLD_GROUP_LABELS.waterside, initialRelease: true, order: 2 },
  { key: "sky", realm: "life", label: WORLD_GROUP_LABELS.sky, initialRelease: true, order: 3 },
  { key: "bug", realm: "life", label: WORLD_GROUP_LABELS.bug, initialRelease: true, order: 4 },
  { key: "scale", realm: "life", label: WORLD_GROUP_LABELS.scale, initialRelease: false, order: 5 },
  { key: "phantom", realm: "life", label: WORLD_GROUP_LABELS.phantom, initialRelease: false, order: 6 },
  { key: "planet", realm: "space", label: WORLD_GROUP_LABELS.planet, initialRelease: false, order: 7 },
  { key: "constellation", realm: "space", label: WORLD_GROUP_LABELS.constellation, initialRelease: false, order: 8 },
  { key: "bc", realm: "history", label: WORLD_GROUP_LABELS.bc, initialRelease: false, order: 9 },
  { key: "jomon", realm: "history", label: WORLD_GROUP_LABELS.jomon, initialRelease: false, order: 10 },
  { key: "heisei", realm: "history", label: WORLD_GROUP_LABELS.heisei, initialRelease: false, order: 11 },
  { key: "atom", realm: "micro", label: WORLD_GROUP_LABELS.atom, initialRelease: false, order: 12 },
  { key: "virus", realm: "micro", label: WORLD_GROUP_LABELS.virus, initialRelease: false, order: 13 },
  { key: "staple_food", realm: "food", label: WORLD_GROUP_LABELS.staple_food, initialRelease: false, order: 14 },
  { key: "dessert", realm: "food", label: WORLD_GROUP_LABELS.dessert, initialRelease: false, order: 15 }
];

export const REALM_GROUPS: RealmGroup[] = ["life", "space", "history", "micro", "food"];

export const ALL_WORLD_GROUPS: WorldGroup[] = WORLD_GROUP_DEFS.map((w) => w.key);

/**
 * 実装済み（リリース対象）のワールド。
 * ★ワールドの公開/非公開はここ一箇所（WORLD_GROUP_DEFS の `initialRelease`）で決まる。
 * 新しいワールドを公開するには、対応する def の `initialRelease` を true にするだけでよい
 * （初回選択・図鑑・解放画面すべてがこのフラグに追従する）。
 */
export const RELEASED_WORLD_DEFS: WorldGroupDef[] = WORLD_GROUP_DEFS.filter((w) => w.initialRelease);

/** 実装済みワールドのキー（＝初回リリースで選択・出現・図鑑対象）。 */
export const INITIAL_WORLD_GROUPS: WorldGroup[] = RELEASED_WORLD_DEFS.map((w) => w.key);

export const worldsInRealm = (realm: RealmGroup): WorldGroup[] =>
  WORLD_GROUP_DEFS.filter((w) => w.realm === realm).map((w) => w.key);

export const realmOfWorld = (world: WorldGroup): RealmGroup =>
  WORLD_GROUP_DEFS.find((w) => w.key === world)?.realm ?? "life";

// ---- 解放コスト（何個目の解放か） ----
export const WORLD_UNLOCK_COSTS = [0, 1000, 2300, 4200, 7000, 11000] as const;

export const getNextWorldUnlockCost = (unlockedWorldCount: number): number | null => {
  if (unlockedWorldCount >= WORLD_UNLOCK_COSTS.length) {
    return null;
  }
  return WORLD_UNLOCK_COSTS[unlockedWorldCount] ?? null;
};

// ---- ワールドブースト ----
export const WORLD_BOOST_COST = 300;
export const WORLD_BOOST_SCAN_COUNT = 10;
export const WORLD_BOOST_RATE = 0.55;
export const TWO_WORLD_BOOST_RATE = 0.7;

/** 有効スキャン1回でワールドブーストの残り回数を1減らす。0になったら解除。 */
export const decrementWorldBoostAfterValidScan = (boost?: WorldBoost): WorldBoost | undefined => {
  if (!boost || boost.remainingScans <= 0) {
    return undefined;
  }
  const remainingScans = boost.remainingScans - 1;
  return remainingScans > 0 ? { ...boost, remainingScans } : undefined;
};

export const normalizeWorldGroups = (value: unknown): WorldGroup[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  const valid = new Set<WorldGroup>(ALL_WORLD_GROUPS);
  return Array.from(new Set(value.filter((item): item is WorldGroup => valid.has(item as WorldGroup))));
};

/**
 * 解放済みワールドの出現率を返す。
 * 通常は均等抽選。ブースト中は対象ワールドを boostRate（2ワールド時は 0.7）に上げ、残りで均等割り。
 * レア確率には影響しない。
 */
export const getWorldRates = (
  unlockedWorlds: WorldGroup[],
  activeBoost?: WorldBoost
): Partial<Record<WorldGroup, number>> => {
  const worlds = normalizeWorldGroups(unlockedWorlds);
  if (worlds.length === 0) {
    return {};
  }

  const baseRate = 1 / worlds.length;
  const baseRates = Object.fromEntries(worlds.map((w) => [w, baseRate])) as Partial<Record<WorldGroup, number>>;

  if (!activeBoost || activeBoost.remainingScans <= 0) {
    return baseRates;
  }

  const target = activeBoost.targetWorld;
  if (!worlds.includes(target) || worlds.length <= 1) {
    return baseRates;
  }

  const boostRate = worlds.length === 2 ? TWO_WORLD_BOOST_RATE : activeBoost.boostRate;
  const others = worlds.filter((w) => w !== target);
  const otherRate = (1 - boostRate) / others.length;

  return Object.fromEntries(
    worlds.map((w) => [w, w === target ? boostRate : otherRate])
  ) as Partial<Record<WorldGroup, number>>;
};
