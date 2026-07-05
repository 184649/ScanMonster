/**
 * カタログ（通常キャラ・レア）のID逆引き。個体詳細などで説明文・和名を引くのに使う。
 */
import {
  CATALOG_CHARACTERS,
  CATALOG_RARES,
  type CatalogCharacter,
  type CatalogRare
} from "./characterCatalog.generated";

const characterById = new Map<string, CatalogCharacter>(CATALOG_CHARACTERS.map((c) => [c.id, c]));
const rareById = new Map<string, CatalogRare>(CATALOG_RARES.map((r) => [r.id, r]));

export const getCatalogCharacterById = (id: string | undefined): CatalogCharacter | undefined =>
  id ? characterById.get(id) : undefined;

export const getCatalogRareById = (id: string | undefined): CatalogRare | undefined =>
  id ? rareById.get(id) : undefined;

/** 通常・レアを問わずIDから説明文を引く（未記入なら undefined）。 */
export const getCatalogDescriptionById = (id: string | undefined): string | undefined => {
  const desc = (getCatalogCharacterById(id)?.description ?? getCatalogRareById(id)?.description ?? "").trim();
  return desc.length > 0 ? desc : undefined;
};
