import { USER_TITLES } from "../data/titles";
import { getCharacterIdForMonster, getCharacterRarityForMonster } from "../data/characters";
import type { WorldGroup } from "../types/worlds";
import type { EconomyStateData } from "../types/economy";
import type { UserMonster } from "../types/monster";
import type { ScanHistory } from "../types/scan";

type TitleEvaluationInput = {
  economy: EconomyStateData;
  monsters: UserMonster[];
  scanHistories: ScanHistory[];
};

const addIf = (ids: Set<string>, condition: boolean, id: string) => {
  if (condition) {
    ids.add(id);
  }
};

export const evaluateUnlockedTitleIds = ({ economy, monsters, scanHistories }: TitleEvaluationInput): string[] => {
  const ids = new Set(economy.titles.unlockedTitleIds);
  const discoveredCharacterIds = new Set(monsters.map(getCharacterIdForMonster));
  const scanCount = scanHistories.length;
  const discoveredCount = discoveredCharacterIds.size;
  const unlockedCount = economy.unlocks.unlockedWorldGroups.length;
  const rareCount = new Set(
    monsters.filter((monster) => getCharacterRarityForMonster(monster) !== "normal").map(getCharacterIdForMonster)
  ).size;
  const rediscoveryTotal = monsters.reduce((total, monster) => total + Math.max(0, (monster.discoveryCount ?? 1) - 1), 0);
  const maxSameRediscovery = monsters.reduce((max, monster) => Math.max(max, Math.max(0, (monster.discoveryCount ?? 1) - 1)), 0);
  const discoveredByWorldGroup = (world: WorldGroup): number =>
    new Set(
      monsters.filter((monster) => monster.worldGroup === world).map(getCharacterIdForMonster)
    ).size;

  addIf(ids, scanCount >= 1, "scan_1");
  addIf(ids, scanCount >= 10, "scan_10");
  addIf(ids, scanCount >= 50, "scan_50");
  addIf(ids, scanCount >= 100, "scan_100");
  addIf(ids, scanCount >= 300, "scan_300");
  addIf(ids, scanCount >= 500, "scan_500");
  addIf(ids, scanCount >= 1000, "scan_1000");

  addIf(ids, discoveredCount >= 1, "dex_1");
  addIf(ids, discoveredCount >= 10, "dex_10");
  addIf(ids, discoveredCount >= 30, "dex_30");
  addIf(ids, discoveredCount >= 50, "dex_50");
  addIf(ids, discoveredCount >= 100, "dex_100");
  addIf(ids, discoveredCount >= 200, "dex_200");
  addIf(ids, discoveredCount >= 300, "dex_300");

  addIf(ids, Boolean(economy.unlocks.selectedInitialWorldGroup), "unlock_1");
  addIf(ids, unlockedCount >= 2, "unlock_2");
  addIf(ids, unlockedCount >= 3, "unlock_3");
  addIf(ids, unlockedCount >= 4, "unlock_4");
  addIf(ids, unlockedCount >= 6, "unlock_all");

  for (const world of ["ground", "waterside", "sky", "bug"] as const) {
    const count = discoveredByWorldGroup(world);
    addIf(ids, count >= 10, `world_${world}_10`);
    addIf(ids, count >= 30, `world_${world}_30`);
    addIf(ids, count >= 50, `world_${world}_50`);
  }

  addIf(ids, rareCount >= 1, "rare_1");
  addIf(ids, rareCount >= 3, "rare_3");
  addIf(ids, rareCount >= 5, "rare_5");
  addIf(ids, rareCount >= 10, "rare_10");

  addIf(ids, rediscoveryTotal >= 10, "rediscovery_10");
  addIf(ids, maxSameRediscovery >= 10, "rediscovery_same_10");
  addIf(ids, rediscoveryTotal >= 50, "rediscovery_50");
  addIf(ids, rediscoveryTotal >= 100, "rediscovery_100");

  addIf(ids, economy.scanStreak.bestScanStreakDays >= 3, "streak_3");
  addIf(ids, economy.scanStreak.bestScanStreakDays >= 7, "streak_7");
  addIf(ids, economy.scanStreak.bestScanStreakDays >= 14, "streak_14");
  addIf(ids, economy.scanStreak.bestScanStreakDays >= 30, "streak_30");

  return USER_TITLES.map((title) => title.id).filter((id) => ids.has(id));
};

export const syncUnlockedTitles = (economy: EconomyStateData, monsters: UserMonster[], scanHistories: ScanHistory[]) => {
  const unlockedTitleIds = evaluateUnlockedTitleIds({ economy, monsters, scanHistories });
  const activeTitleId =
    economy.titles.activeTitleId && unlockedTitleIds.includes(economy.titles.activeTitleId)
      ? economy.titles.activeTitleId
      : unlockedTitleIds[0];

  return {
    ...economy,
    titles: {
      unlockedTitleIds,
      activeTitleId
    }
  };
};
