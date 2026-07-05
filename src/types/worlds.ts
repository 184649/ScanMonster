/**
 * 「領域 > ワールド > キャラクター」構造の型。
 *
 * - RealmGroup … 大きなテーマ分類（DP解放の単位ではない）。
 * - WorldGroup … DPで解放する単位。
 * - キャラクターは領域とワールドを持ち、スキャンで発見する対象。
 *
 * 旧 `HabitatGroup`(land/water/sky/bug...) から移行中。ground/waterside は旧 land/water に対応。
 */
export type RealmGroup = "life" | "space" | "history" | "micro" | "food";

export type WorldGroup =
  | "ground"
  | "waterside"
  | "sky"
  | "bug"
  | "scale"
  | "phantom"
  | "planet"
  | "constellation"
  | "bc"
  | "jomon"
  | "heisei"
  | "atom"
  | "virus"
  | "staple_food"
  | "dessert";

export type CharacterRarity = "normal" | "rare" | "secret";

export type WorldCharacter = {
  id: string;
  no: number;
  name: string;
  displayName: string;
  realmGroup: RealmGroup;
  worldGroup: WorldGroup;
  motif: string;
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

/** DPで特定ワールドの出現率を一定回数だけ上げる。レア確率は変えない。 */
export type WorldBoost = {
  id: string;
  targetWorld: WorldGroup;
  remainingScans: number;
  boostRate: number;
  createdAt: string;
};
