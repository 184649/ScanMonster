/**
 * 伝説キャラのUI可視性（純粋・依存注入・テスト可能）。段3（アプリ側）。
 *
 * 最重要（§4）: そのワールドの normal を全発見する前は、伝説の存在を一切示唆しない。
 *  - 未解放ワールドの legendary は「候補にも総数にも一切含めない」＝存在しないように見せる。
 *  - 解放（normal コンプリート）後のみ、そのワールドの legendary を表示可能。
 *  - secret はこの層では扱わない（未発見時は常に非表示・カタログにも出さない）。
 */
import type { CatalogCharacter, CatalogRare } from "../data/characterCatalog.generated";

export type LegendaryEntry = { entry: CatalogRare; owned: boolean };

/** normal を全発見済みのワールド集合（＝伝説解放済み）。画像実在(hasImage)の normal を母数にする。 */
export const completedNormalWorlds = (normals: CatalogCharacter[], ownedIds: Set<string>): Set<string> => {
  const byWorld = new Map<string, { total: number; owned: number }>();
  for (const c of normals) {
    if (!c.hasImage) continue;
    const rec = byWorld.get(c.worldGroup) ?? { total: 0, owned: 0 };
    rec.total += 1;
    if (ownedIds.has(c.id)) rec.owned += 1;
    byWorld.set(c.worldGroup, rec);
  }
  const done = new Set<string>();
  for (const [world, r] of byWorld) {
    if (r.total > 0 && r.owned >= r.total) done.add(world);
  }
  return done;
};

/** そのワールドの伝説が解放済みか。 */
export const isWorldLegendaryUnlocked = (worldGroup: string, completedWorlds: Set<string>): boolean =>
  completedWorlds.has(worldGroup);

/**
 * 表示してよい伝説エントリ（解放済みワールドのものだけ）。
 * 未解放ワールドの legendary は返さない＝件数・存在が漏れない（§4）。
 */
export const visibleLegendaryEntries = (
  legendaries: CatalogRare[],
  ownedIds: Set<string>,
  completedWorlds: Set<string>
): LegendaryEntry[] =>
  legendaries
    .filter((l) => completedWorlds.has(l.worldGroup))
    .sort((a, b) => a.no - b.no)
    .map((entry) => ({ entry, owned: ownedIds.has(entry.id) }));

/** そのワールドで表示してよい伝説エントリ。未解放なら空配列。 */
export const visibleLegendaryEntriesForWorld = (
  legendaries: CatalogRare[],
  worldGroup: string,
  ownedIds: Set<string>,
  completedWorlds: Set<string>
): LegendaryEntry[] =>
  completedWorlds.has(worldGroup)
    ? visibleLegendaryEntries(legendaries, ownedIds, completedWorlds).filter((l) => l.entry.worldGroup === worldGroup)
    : [];

/** 未発見の伝説（詳細遷移は不可＝タップ無効にする対象）。 */
export const isLegendaryLocked = (entry: CatalogRare, ownedIds: Set<string>, completedWorlds: Set<string>): boolean =>
  !completedWorlds.has(entry.worldGroup) || !ownedIds.has(entry.id);

/** 解放演出を出すべきか（未演出の解放ワールドのときだけ true）。二重表示防止に使う。 */
export const shouldRevealLegendary = (legendaryUnlockedNow: string | undefined, revealed: Set<string>): boolean =>
  Boolean(legendaryUnlockedNow) && !revealed.has(legendaryUnlockedNow as string);
