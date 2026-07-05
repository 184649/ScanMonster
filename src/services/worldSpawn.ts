/**
 * ワールド出現抽選（アプリ向けバインダ）。純粋ロジックは worldSpawn.core.ts。
 * 実カタログ（characterCatalog.generated）と getWorldRates（ブースト補正）を束ねる。
 */
import {
  CATALOG_CHARACTERS,
  CATALOG_RARES,
  type CatalogCharacter,
  type CatalogRare
} from "../data/characterCatalog.generated";
import { getWorldRates } from "../data/worlds";
import type { WorldBoost, WorldGroup } from "../types/worlds";
import {
  hasSpawnableWorld,
  selectWorldSpawn as coreSelectWorldSpawn,
  type SpawnRng,
  type WorldSpawnResult
} from "./worldSpawn.core";

export type WorldSpawnPick = WorldSpawnResult<CatalogCharacter, CatalogRare>;

export const selectWorldSpawn = (args: {
  unlockedWorldGroups: WorldGroup[];
  activeBoost?: WorldBoost;
  wantRare: boolean;
  rng: SpawnRng;
}): WorldSpawnPick | undefined => {
  const rates = getWorldRates(args.unlockedWorldGroups, args.activeBoost) as Partial<Record<string, number>>;
  return coreSelectWorldSpawn(CATALOG_CHARACTERS, CATALOG_RARES, {
    unlockedWorlds: args.unlockedWorldGroups,
    rates,
    wantRare: args.wantRare,
    rng: args.rng
  });
};

export const hasSpawnableWorldCharacters = (unlockedWorldGroups: WorldGroup[]): boolean =>
  hasSpawnableWorld(CATALOG_CHARACTERS, unlockedWorldGroups);

/**
 * デバッグ用：実際にレアが出現し得るワールド（画像実在のレア"かつ"画像実在の通常キャラが両方あるワールド）。
 * selectWorldSpawn は「画像実在の通常キャラがあるワールド」からしか抽選しないため、この交差集合が必要。
 */
export const rareReadyWorldGroups = (): WorldGroup[] => {
  const rareWorlds = new Set(CATALOG_RARES.filter((r) => r.hasImage).map((r) => r.worldGroup));
  return [...rareWorlds].filter((w) =>
    CATALOG_CHARACTERS.some((c) => c.worldGroup === w && c.hasImage)
  ) as WorldGroup[];
};
