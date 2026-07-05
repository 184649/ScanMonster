/**
 * 伝説解放演出の「一度だけ表示」永続化（段3）。
 * 解放演出を見せたワールドを端末に記録し、戻る・再表示・再起動で再演出しないようにする。
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "worldawn.legendaryRevealed.v1";

export const getRevealedWorlds = async (): Promise<Set<string>> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
};

export const markWorldRevealed = async (worldGroup: string): Promise<void> => {
  try {
    const set = await getRevealedWorlds();
    if (set.has(worldGroup)) return;
    set.add(worldGroup);
    await AsyncStorage.setItem(KEY, JSON.stringify([...set]));
  } catch {
    // 記録失敗は致命的でない（最悪もう一度演出が出るだけ）。
  }
};
