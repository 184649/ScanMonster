import AsyncStorage from "@react-native-async-storage/async-storage";

import { FEATURE_FLAGS } from "../constants/featureFlags";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { createDefaultEconomyState, normalizeEconomyState } from "../data/economy";
import type { EconomyStateData } from "../types/economy";
import type { ActiveExpedition } from "../types/expedition";
import type { DailySourceLimit, ScanHistory } from "../types/scan";
import type { UserMonster } from "../types/monster";
import type { MissionProgress } from "../types/mission";
import type { UserProfile } from "../types/profile";
import type { AppSettings } from "../types/region";
import type { FamilyResearch } from "../types/research";
import { createDefaultProfile, deriveFriendCode, normalizeUserProfile } from "./profileService";

export const CURRENT_SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS: AppSettings = {
  scannerCooldownMs: 1800,
  showScanDebug: FEATURE_FLAGS.SHOW_SCAN_DEBUG,
  showMonsterImageDebug: FEATURE_FLAGS.SHOW_CHARACTER_IMAGE_DEBUG
};

const LEGACY_STORAGE_KEYS = {
  monsters: "@scanmonster/monsters",
  histories: "@scanmonster/scan-histories",
  settings: "@scanmonster/settings"
} as const;

const readJson = async <T>(key: string, fallback: T): Promise<T> => {
  const raw = await AsyncStorage.getItem(key);

  if (!raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = async <T>(key: string, value: T): Promise<void> => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

const readJsonWithLegacy = async <T>(key: string, legacyKey: string, fallback: T): Promise<T> => {
  const current = await readJson<T>(key, fallback);

  if (Array.isArray(current) && current.length === 0) {
    return readJson<T>(legacyKey, fallback);
  }

  if (!Array.isArray(current) && current === fallback) {
    return readJson<T>(legacyKey, fallback);
  }

  return current;
};

export const storageService = {
  async ensureSchema(): Promise<void> {
    const rawVersion = await AsyncStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
    const version = rawVersion ? Number(rawVersion) : 0;

    if (!Number.isFinite(version) || version < CURRENT_SCHEMA_VERSION) {
      await AsyncStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, String(CURRENT_SCHEMA_VERSION));
    }
  },

  async saveMonster(monster: UserMonster): Promise<void> {
    const monsters = await storageService.getMonsters();
    const next = [monster, ...monsters.filter((item) => item.id !== monster.id)];
    await writeJson(STORAGE_KEYS.MONSTERS, next);
  },

  async getMonsters(): Promise<UserMonster[]> {
    return readJsonWithLegacy<UserMonster[]>(STORAGE_KEYS.MONSTERS, LEGACY_STORAGE_KEYS.monsters, []);
  },

  async getMonsterById(id: string): Promise<UserMonster | undefined> {
    const monsters = await storageService.getMonsters();
    return monsters.find((monster) => monster.id === id);
  },

  async updateMonster(monster: UserMonster): Promise<void> {
    const monsters = await storageService.getMonsters();
    await writeJson(
      STORAGE_KEYS.MONSTERS,
      monsters.map((item) => (item.id === monster.id ? monster : item))
    );
  },

  async saveScanHistory(history: ScanHistory): Promise<void> {
    const histories = await storageService.getScanHistories();
    await writeJson(STORAGE_KEYS.SCAN_HISTORY, [history, ...histories.filter((item) => item.id !== history.id)]);
  },

  async getScanHistories(): Promise<ScanHistory[]> {
    return readJsonWithLegacy<ScanHistory[]>(STORAGE_KEYS.SCAN_HISTORY, LEGACY_STORAGE_KEYS.histories, []);
  },

  async getSettings(): Promise<AppSettings> {
    return readJsonWithLegacy<AppSettings>(STORAGE_KEYS.SETTINGS, LEGACY_STORAGE_KEYS.settings, DEFAULT_SETTINGS);
  },

  async saveSettings(settings: AppSettings): Promise<void> {
    await writeJson(STORAGE_KEYS.SETTINGS, {
      ...DEFAULT_SETTINGS,
      ...settings
    });
  },

  async getExpeditions(): Promise<ActiveExpedition[]> {
    return readJson<ActiveExpedition[]>(STORAGE_KEYS.EXPEDITIONS, []);
  },

  async saveExpeditions(expeditions: ActiveExpedition[]): Promise<void> {
    await writeJson(STORAGE_KEYS.EXPEDITIONS, expeditions);
  },

  async getResearch(): Promise<FamilyResearch[]> {
    return readJson<FamilyResearch[]>(STORAGE_KEYS.RESEARCH, []);
  },

  async saveResearch(research: FamilyResearch[]): Promise<void> {
    await writeJson(STORAGE_KEYS.RESEARCH, research);
  },

  async getMissionProgress(): Promise<MissionProgress[]> {
    return readJson<MissionProgress[]>(STORAGE_KEYS.MISSIONS, []);
  },

  async saveMissionProgress(progress: MissionProgress[]): Promise<void> {
    await writeJson(STORAGE_KEYS.MISSIONS, progress);
  },

  async getEconomy(): Promise<EconomyStateData> {
    const value = await readJson<Partial<EconomyStateData> | null>(STORAGE_KEYS.ECONOMY, null);
    return normalizeEconomyState(value ?? createDefaultEconomyState());
  },

  async saveEconomy(economy: EconomyStateData): Promise<void> {
    await writeJson(STORAGE_KEYS.ECONOMY, normalizeEconomyState(economy));
  },

  async getUserProfile(): Promise<UserProfile | null> {
    return readJson<UserProfile | null>(STORAGE_KEYS.USER_PROFILE, null);
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    await writeJson(STORAGE_KEYS.USER_PROFILE, profile);
  },

  /**
   * 完全な UserProfile を取得する。
   * 無ければ一度だけ生成し、旧形式（userSalt/createdAt のみ）は現行形へ補完して保存する。
   */
  async ensureProfile(): Promise<UserProfile> {
    const existing = await readJson<Partial<UserProfile> | null>(STORAGE_KEYS.USER_PROFILE, null);

    if (!existing?.userSalt) {
      const created = await createDefaultProfile();
      await storageService.saveUserProfile(created);
      return created;
    }

    // friendCode が無い旧プロフィールは userSalt から決定的に補完する。
    const friendCode = existing.friendCode ?? (await deriveFriendCode(existing.userSalt));
    const normalized = normalizeUserProfile(existing, existing.userSalt, friendCode);

    // 補完が発生した場合のみ書き戻す。
    if (JSON.stringify(normalized) !== JSON.stringify(existing)) {
      await storageService.saveUserProfile(normalized);
    }

    return normalized;
  },

  /** userSalt を取得する。なければプロフィールを生成して保存する。 */
  async ensureUserSalt(): Promise<string> {
    const profile = await storageService.ensureProfile();
    return profile.userSalt;
  },

  async getDailySourceLimits(): Promise<DailySourceLimit[]> {
    return readJson<DailySourceLimit[]>(STORAGE_KEYS.DAILY_LIMITS, []);
  },

  async saveDailySourceLimits(limits: DailySourceLimit[]): Promise<void> {
    await writeJson(STORAGE_KEYS.DAILY_LIMITS, limits);
  },

  async clearGameData(): Promise<void> {
    // ゲーム進行（モンスター・DP・開放・研究・履歴・ミッション）のみ削除する。
    // プロフィール（ログイン状態・フレンドコード・フレンド・招待受け取り履歴）は保持し、
    // データリセットでログアウトや招待DPの再取得が起きないようにする。
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.GAME_DATA,
      STORAGE_KEYS.MONSTERS,
      STORAGE_KEYS.SCAN_HISTORY,
      STORAGE_KEYS.DAILY_LIMITS,
      STORAGE_KEYS.EXPEDITIONS,
      STORAGE_KEYS.MISSIONS,
      STORAGE_KEYS.RESEARCH,
      STORAGE_KEYS.ECONOMY,
      LEGACY_STORAGE_KEYS.monsters,
      LEGACY_STORAGE_KEYS.histories,
      LEGACY_STORAGE_KEYS.settings
    ]);
  }
};
