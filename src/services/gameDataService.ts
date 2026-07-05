import AsyncStorage from "@react-native-async-storage/async-storage";

import { STORAGE_KEYS } from "../constants/storageKeys";
import type { ActiveExpedition } from "../types/expedition";
import type { MissionProgress } from "../types/mission";
import type { UserMonster } from "../types/monster";
import type { UserProfile } from "../types/profile";
import type { AppSettings } from "../types/region";
import type { FamilyResearch } from "../types/research";
import type { DailySourceLimit, ScanHistory } from "../types/scan";
import { CURRENT_SCHEMA_VERSION, storageService } from "./storageService";

/**
 * ローカル保存データの集約モデル。
 * 各ストアは個別キーで読み書きするが、ここではバックアップ・初期化・
 * スキーマ移行を 1 箇所で扱うための集約 API を提供する。
 */
export type GameData = {
  schemaVersion: number;
  userProfile: UserProfile | null;
  monsters: UserMonster[];
  scanHistory: ScanHistory[];
  dailySourceLimits: DailySourceLimit[];
  expeditions: ActiveExpedition[];
  missions: MissionProgress[];
  research: FamilyResearch[];
  settings: AppSettings | null;
};

export const createDefaultGameData = (): GameData => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  userProfile: null,
  monsters: [],
  scanHistory: [],
  dailySourceLimits: [],
  expeditions: [],
  missions: [],
  research: [],
  settings: null
});

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * 任意の入力を GameData として安全に解釈する。
 * 壊れたデータや型違いがあってもデフォルト値で補完し、例外を投げない。
 */
export const safeParseGameData = (input: unknown): GameData => {
  const base = createDefaultGameData();

  if (!input || typeof input !== "object") {
    return base;
  }

  const data = input as Partial<GameData> & { schemaVersion?: unknown };
  const schemaVersion = typeof data.schemaVersion === "number" && Number.isFinite(data.schemaVersion) ? data.schemaVersion : 0;

  return {
    schemaVersion,
    userProfile:
      data.userProfile && typeof data.userProfile === "object" ? (data.userProfile as UserProfile) : null,
    monsters: asArray<UserMonster>(data.monsters),
    scanHistory: asArray<ScanHistory>(data.scanHistory),
    dailySourceLimits: asArray<DailySourceLimit>(data.dailySourceLimits),
    expeditions: asArray<ActiveExpedition>(data.expeditions),
    missions: asArray<MissionProgress>(data.missions),
    research: asArray<FamilyResearch>(data.research),
    settings: data.settings && typeof data.settings === "object" ? (data.settings as AppSettings) : null
  };
};

/**
 * 旧スキーマのデータを現行スキーマへ移行する。
 * 初回リリースは schemaVersion = 1。将来バージョンを上げる際にここで変換する。
 */
export const migrateGameDataIfNeeded = (data: GameData): GameData => {
  if (data.schemaVersion >= CURRENT_SCHEMA_VERSION) {
    return data;
  }

  // v0 -> v1: 形を整えるのみ（生のバーコード値などは元々保存していない）。
  return {
    ...data,
    schemaVersion: CURRENT_SCHEMA_VERSION
  };
};

/** 個別キーから集約 GameData を読み込む。壊れていても落ちない。 */
export const loadGameData = async (): Promise<GameData> => {
  try {
    const [userProfile, monsters, scanHistory, dailySourceLimits, expeditions, missions, research, settings] =
      await Promise.all([
        storageService.getUserProfile(),
        storageService.getMonsters(),
        storageService.getScanHistories(),
        storageService.getDailySourceLimits(),
        storageService.getExpeditions(),
        storageService.getMissionProgress(),
        storageService.getResearch(),
        storageService.getSettings()
      ]);

    return migrateGameDataIfNeeded(
      safeParseGameData({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        userProfile,
        monsters,
        scanHistory,
        dailySourceLimits,
        expeditions,
        missions,
        research,
        settings
      })
    );
  } catch {
    return createDefaultGameData();
  }
};

/** 集約 GameData をバックアップキーへ保存する。 */
export const saveGameData = async (data: GameData): Promise<void> => {
  await AsyncStorage.setItem(STORAGE_KEYS.GAME_DATA, JSON.stringify(migrateGameDataIfNeeded(data)));
};

/** すべてのローカルデータを初期化する。 */
export const resetGameData = async (): Promise<void> => {
  await storageService.clearGameData();
};
