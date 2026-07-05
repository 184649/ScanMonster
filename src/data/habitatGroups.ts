import type { HabitatBoost, HabitatGroup } from "../types/habitat";

export const INITIAL_HABITAT_GROUPS: HabitatGroup[] = ["land", "water", "sky", "bug"];

export const HABITAT_GROUPS: HabitatGroup[] = ["land", "water", "sky", "bug", "reptile", "rare_world"];

export const HABITAT_UNLOCK_COSTS = [0, 1000, 2300, 4200, 7000, 11000] as const;

export const HABITAT_BOOST_COST = 300;
export const HABITAT_BOOST_SCAN_COUNT = 10;
export const HABITAT_BOOST_RATE = 0.55;
export const TWO_HABITAT_BOOST_RATE = 0.7;

export const HABITAT_GROUP_LABELS: Record<HabitatGroup, string> = {
  land: "陸の動物",
  water: "水辺の生き物",
  sky: "空の生き物",
  bug: "虫・小さな生き物",
  reptile: "は虫類・両生類",
  rare_world: "希少生物・特殊枠"
};

export const HABITAT_GROUP_SHORT_LABELS: Record<HabitatGroup, string> = {
  land: "陸",
  water: "水辺",
  sky: "空",
  bug: "虫",
  reptile: "は虫類",
  rare_world: "希少"
};

export const HABITAT_GROUP_EMOJI: Record<HabitatGroup, string> = {
  land: "🐾",
  water: "💧",
  sky: "🪽",
  bug: "🐞",
  reptile: "🦎",
  rare_world: "✨"
};

export const HABITAT_GROUP_DESCRIPTIONS: Record<HabitatGroup, string> = {
  land: "身近なけものや草原の生き物が出現します。",
  water: "川・海・水辺にゆかりのある生き物が出現します。",
  sky: "鳥や空を感じる生き物が出現します。",
  bug: "虫や小さな世界の生き物が出現します。",
  reptile: "は虫類・両生類の少し個性的な生き物が出現します。",
  rare_world: "希少生物や特殊な存在を扱う拡張枠です。"
};

export const getNextHabitatUnlockCost = (unlockedCount: number): number | null => {
  if (unlockedCount >= HABITAT_UNLOCK_COSTS.length) {
    return null;
  }

  return HABITAT_UNLOCK_COSTS[unlockedCount] ?? null;
};

export const normalizeHabitatGroups = (value: unknown): HabitatGroup[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(value.filter((item): item is HabitatGroup => HABITAT_GROUPS.includes(item as HabitatGroup)))
  );
};

export const getHabitatRates = (
  unlockedHabitats: HabitatGroup[],
  activeBoost?: HabitatBoost
): Partial<Record<HabitatGroup, number>> => {
  const habitats = normalizeHabitatGroups(unlockedHabitats);

  if (habitats.length === 0) {
    return {};
  }

  const baseRate = 1 / habitats.length;
  const baseRates = Object.fromEntries(habitats.map((habitat) => [habitat, baseRate])) as Partial<
    Record<HabitatGroup, number>
  >;

  if (!activeBoost || activeBoost.remainingScans <= 0) {
    return baseRates;
  }

  const target = activeBoost.targetHabitat;

  if (!habitats.includes(target) || habitats.length <= 1) {
    return baseRates;
  }

  const boostRate = habitats.length === 2 ? TWO_HABITAT_BOOST_RATE : activeBoost.boostRate;
  const others = habitats.filter((habitat) => habitat !== target);
  const otherRate = (1 - boostRate) / others.length;

  return Object.fromEntries(
    habitats.map((habitat) => [habitat, habitat === target ? boostRate : otherRate])
  ) as Partial<Record<HabitatGroup, number>>;
};
