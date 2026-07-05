import { MONSTER_FAMILIES } from "../data/monsterFamilies";
import type { UserMonster } from "../types/monster";
import type { ScanHistory } from "../types/scan";

export type DexSummary = {
  discoveredFamilies: number;
  totalFamilies: number;
  discoveredIndividuals: number;
  scannedCodes: number;
  regionVariants: number;
  seasonVariants: number;
  timeSlotVariants: number;
  rareMonsters: number;
};

export const createDexSummary = (monsters: UserMonster[], histories: ScanHistory[]): DexSummary => {
  const familyIds = new Set(monsters.map((monster) => monster.familyId));
  const sourceHashes = new Set(histories.map((history) => history.sourceHash));
  const regionVariants = new Set(monsters.map((monster) => `${monster.familyId}:${monster.dna.contextVariant.regionKey}`));
  const seasonVariants = new Set(monsters.map((monster) => `${monster.familyId}:${monster.dna.contextVariant.season}`));
  const timeSlotVariants = new Set(monsters.map((monster) => `${monster.familyId}:${monster.dna.contextVariant.timeSlot}`));

  return {
    discoveredFamilies: familyIds.size,
    totalFamilies: MONSTER_FAMILIES.length,
    discoveredIndividuals: monsters.length,
    scannedCodes: sourceHashes.size,
    regionVariants: regionVariants.size,
    seasonVariants: seasonVariants.size,
    timeSlotVariants: timeSlotVariants.size,
    rareMonsters: monsters.filter((monster) => monster.dna.rarity >= 4).length
  };
};

export const getDiscoveredFamilyIds = (monsters: UserMonster[]): Set<string> => {
  return new Set(monsters.map((monster) => monster.familyId));
};

export const getMonsterCountByFamily = (monsters: UserMonster[], familyId: string): number => {
  return monsters.filter((monster) => monster.familyId === familyId).length;
};
