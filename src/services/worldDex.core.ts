/**
 * ワールド図鑑の集計（純粋・依存注入・テスト可能）。
 * カタログは型のみ import。所持判定は characterId（＝カタログID）で行う。
 */
import type { CatalogCharacter, CatalogRare } from "../data/characterCatalog.generated";

export type WorldDexEntry<T> = { entry: T; owned: boolean };

export type WorldDexProgress = {
  discovered: number;
  total: number;
  imageReady: number;
};

/** 所持モンスターから、所持済みカタログIDの集合を作る。 */
export const ownedCatalogIds = (monsters: { characterId?: string; imageKey?: string }[]): Set<string> => {
  const ids = new Set<string>();
  for (const m of monsters) {
    if (m.characterId) {
      ids.add(m.characterId);
    } else if (m.imageKey) {
      ids.add(m.imageKey);
    }
  }
  return ids;
};

/** 指定ワールド(worldGroup)の通常キャラを No 順で並べ、所持フラグを付ける。 */
export const worldNormalEntries = (
  characters: CatalogCharacter[],
  worldGroup: string,
  ownedIds: Set<string>
): WorldDexEntry<CatalogCharacter>[] =>
  characters
    .filter((c) => c.worldGroup === worldGroup)
    .sort((a, b) => a.no - b.no)
    .map((entry) => ({ entry, owned: ownedIds.has(entry.id) }));

/** 指定ワールド(worldGroup)のレアを No 順で並べ、所持フラグを付ける。 */
export const worldRareEntries = (
  rares: CatalogRare[],
  worldGroup: string,
  ownedIds: Set<string>
): WorldDexEntry<CatalogRare>[] =>
  rares
    .filter((r) => r.worldGroup === worldGroup)
    .sort((a, b) => a.no - b.no)
    .map((entry) => ({ entry, owned: ownedIds.has(entry.id) }));

/** ワールドの発見進捗（通常＋レア）。imageReady＝画像実在で発見可能な枠数。 */
export const worldProgress = (
  normals: WorldDexEntry<CatalogCharacter>[],
  rares: WorldDexEntry<CatalogRare>[]
): WorldDexProgress => {
  const all = [...normals, ...rares];
  return {
    discovered: all.filter((e) => e.owned).length,
    total: all.length,
    imageReady: [...normals.map((e) => e.entry), ...rares.map((e) => e.entry)].filter((c) => c.hasImage).length
  };
};
