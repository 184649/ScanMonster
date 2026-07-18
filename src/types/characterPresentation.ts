import type { ImageSourcePropType } from "react-native";

/** 発見・採番・履歴が参照する不変のゲーム上の同一性。 */
export type CharacterIdentity = {
  characterId: string;
  world: string;
  rarity: string;
  releaseStatus: string;
  isDiscoverable: boolean;
  officialNumberScope: string;
  discoveryHistoryScope: string;
};

/** 表示の組み立て方。Phase 3A の production default は character 固定。 */
export type PresentationMode = "character" | "zoological" | "hybrid";

/** releaseStatus とは独立した、表示素材だけの状態。 */
export type PresentationStatus = "legacy" | "provisional" | "approved" | "missing" | "invalid";

export type PresentationFallbackReason =
  | "image-unavailable"
  | "zoological-data-unavailable"
  | "hybrid-data-unavailable";

/** UI が characterId から受け取る表示専用データ。 */
export type CharacterPresentation = {
  characterId: string;
  displayName: string;
  characterName: string;
  motifName?: string;
  shortDescription?: string;
  imageSource?: ImageSourcePropType;
  thumbnailSource?: ImageSourcePropType;
  altText: string;
  requestedMode: PresentationMode;
  presentationMode: PresentationMode;
  presentationStatus: PresentationStatus;
  fallbackReason?: PresentationFallbackReason;
  isProvisional: boolean;
};
