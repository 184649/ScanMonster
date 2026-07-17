import type { ImageSourcePropType } from "react-native";

import type {
  CharacterIdentity,
  CharacterPresentation,
  PresentationMode,
  PresentationStatus
} from "../types/characterPresentation";

export type CharacterPresentationSource = {
  identity: CharacterIdentity;
  displayName: string;
  motifName?: string;
  shortDescription?: string;
  imageSource?: ImageSourcePropType;
  thumbnailSource?: ImageSourcePropType;
  presentationStatus?: PresentationStatus;
  isProvisional?: boolean;
};

type ResolverOptions = {
  sources: readonly CharacterPresentationSource[];
  defaultMode: PresentationMode;
};

const modeFallbackReason = (mode: PresentationMode) =>
  mode === "zoological"
    ? "zoological-data-unavailable" as const
    : mode === "hybrid"
      ? "hybrid-data-unavailable" as const
      : undefined;

/**
 * 表示情報だけを解決する純粋な resolver。抽選、採番、履歴、DB、rarity、releaseStatus は変更しない。
 * Phase 3A では zoological / hybrid の正式データが無いため character mode へ安全に戻す。
 */
export const createCharacterPresentationResolver = ({ sources, defaultMode }: ResolverOptions) => {
  const sourceById = new Map<string, CharacterPresentationSource>();
  for (const source of sources) {
    if (sourceById.has(source.identity.characterId)) {
      throw new Error(`duplicate character presentation source: ${source.identity.characterId}`);
    }
    sourceById.set(source.identity.characterId, source);
  }

  const getCharacterIdentity = (characterId: string): CharacterIdentity | undefined =>
    sourceById.get(characterId)?.identity;

  const resolveCharacterPresentation = (
    characterId: string,
    requestedMode: PresentationMode = defaultMode
  ): CharacterPresentation | undefined => {
    const source = sourceById.get(characterId);
    if (!source) return undefined;

    const unavailableModeReason = modeFallbackReason(requestedMode);
    const presentationMode = unavailableModeReason ? defaultMode : requestedMode;
    const thumbnailSource = source.thumbnailSource ?? source.imageSource;
    const presentationStatus = source.presentationStatus ?? (source.imageSource ? "legacy" : "missing");
    const fallbackReason = unavailableModeReason ?? (!source.imageSource ? "image-unavailable" : undefined);

    return {
      characterId,
      displayName: source.displayName,
      characterName: source.displayName,
      motifName: source.motifName,
      shortDescription: source.shortDescription,
      imageSource: source.imageSource,
      thumbnailSource,
      altText: source.imageSource ? `${source.displayName}のキャラクター画像` : `${source.displayName}（画像準備中）`,
      requestedMode,
      presentationMode,
      presentationStatus,
      fallbackReason,
      isProvisional: source.isProvisional ?? presentationStatus === "provisional"
    };
  };

  return { getCharacterIdentity, resolveCharacterPresentation };
};
