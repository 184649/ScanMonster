/**
 * ワールド解放の実効値を返す。
 * 通常は economy に保存された `unlockedWorldGroups` をそのまま使う。
 * デバッグモード（`FEATURE_FLAGS.DEBUG_MODE`）の間は、全ワールドを解放扱いにして
 * 全キャラを図鑑・出現の対象にする（実出現は画像実在キャラのみ）。
 */
import { FEATURE_FLAGS } from "../constants/featureFlags";
import { ALL_WORLD_GROUPS } from "../data/worlds";
import type { WorldGroup } from "../types/worlds";

export const effectiveUnlockedWorldGroups = (persisted: WorldGroup[]): WorldGroup[] =>
  FEATURE_FLAGS.DEBUG_MODE ? ALL_WORLD_GROUPS : persisted;
