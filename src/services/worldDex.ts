/**
 * ワールド図鑑（アプリ向けバインダ）。純粋ロジックは worldDex.core.ts。
 */
import { FEATURE_FLAGS } from "../constants/featureFlags";
import {
  CATALOG_CHARACTERS,
  CATALOG_RARES,
  type CatalogCharacter,
  type CatalogRare
} from "../data/characterCatalog.generated";
import { RELEASED_WORLD_DEFS, WORLD_GROUP_DEFS, type WorldGroupDef } from "../data/worlds";
import type { UserMonster } from "../types/monster";
import type { WorldGroup } from "../types/worlds";
import {
  ownedCatalogIds,
  worldNormalEntries,
  worldProgress,
  worldRareEntries,
  type WorldDexEntry,
  type WorldDexProgress
} from "./worldDex.core";

export type { WorldDexEntry, WorldDexProgress };

export type WorldDexView = {
  world: WorldGroupDef;
  unlocked: boolean;
  normals: WorldDexEntry<CatalogCharacter>[];
  rares: WorldDexEntry<CatalogRare>[];
  progress: WorldDexProgress;
};

/**
 * 図鑑に表示するワールド一覧。**実装済み（RELEASED_WORLD_DEFS）のワールドのみ**。
 * 実装予定（将来）のワールドは図鑑に出さない。order 順。
 */
export const getWorldTabs = (): WorldGroupDef[] =>
  [...RELEASED_WORLD_DEFS].sort((a, b) => a.order - b.order);

/** デバッグモード（DEBUG_ALL_OWNED）時に「全キャラ取得済み」として扱うためのID集合。 */
const debugAllOwnedIds = (): Set<string> =>
  new Set<string>([...CATALOG_CHARACTERS.map((c) => c.id), ...CATALOG_RARES.map((r) => r.id)]);

export const getWorldDexView = (
  world: WorldGroup,
  monsters: UserMonster[],
  unlockedWorlds: WorldGroup[]
): WorldDexView => {
  const def = WORLD_GROUP_DEFS.find((w) => w.key === world) ?? WORLD_GROUP_DEFS[0]!;
  const ownedIds = FEATURE_FLAGS.DEBUG_ALL_OWNED ? debugAllOwnedIds() : ownedCatalogIds(monsters);
  const normals = worldNormalEntries(CATALOG_CHARACTERS, world, ownedIds);
  const rares = worldRareEntries(CATALOG_RARES, world, ownedIds);
  return {
    world: def,
    unlocked: unlockedWorlds.includes(world),
    normals,
    rares,
    progress: worldProgress(normals, rares)
  };
};

/** 所持モンスターを characterId でマップ化（図鑑で所持画像を出すため）。 */
export const monstersByCatalogId = (monsters: UserMonster[]): Map<string, UserMonster> => {
  const map = new Map<string, UserMonster>();
  for (const m of monsters) {
    const id = m.characterId ?? m.imageKey;
    if (id && !map.has(id)) {
      map.set(id, m);
    }
  }
  return map;
};
