-- WORLDAWN 初期スキーマ（仕様 §5）。公式発見番号はサーバー採番・BIGINT。
-- 冪等（IF NOT EXISTS）。migrate ランナーが順に適用する。

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ワールドマスタ（領域>ワールド）。
CREATE TABLE IF NOT EXISTS world_masters (
  world_group TEXT PRIMARY KEY,
  realm_group TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_released BOOLEAN NOT NULL DEFAULT TRUE
);

-- キャラクターマスタ（secret/friend も登録可能。出現可否はフラグで制御）。
CREATE TABLE IF NOT EXISTS character_masters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL DEFAULT 'normal',
  world_group TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  motif_name TEXT,
  real_world_profile JSONB,
  is_visible_in_dex BOOLEAN NOT NULL DEFAULT TRUE,
  is_available_for_scan BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- キャラクターごとの採番カウンター（§5.1）。
CREATE TABLE IF NOT EXISTS discovery_counters (
  counter_key TEXT PRIMARY KEY,
  current_value BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 同日同コード判定（§5.3）。
CREATE TABLE IF NOT EXISTS scan_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  local_date DATE NOT NULL,
  scan_type TEXT NOT NULL,
  is_valid_scan BOOLEAN NOT NULL,
  discovery_record_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_scan_history_user_source_date
  ON scan_history (user_id, source_hash, local_date);

-- 発見証明本体（§5.2）。character_discovery_no は BIGINT。
CREATE TABLE IF NOT EXISTS discovery_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  world_group TEXT NOT NULL,
  rarity TEXT NOT NULL,
  character_discovery_no BIGINT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  local_date DATE NOT NULL,
  is_new_for_user BOOLEAN NOT NULL,
  is_rediscovery BOOLEAN NOT NULL,
  difficulty_rank TEXT NOT NULL,
  discovery_rank_label TEXT NOT NULL,
  number_badges JSONB NOT NULL DEFAULT '[]',
  primary_number_badge JSONB,
  granted_character_titles JSONB NOT NULL DEFAULT '[]',
  strongest_proof BOOLEAN NOT NULL DEFAULT FALSE,
  dp_gained INTEGER NOT NULL DEFAULT 0,
  certificate_id TEXT NOT NULL
);
-- 同一キャラ内で番号が重複しない（§15.7）。
CREATE UNIQUE INDEX IF NOT EXISTS uq_character_discovery_no
  ON discovery_records (character_id, character_discovery_no);
CREATE INDEX IF NOT EXISTS idx_discovery_user_character
  ON discovery_records (user_id, character_id);
CREATE INDEX IF NOT EXISTS idx_discovery_character_no
  ON discovery_records (character_id, character_discovery_no);
CREATE INDEX IF NOT EXISTS idx_discovery_discovered_at
  ON discovery_records (discovered_at);

-- ユーザーごとのキャラクター記録（§5.4）。
CREATE TABLE IF NOT EXISTS character_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  character_id TEXT NOT NULL,
  first_discovered_at TIMESTAMPTZ NOT NULL,
  last_discovered_at TIMESTAMPTZ NOT NULL,
  discovery_count INTEGER NOT NULL DEFAULT 0,
  best_difficulty_rank TEXT NOT NULL,
  titles JSONB NOT NULL DEFAULT '[]',
  active_title TEXT,
  representative_discovery_id TEXT,
  representative_score INTEGER NOT NULL DEFAULT 0,
  first_discovery_id TEXT NOT NULL,
  latest_discovery_id TEXT NOT NULL,
  number_badges JSONB NOT NULL DEFAULT '[]'
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_character_record_user_character
  ON character_records (user_id, character_id);

-- DP 残高・履歴。
CREATE TABLE IF NOT EXISTS user_dp (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS dp_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ワールド解放・ブースト。
CREATE TABLE IF NOT EXISTS user_world_unlocks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  world_group TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_order INTEGER NOT NULL,
  cost_dp INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_world_unlock_user_world
  ON user_world_unlocks (user_id, world_group);

CREATE TABLE IF NOT EXISTS user_boosts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_world_group TEXT NOT NULL,
  remaining_valid_scans INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_user_boosts_active
  ON user_boosts (user_id, is_active);
