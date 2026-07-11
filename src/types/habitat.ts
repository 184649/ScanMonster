export type HabitatGroup = "land" | "water" | "sky" | "bug" | "reptile" | "rare_world";

export type CharacterRarity = "normal" | "rare" | "legendary" | "secret";

export type Character = {
  id: string;
  no: number;
  name: string;
  displayName: string;
  motif: string;
  habitatGroup: HabitatGroup;
  rarity: CharacterRarity;
  imageKey: string;
  description: string;
};

export type OwnedCharacter = {
  characterId: string;
  firstDiscoveredAt: string;
  lastDiscoveredAt: string;
  discoveryCount: number;
  favorite: boolean;
};

export type HabitatBoost = {
  id: string;
  targetHabitat: HabitatGroup;
  remainingScans: number;
  boostRate: number;
  createdAt: string;
};
