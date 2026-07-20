/**
 * 効果音（SE）の型定義。音仕様は docs/SOUND_SPEC.md 準拠。
 * 初回リリースはBGMなし・キャラ個別鳴き声なし・共通SEのみ。
 */
export type SoundId =
  | "tap"
  | "cancel"
  | "error"
  | "scan_start"
  | "scan_read"
  | "scan_success"
  | "discovery_normal"
  | "discovery_rare"
  | "discovery_legend"
  | "discovery_secret"
  | "dex_complete"
  | "rediscovery"
  | "dp_gain"
  | "world_unlock"
  | "boost_activate"
  | "title_unlock"
  | "favorite";

/** SoundId → 素材ファイルのベース名（拡張子なし）。generateSoundManifest と共有。 */
export const SOUND_FILE_BASENAMES: Record<SoundId, string> = {
  tap: "sound_ui_tap",
  cancel: "sound_ui_cancel",
  error: "sound_ui_error",
  scan_start: "sound_scan_start",
  scan_read: "sound_scan_read",
  scan_success: "sound_scan_success",
  discovery_normal: "sound_discovery_normal",
  discovery_rare: "sound_discovery_rare",
  discovery_legend: "sound_discovery_legend",
  discovery_secret: "sound_discovery_secret",
  dex_complete: "sound_dex_complete",
  rediscovery: "sound_rediscovery",
  dp_gain: "sound_dp_gain",
  world_unlock: "sound_world_unlock",
  boost_activate: "sound_boost_activate",
  title_unlock: "sound_title_unlock",
  favorite: "sound_favorite"
};

export type SoundSettings = {
  seEnabled: boolean;
  seVolume: number; // 0.0 - 1.0
};

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  seEnabled: true,
  seVolume: 0.8
};
