export const STORAGE_KEYS = {
  SCHEMA_VERSION: "scanmonster:schemaVersion",
  GAME_DATA: "scanmonster:gameData",
  USER_PROFILE: "scanmonster:userProfile",
  MONSTERS: "scanmonster:monsters",
  SCAN_HISTORY: "scanmonster:scanHistory",
  DAILY_LIMITS: "scanmonster:dailySourceLimits",
  EXPEDITIONS: "scanmonster:expeditions",
  MISSIONS: "scanmonster:missions",
  RESEARCH: "scanmonster:research",
  ECONOMY: "scanmonster:economy",
  SETTINGS: "scanmonster:settings",
  // 発見記録ドメイン（フェーズ1）。
  DISCOVERY_COUNTERS: "scanmonster:discoveryCounters",
  DISCOVERY_RECORDS: "scanmonster:discoveryRecords",
  CHARACTER_RECORDS: "scanmonster:characterRecords",
  // アカウント連携（サーバー採番の正規userId・トークン）。
  ACCOUNT: "scanmonster:account"
} as const;
