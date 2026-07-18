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
import { createCharacterPresentationResolver, type CharacterPresentationSource } from "./characterPresentation.core";

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
