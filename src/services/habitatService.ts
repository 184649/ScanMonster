import { HABITAT_GROUPS, getHabitatRates } from "../data/habitatGroups";
import { FAMILY_HABITAT_GROUPS, getFamilyHabitatGroup } from "../data/characters";
import { MONSTER_FAMILIES } from "../data/monsterFamilies";
import type { HabitatBoost, HabitatGroup } from "../types/habitat";
import type { MonsterFamily } from "../types/monster";
import { pickFromHash, valueFromHash } from "../utils/randomFromHash";

export const getFamiliesForHabitat = (habitat: HabitatGroup): MonsterFamily[] =>
  MONSTER_FAMILIES.filter((family) => getFamilyHabitatGroup(family.id) === habitat);

export const getRareCandidateFamiliesForHabitat = (habitat: HabitatGroup): MonsterFamily[] =>
  getFamiliesForHabitat(habitat).filter((family) => family.hiddenRareIds.length > 0);

export const getUnlockedHabitatsOrFallback = (unlockedHabitats: HabitatGroup[]): HabitatGroup[] => {
  const valid = Array.from(new Set(unlockedHabitats.filter((habitat) => HABITAT_GROUPS.includes(habitat))));
  return valid.length > 0 ? valid : ["land"];
};

export const pickHabitatByRates = (
  unlockedHabitats: HabitatGroup[],
  activeBoost: HabitatBoost | undefined,
  seed: string
): HabitatGroup => {
  const habitats = getUnlockedHabitatsOrFallback(unlockedHabitats);
  const rates = getHabitatRates(habitats, activeBoost);
  const roll = valueFromHash(seed, 0, 999999, 17) / 1000000;
  let cursor = 0;

  for (const habitat of habitats) {
    cursor += rates[habitat] ?? 0;
    if (roll <= cursor) {
      return habitat;
    }
  }

  return habitats[habitats.length - 1]!;
};

export const pickFamilyForHabitat = ({
  habitat,
  sourceHash,
  wantRare
}: {
  habitat: HabitatGroup;
  sourceHash: string;
  wantRare: boolean;
}): MonsterFamily => {
  const rareCandidates = wantRare ? getRareCandidateFamiliesForHabitat(habitat) : [];
  const candidates = rareCandidates.length > 0 ? rareCandidates : getFamiliesForHabitat(habitat);

  if (candidates.length > 0) {
    return pickFromHash(sourceHash, candidates, wantRare ? 91 : 29);
  }

  const fallback = MONSTER_FAMILIES.filter((family) => FAMILY_HABITAT_GROUPS[family.id]);
  return pickFromHash(sourceHash, fallback, 31);
};

export const decrementBoostAfterValidScan = (boost: HabitatBoost | undefined): HabitatBoost | undefined => {
  if (!boost || boost.remainingScans <= 0) {
    return undefined;
  }

  const remainingScans = boost.remainingScans - 1;
  return remainingScans > 0 ? { ...boost, remainingScans } : undefined;
};
