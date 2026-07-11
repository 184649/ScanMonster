-- ワールド構造・出現分類の整理（§10）。都道府県キャラ・フレンドQR・フレンド効果。
-- rarity/world_group は TEXT のまま（normal/rare/prefecture/friend/secret/variant/limited、land/water/sky/bug/friend/prefecture/secret）。

-- 発見証明に出現分類・地域・フレンド情報を記録。
ALTER TABLE discovery_records ADD COLUMN prefecture_code TEXT;
ALTER TABLE discovery_records ADD COLUMN prefecture_name TEXT;
ALTER TABLE discovery_records ADD COLUMN discovery_source TEXT NOT NULL DEFAULT 'normal_scan';
ALTER TABLE discovery_records ADD COLUMN friend_qr_id TEXT;
ALTER TABLE discovery_records ADD COLUMN friend_effect_level INTEGER NOT NULL DEFAULT 0;

-- キャラマスタに地域・限定（将来）用の列を追加。
ALTER TABLE character_masters ADD COLUMN prefecture_code TEXT;
ALTER TABLE character_masters ADD COLUMN prefecture_name TEXT;
ALTER TABLE character_masters ADD COLUMN limited_type TEXT;
ALTER TABLE character_masters ADD COLUMN region_id TEXT;
ALTER TABLE character_masters ADD COLUMN company_id TEXT;
ALTER TABLE character_masters ADD COLUMN campaign_id TEXT;
ALTER TABLE character_masters ADD COLUMN starts_at TIMESTAMPTZ;
ALTER TABLE character_masters ADD COLUMN ends_at TIMESTAMPTZ;

-- フレンドQR読み込み履歴（同一相手の連打補正悪用を避けるため owner を記録）。
CREATE TABLE IF NOT EXISTS friend_qr_reads (
  id TEXT PRIMARY KEY,
  reader_user_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  is_new_friend BOOLEAN NOT NULL DEFAULT FALSE,
  friend_character_id TEXT,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  local_date TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_friend_qr_reads_reader ON friend_qr_reads (reader_user_id, local_date);
CREATE INDEX IF NOT EXISTS idx_friend_qr_reads_pair ON friend_qr_reads (reader_user_id, owner_user_id);

-- フレンド効果の状態（連続日数・新規フレンド数・レベル）。
CREATE TABLE IF NOT EXISTS friend_effect_state (
  user_id TEXT PRIMARY KEY,
  streak_days INTEGER NOT NULL DEFAULT 0,
  new_friend_count INTEGER NOT NULL DEFAULT 0,
  effect_level INTEGER NOT NULL DEFAULT 0,
  last_friend_qr_date TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
