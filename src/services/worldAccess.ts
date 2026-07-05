import type { WorldGroup } from "../types/worlds";

/**
 * Returns the worlds that are actually unlocked in saved game data.
 * Debug mode must not expand this list, otherwise scans and the dex can reveal
 * characters from worlds the player has not opened yet.
 */
export const effectiveUnlockedWorldGroups = (persisted: WorldGroup[]): WorldGroup[] => persisted;
