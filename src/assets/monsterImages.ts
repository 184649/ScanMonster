import type { ImageSourcePropType } from "react-native";

import {
  getIndividualImageBaseKey,
  getMonsterIndividualImageSource,
  makeIndividualImageKey
} from "./monsterIndividualImages";
import { INDIVIDUAL_VARIANT_KEYS } from "../data/individualVariants";

export const BASE_MONSTER_IMAGE_KEYS = [
  "dog",
  "cat",
  "squirrel",
  "frog",
  "bear",
  "fox",
  "tanuki",
  "lion",
  "elephant",
  "giraffe",
  "whale",
  "dolphin",
  "shark",
  "penguin",
  "sparrow",
  "crow",
  "owl",
  "turtle",
  "crocodile",
  "snake",
  "beetle",
  "stag_beetle",
  "deer",
  "rabbit",
  "jellyfish",
  "mole",
  "ostrich",
  "eagle",
  "human",
  "gorilla",
  "monkey",
  "hippo",
  "horse",
  "koala",
  "hamster",
  "alpaca",
  "anteater",
  "armadillo",
  "bat",
  "beaver",
  "camel",
  "chameleon",
  "cheetah",
  "cockatoo",
  "cow",
  "crane",
  "donkey",
  "flamingo",
  "gecko",
  "goat",
  "hawk",
  "iguana",
  "kangaroo",
  "leopard",
  "lizard",
  "meerkat",
  "mouse",
  "newt",
  "otter",
  "parakeet",
  "peacock",
  "pigeon",
  "platypus",
  "raccoon",
  "red_panda",
  "rhinoceros",
  "salamander",
  "sea_otter",
  "seal",
  "sheep",
  "skunk",
  "sloth",
  "swallow",
  "swan",
  "tapir",
  "walrus",
  "wild_boar",
  "crab",
  "hermit_crab",
  "shrimp"
] as const;

export const RARE_MONSTER_IMAGE_KEYS = [
  "rare_alien",
  "rare_dragon",
  "rare_fenrir",
  "rare_ghost",
  "rare_kraken",
  "rare_panda",
  "rare_phoenix",
  "rare_robot"
] as const;

export const MONSTER_IMAGE_KEYS = [...BASE_MONSTER_IMAGE_KEYS, ...RARE_MONSTER_IMAGE_KEYS] as const;

export const NORMAL_MONSTER_IMAGE_COUNT = BASE_MONSTER_IMAGE_KEYS.length;
export const RARE_MONSTER_IMAGE_COUNT = RARE_MONSTER_IMAGE_KEYS.length;
export const TOTAL_MONSTER_IMAGE_COUNT = MONSTER_IMAGE_KEYS.length;

export type BaseMonsterImageKey = (typeof BASE_MONSTER_IMAGE_KEYS)[number];
export type RareMonsterImageKey = (typeof RARE_MONSTER_IMAGE_KEYS)[number];
export type MonsterImageKey = (typeof MONSTER_IMAGE_KEYS)[number];

export const monsterImages: Record<MonsterImageKey, ImageSourcePropType> = {
  dog: require("../../assets/characters/ground/Dog/Dog.png"),
  cat: require("../../assets/characters/ground/Cat/Cat.png"),
  squirrel: require("../../assets/characters/Human.png"),
  frog: require("../../assets/characters/Human.png"),
  bear: require("../../assets/characters/ground/Bear/Bear.png"),
  fox: require("../../assets/characters/ground/Fox/Fox.png"),
  tanuki: require("../../assets/characters/Human.png"),
  lion: require("../../assets/characters/ground/Lion/Lion.png"),
  elephant: require("../../assets/characters/ground/Elephant/Elephant.png"),
  giraffe: require("../../assets/characters/ground/Giraffe/Giraffe.png"),
  whale: require("../../assets/characters/Human.png"),
  dolphin: require("../../assets/characters/Human.png"),
  shark: require("../../assets/characters/Human.png"),
  penguin: require("../../assets/characters/Human.png"),
  sparrow: require("../../assets/characters/Human.png"),
  crow: require("../../assets/characters/Human.png"),
  owl: require("../../assets/characters/Human.png"),
  turtle: require("../../assets/characters/Human.png"),
  crocodile: require("../../assets/characters/Human.png"),
  snake: require("../../assets/characters/Human.png"),
  beetle: require("../../assets/characters/Beetle/Beetle.png"),
  stag_beetle: require("../../assets/characters/Stag_beetle/Stag_beetle.png"),
  deer: require("../../assets/characters/ground/Deer/Deer.png"),
  rabbit: require("../../assets/characters/Human.png"),
  jellyfish: require("../../assets/characters/Human.png"),
  mole: require("../../assets/characters/Human.png"),
  ostrich: require("../../assets/characters/Human.png"),
  eagle: require("../../assets/characters/Human.png"),
  human: require("../../assets/characters/Human.png"),
  gorilla: require("../../assets/characters/ground/Gorilla/Gorilla.png"),
  monkey: require("../../assets/characters/Human.png"),
  hippo: require("../../assets/characters/Human.png"),
  horse: require("../../assets/characters/ground/Horse/Horse.png"),
  koala: require("../../assets/characters/Human.png"),
  hamster: require("../../assets/characters/ground/Hamster/Hamster.png"),
  alpaca: require("../../assets/characters/ground/Alpaca/Alpaca.png"),
  anteater: require("../../assets/characters/ground/Anteater/Anteater.png"),
  armadillo: require("../../assets/characters/ground/Armadillo/Armadillo.png"),
  bat: require("../../assets/characters/Human.png"),
  beaver: require("../../assets/characters/Human.png"),
  camel: require("../../assets/characters/ground/Camel/Camel.png"),
  chameleon: require("../../assets/characters/ground/Chameleon/Chameleon.png"),
  cheetah: require("../../assets/characters/ground/Cheetah/Cheetah.png"),
  cockatoo: require("../../assets/characters/Human.png"),
  cow: require("../../assets/characters/ground/Cow/Cow.png"),
  crane: require("../../assets/characters/Human.png"),
  donkey: require("../../assets/characters/ground/Donkey/Donkey.png"),
  flamingo: require("../../assets/characters/Human.png"),
  gecko: require("../../assets/characters/ground/Gecko/Gecko.png"),
  goat: require("../../assets/characters/ground/Goat/Goat.png"),
  hawk: require("../../assets/characters/Human.png"),
  iguana: require("../../assets/characters/Human.png"),
  kangaroo: require("../../assets/characters/Human.png"),
  leopard: require("../../assets/characters/Human.png"),
  lizard: require("../../assets/characters/Human.png"),
  meerkat: require("../../assets/characters/Human.png"),
  mouse: require("../../assets/characters/Human.png"),
  newt: require("../../assets/characters/Human.png"),
  otter: require("../../assets/characters/Human.png"),
  parakeet: require("../../assets/characters/Human.png"),
  peacock: require("../../assets/characters/Human.png"),
  pigeon: require("../../assets/characters/Human.png"),
  platypus: require("../../assets/characters/Human.png"),
  raccoon: require("../../assets/characters/Human.png"),
  red_panda: require("../../assets/characters/Human.png"),
  rhinoceros: require("../../assets/characters/ground/Rhinoceros/Rhinoceros.png"),
  salamander: require("../../assets/characters/Human.png"),
  sea_otter: require("../../assets/characters/Human.png"),
  seal: require("../../assets/characters/Human.png"),
  sheep: require("../../assets/characters/Human.png"),
  skunk: require("../../assets/characters/Human.png"),
  sloth: require("../../assets/characters/Human.png"),
  swallow: require("../../assets/characters/Human.png"),
  swan: require("../../assets/characters/Human.png"),
  tapir: require("../../assets/characters/Human.png"),
  walrus: require("../../assets/characters/Human.png"),
  wild_boar: require("../../assets/characters/Human.png"),
  crab: require("../../assets/characters/Human.png"),
  hermit_crab: require("../../assets/characters/Human.png"),
  shrimp: require("../../assets/characters/Human.png"),
  rare_alien: require("../../assets/characters/Human.png"),
  rare_dragon: require("../../assets/characters/Human.png"),
  rare_fenrir: require("../../assets/characters/ground/Fenrir/Fenrir.png"),
  rare_ghost: require("../../assets/characters/Human.png"),
  rare_kraken: require("../../assets/characters/Human.png"),
  rare_panda: require("../../assets/characters/Human.png"),
  rare_phoenix: require("../../assets/characters/Human.png"),
  rare_robot: require("../../assets/characters/Human.png")
};

export const SPECIES_VARIANT_KEYS: Record<string, string[]> = Object.fromEntries(
  BASE_MONSTER_IMAGE_KEYS.map((speciesKey) => [
    speciesKey,
    INDIVIDUAL_VARIANT_KEYS.map((variantKey) => makeIndividualImageKey(speciesKey, variantKey))
  ])
);

export const TOTAL_VARIANT_COUNT = BASE_MONSTER_IMAGE_KEYS.length * INDIVIDUAL_VARIANT_KEYS.length;
export const TOTAL_INDIVIDUAL_VARIANT_GOAL = TOTAL_VARIANT_COUNT;

export const availableMonsterImageKeys = Object.keys(monsterImages) as MonsterImageKey[];

export const hasMonsterImage = (imageKey?: string): boolean => {
  if (!imageKey) {
    return false;
  }

  return Boolean(
    getMonsterIndividualImageSource(imageKey) ??
      monsterImages[imageKey as MonsterImageKey] ??
      monsterImages[getIndividualImageBaseKey(imageKey) as MonsterImageKey]
  );
};

export const getSpeciesVariantKeys = (baseImageKey?: string): string[] =>
  (baseImageKey && SPECIES_VARIANT_KEYS[baseImageKey]) || [];

export const getMonsterImageSource = (imageKey?: string): ImageSourcePropType | undefined => {
  if (!imageKey) {
    return undefined;
  }

  const individualImage = getMonsterIndividualImageSource(imageKey);
  if (individualImage) {
    return individualImage;
  }

  const directImage = monsterImages[imageKey as MonsterImageKey];
  if (directImage) {
    return directImage;
  }

  const baseImageKey = getIndividualImageBaseKey(imageKey);
  return baseImageKey ? monsterImages[baseImageKey as MonsterImageKey] : undefined;
};
