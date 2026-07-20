/**
 * 図鑑プロフィール（科学情報）の参照層。
 *
 * 正本は assets/characters/species-profiles.json。行が無い＝未調査。
 * 461種すべてを最初から埋める必要はなく、確認済みの種から順に公開する（継続コンテンツ制作）。
 *
 * 表示ルール（分類ごとの項目・見出し）は JSON に依存しない speciesProfile.core.ts 側にある。
 */
import raw from "../../assets/characters/species-profiles.json";

import type { DexClass } from "./characterCatalog.generated";
import { isPublishable, type SpeciesProfile, type SpeciesProfileMap } from "../types/speciesProfile";

export {
  profileFieldsFor,
  dexClassLabel,
  dexClassNote,
  type ProfileField
} from "./speciesProfile.core";

const PROFILES = ((raw as { profiles?: SpeciesProfileMap }).profiles ?? {}) as SpeciesProfileMap;

/** id の図鑑プロフィール（未調査なら undefined）。 */
export const getSpeciesProfile = (id: string): SpeciesProfile | undefined => PROFILES[id];

/** 図鑑へ公開してよいプロフィール。未確認・出典なしは undefined を返す。 */
export const getPublishedProfile = (id: string, dexClass: DexClass): SpeciesProfile | undefined => {
  const p = PROFILES[id];
  return isPublishable(p, dexClass) ? p : undefined;
};

/** 公開済みプロフィールを持つ id の数（進捗表示・テスト用）。 */
export const publishedProfileCount = (dexClassOf: (id: string) => DexClass): number =>
  Object.keys(PROFILES).filter((id) => isPublishable(PROFILES[id], dexClassOf(id))).length;

export const allProfileIds = (): string[] => Object.keys(PROFILES);
