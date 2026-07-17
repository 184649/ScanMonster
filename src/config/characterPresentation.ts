import type { PresentationMode } from "../types/characterPresentation";

/**
 * 現行の名前・正式画像をそのまま表示する既存挙動は character mode に相当する。
 * zoological / hybrid はデータ未整備のため production では有効化しない。
 */
export const DEFAULT_CHARACTER_PRESENTATION_MODE: PresentationMode = "character";
