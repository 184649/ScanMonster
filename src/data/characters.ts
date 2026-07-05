import { MONSTER_FAMILIES } from "./monsterFamilies";
import { RARE_MONSTERS } from "./rareMonsters";
import type { Character, CharacterRarity, HabitatGroup } from "../types/habitat";
import type { MonsterFamily, RareMonster, UserMonster } from "../types/monster";

export const FAMILY_HABITAT_GROUPS: Record<string, HabitatGroup> = {
  dog: "land",
  cat: "land",
  squirrel: "land",
  frog: "reptile",
  bear: "land",
  fox: "land",
  tanuki: "land",
  lion: "land",
  elephant: "land",
  giraffe: "land",
  whale: "water",
  dolphin: "water",
  shark: "water",
  penguin: "water",
  sparrow: "sky",
  crow: "sky",
  owl: "sky",
  turtle: "reptile",
  crocodile: "reptile",
  snake: "reptile",
  beetle: "bug",
  stag_beetle: "bug",
  deer: "land",
  rabbit: "land",
  jellyfish: "water",
  mole: "land",
  ostrich: "sky",
  eagle: "sky",
  human: "rare_world",
  gorilla: "land",
  monkey: "land",
  hippo: "water",
  horse: "land",
  koala: "land",
  hamster: "land",
  alpaca: "land",
  anteater: "land",
  armadillo: "land",
  bat: "sky",
  beaver: "water",
  camel: "land",
  chameleon: "reptile",
  cheetah: "land",
  cockatoo: "sky",
  cow: "land",
  crane: "sky",
  donkey: "land",
  flamingo: "sky",
  gecko: "reptile",
  goat: "land",
  hawk: "sky",
  iguana: "reptile",
  kangaroo: "land",
  leopard: "land",
  lizard: "reptile",
  meerkat: "land",
  mouse: "land",
  newt: "reptile",
  otter: "water",
  parakeet: "sky",
  peacock: "sky",
  pigeon: "sky",
  platypus: "water",
  raccoon: "land",
  red_panda: "land",
  rhinoceros: "land",
  salamander: "reptile",
  sea_otter: "water",
  seal: "water",
  sheep: "land",
  skunk: "land",
  sloth: "land",
  swallow: "sky",
  swan: "sky",
  tapir: "land",
  walrus: "water",
  wild_boar: "land",
  crab: "water",
  hermit_crab: "water",
  shrimp: "water"
};

export const getFamilyHabitatGroup = (familyId: string): HabitatGroup =>
  FAMILY_HABITAT_GROUPS[familyId] ?? "land";

export const getRareHabitatGroup = (rare: RareMonster): HabitatGroup => getFamilyHabitatGroup(rare.baseFamilyId);

export const getCharacterIdForFamily = (familyId: string): string => `family:${familyId}`;

export const getCharacterIdForRare = (rareId: string): string => `rare:${rareId}`;

export const getCharacterIdForMonster = (monster: UserMonster): string =>
  monster.characterId ?? (monster.rareId ? getCharacterIdForRare(monster.rareId) : getCharacterIdForFamily(monster.familyId));

export const getCharacterRarityForMonster = (monster: UserMonster): CharacterRarity => {
  if (monster.rareId) {
    return monster.dna.rarity >= 5 ? "secret" : "rare";
  }

  return "normal";
};

export const familyToCharacter = (family: MonsterFamily): Character => ({
  id: getCharacterIdForFamily(family.id),
  no: family.no,
  name: family.name,
  displayName: family.displayName,
  motif: family.baseAnimalName,
  habitatGroup: getFamilyHabitatGroup(family.id),
  rarity: "normal",
  imageKey: family.imageKey,
  description: family.description
});

export const rareToCharacter = (rare: RareMonster, no: number): Character => ({
  id: getCharacterIdForRare(rare.id),
  no,
  name: rare.displayName,
  displayName: rare.displayName,
  motif: rare.rareCategory,
  habitatGroup: getRareHabitatGroup(rare),
  rarity: rare.rarity >= 5 ? "secret" : "rare",
  imageKey: rare.imageKey,
  description: rare.loreMemo
});

export const CHARACTERS: Character[] = [
  ...MONSTER_FAMILIES.map(familyToCharacter),
  ...RARE_MONSTERS.map((rare, index) => rareToCharacter(rare, MONSTER_FAMILIES.length + index + 1))
];

export const NORMAL_CHARACTER_COUNT = MONSTER_FAMILIES.length;
export const RARE_CHARACTER_COUNT = RARE_MONSTERS.length;
export const TOTAL_CHARACTER_COUNT = CHARACTERS.length;

export const getCharactersByHabitat = (habitatGroup: HabitatGroup): Character[] =>
  CHARACTERS.filter((character) => character.habitatGroup === habitatGroup);
