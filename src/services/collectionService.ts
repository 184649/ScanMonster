import type { ElementType, Season, SourceType, TimeSlot, UserMonster } from "../types/monster";
import type { RegionKey } from "../types/region";

export type CollectionSortKey = "obtainedDesc" | "rarityDesc";

export type CollectionFilters = {
  familyId?: string;
  element?: ElementType;
  regionKey?: RegionKey;
  season?: Season;
  timeSlot?: TimeSlot;
  sourceType?: SourceType;
  favoriteOnly?: boolean;
};

export const sortMonsters = (monsters: UserMonster[], sortKey: CollectionSortKey): UserMonster[] => {
  const next = [...monsters];

  if (sortKey === "rarityDesc") {
    return next.sort((a, b) => b.dna.rarity - a.dna.rarity || Date.parse(b.obtainedAt) - Date.parse(a.obtainedAt));
  }

  return next.sort((a, b) => Date.parse(b.obtainedAt) - Date.parse(a.obtainedAt));
};

export const filterMonsters = (monsters: UserMonster[], filters: CollectionFilters): UserMonster[] => {
  return monsters.filter((monster) => {
    if (filters.familyId && monster.familyId !== filters.familyId) {
      return false;
    }

    if (filters.element && monster.dna.primaryElement !== filters.element && monster.dna.secondaryElement !== filters.element) {
      return false;
    }

    if (filters.regionKey && monster.dna.contextVariant.regionKey !== filters.regionKey) {
      return false;
    }

    if (filters.season && monster.dna.contextVariant.season !== filters.season) {
      return false;
    }

    if (filters.timeSlot && monster.dna.contextVariant.timeSlot !== filters.timeSlot) {
      return false;
    }

    if (filters.sourceType && monster.sourceType !== filters.sourceType) {
      return false;
    }

    if (filters.favoriteOnly && !monster.favorite) {
      return false;
    }

    return true;
  });
};

export const countSameSourceMonsters = (monsters: UserMonster[], sourceHash: string): number => {
  return monsters.filter((monster) => monster.sourceHash === sourceHash).length;
};
