import { create } from "zustand";

import { FEATURE_FLAGS } from "../constants/featureFlags";
import { detectCurrentRegion, saveSelectedRegion } from "../services/regionService";
import { storageService } from "../services/storageService";
import type { AppSettings, RegionDetectionInfo, RegionKey } from "../types/region";

type SettingsStore = {
  settings: AppSettings;
  hydrated: boolean;
  regionDetectionInProgress: boolean;
  hydrate: () => Promise<void>;
  refreshDetectedRegion: () => Promise<RegionDetectionInfo>;
  setSelectedRegion: (regionKey: RegionKey, detection?: RegionDetectionInfo) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
};

const defaultSettings: AppSettings = {
  scannerCooldownMs: 1800,
  showScanDebug: FEATURE_FLAGS.SHOW_SCAN_DEBUG,
  showMonsterImageDebug: FEATURE_FLAGS.SHOW_CHARACTER_IMAGE_DEBUG
};

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: defaultSettings,
  hydrated: false,
  regionDetectionInProgress: false,

  async hydrate() {
    await storageService.ensureSchema();
    const savedSettings = await storageService.getSettings();
    set({ settings: { ...defaultSettings, ...savedSettings }, regionDetectionInProgress: true });

    const result = await detectCurrentRegion();
    const nextSettings: AppSettings = {
      ...defaultSettings,
      ...savedSettings,
      selectedRegionKey: result.regionKey,
      regionDetection: result.detection
    };

    await storageService.saveSettings(nextSettings);
    set({
      settings: nextSettings,
      hydrated: true,
      regionDetectionInProgress: false
    });
  },

  async refreshDetectedRegion() {
    set({ regionDetectionInProgress: true });
    const result = await detectCurrentRegion();
    await saveSelectedRegion(result.regionKey, result.detection);
    set({
      settings: {
        ...get().settings,
        selectedRegionKey: result.regionKey,
        regionDetection: result.detection
      },
      regionDetectionInProgress: false
    });

    return result.detection;
  },

  async setSelectedRegion(regionKey, detection) {
    await saveSelectedRegion(regionKey, detection);
    set({
      settings: {
        ...get().settings,
        selectedRegionKey: regionKey,
        regionDetection: detection
      }
    });
  },

  async updateSettings(nextSettings) {
    const settings = {
      ...get().settings,
      ...nextSettings
    };

    await storageService.saveSettings(settings);
    set({ settings });
  }
}));
