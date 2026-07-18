import { getCharacterImage, getCharacterThumb } from "../assets/characterImages.generated";
import { DEFAULT_CHARACTER_PRESENTATION_MODE } from "../config/characterPresentation";
import {
  CATALOG_CHARACTERS,
  CATALOG_LEGENDARIES,
  CATALOG_RARES,
  type CatalogCharacter,
  type CatalogRare
} from "../data/characterCatalog.generated";
import type { PresentationMode } from "../types/characterPresentation";
import type { UserMonster } from "../types/monster";
import {
  createCharacterPresentationResolver,
  selectCharacterDisplayName,
  type CharacterPresentationSource
} from "./characterPresentation.core";

type CatalogEntry = CatalogCharacter | CatalogRare;

const toPresentationSource = (entry: CatalogEntry, rarity: string): CharacterPresentationSource => ({
  identity: {
    characterId: entry.id,
    world: entry.worldGroup,
    rarity,
    releaseStatus: entry.releaseStatus,
    isDiscoverable: entry.releaseStatus === "initial",
    officialNumberScope: entry.id,
    discoveryHistoryScope: entry.id
  },
  displayName: entry.name,
  motifName: entry.speciesJa || entry.speciesEn,
  shortDescription: entry.description.trim() || undefined,
  imageSource: getCharacterImage(entry.id),
  thumbnailSource: getCharacterThumb(entry.id),
  presentationStatus: entry.hasImage ? "legacy" : "missing",
  isProvisional: false
});

const sources: CharacterPresentationSource[] = [
  ...CATALOG_CHARACTERS.map((entry) => toPresentationSource(entry, "normal")),
  ...CATALOG_RARES.map((entry) => toPresentationSource(entry, "rare")),
  ...CATALOG_LEGENDARIES.map((entry) => toPresentationSource(entry, "legendary"))
];

const resolver = createCharacterPresentationResolver({
  sources,
  defaultMode: DEFAULT_CHARACTER_PRESENTATION_MODE
});

export const getCharacterIdentity = resolver.getCharacterIdentity;

export const resolveCharacterPresentation = (
  characterId: string,
  mode: PresentationMode = DEFAULT_CHARACTER_PRESENTATION_MODE
) => resolver.resolveCharacterPresentation(characterId, mode);

/** UI用の名前解決。保存値は変更せず、resolverで解決できない場合だけfallbackとして使う。 */
export const resolveCharacterDisplayName = (
  characterId: string | undefined,
  storedDisplayName?: string,
  nickname?: string
): string =>
  selectCharacterDisplayName({
    nickname,
    characterId,
    resolvedDisplayName: characterId ? resolveCharacterPresentation(characterId)?.displayName : undefined,
    storedDisplayName
  });

/** UserMonsterの永続displayNameを保持したまま、現在表示だけresolver優先にする。 */
export const resolveUserMonsterDisplayName = (monster: UserMonster): string =>
  resolveCharacterDisplayName(monster.characterId ?? monster.imageKey, monster.displayName);

/** nickname対応画面用。空文字だけのnicknameは現在名を隠さない。 */
export const resolveUserMonsterDisplayNameWithNickname = (monster: UserMonster): string =>
  resolveCharacterDisplayName(monster.characterId ?? monster.imageKey, monster.displayName, monster.nickname);
