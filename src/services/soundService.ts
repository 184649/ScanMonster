/**
 * 効果音（SE）再生サービス。仕様は docs/SOUND_SPEC.md 準拠。
 *
 * 設計上の要点:
 *  - 素材が未配置でもクラッシュしない（SOUND_SOURCES に無い id は無音）。
 *  - 再生・生成の失敗はログのみで握りつぶし、UI 処理を止めない。
 *  - SE OFF なら一切鳴らさない。音量は設定の seVolume を反映。
 *  - 各 SoundId につきプレイヤーを1つだけ生成してキャッシュ（短尺SE向け）。
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

import { SOUND_SOURCES } from "../assets/soundManifest.generated";
import { useSettingsStore } from "../stores/settingsStore";
import { DEFAULT_SOUND_SETTINGS, type SoundId } from "../types/sound";

declare const __DEV__: boolean;

const warn = (message: string, error?: unknown) => {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // 素材未配置やネイティブ非対応でも落とさない。ログのみ。
    console.warn(`[sound] ${message}`, error ?? "");
  }
};

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

let audioModeConfigured = false;
const players: Partial<Record<SoundId, AudioPlayer>> = {};

const configureAudioModeOnce = (): void => {
  if (audioModeConfigured) {
    return;
  }
  audioModeConfigured = true;
  try {
    // サイレントスイッチ中でもSEを鳴らす（ゲーム的フィードバックのため）。
    void setAudioModeAsync({ playsInSilentMode: true });
  } catch (error) {
    warn("setAudioModeAsync failed", error);
  }
};

const getSoundSettings = (): { seEnabled: boolean; seVolume: number } => {
  try {
    const settings = useSettingsStore.getState().settings;
    return {
      seEnabled: settings.seEnabled ?? DEFAULT_SOUND_SETTINGS.seEnabled,
      seVolume: settings.seVolume ?? DEFAULT_SOUND_SETTINGS.seVolume
    };
  } catch {
    return { ...DEFAULT_SOUND_SETTINGS };
  }
};

const getPlayer = (id: SoundId): AudioPlayer | undefined => {
  const cached = players[id];
  if (cached) {
    return cached;
  }
  const source = SOUND_SOURCES[id];
  if (source == null) {
    // 素材未配置＝無音（想定内。ログは出さない）。
    return undefined;
  }
  try {
    const player = createAudioPlayer(source);
    players[id] = player;
    return player;
  } catch (error) {
    warn(`createAudioPlayer failed: ${id}`, error);
    return undefined;
  }
};

/** 効果音を1回鳴らす。SE OFF・素材未配置・失敗時はいずれも安全に何もしない。 */
export const playSound = (id: SoundId): void => {
  try {
    const { seEnabled, seVolume } = getSoundSettings();
    if (!seEnabled) {
      return;
    }
    configureAudioModeOnce();
    const player = getPlayer(id);
    if (!player) {
      return;
    }
    player.volume = clamp01(seVolume);
    // 連続再生でも頭から鳴らす。
    player.seekTo(0);
    player.play();
  } catch (error) {
    warn(`play failed: ${id}`, error);
  }
};

/** テスト・画面遷移時などにキャッシュを解放したい場合に使う（任意）。 */
export const releaseSounds = (): void => {
  for (const id of Object.keys(players) as SoundId[]) {
    try {
      players[id]?.remove();
    } catch (error) {
      warn(`release failed: ${id}`, error);
    }
    delete players[id];
  }
};
