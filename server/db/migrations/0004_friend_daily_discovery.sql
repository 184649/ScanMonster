-- フレンドQRを「正式な発見」へ統合する（段2）。仕様 §3/§8/§15/§16。
-- 既存 friend_qr_reads を拡張（新テーブルは作らない）。
--  - discovery_id: フレンドQR発見が発行した discovery_records.id を紐づける。
--  - UNIQUE(reader_user_id, owner_user_id, local_date): 同一相手・同日は1回のみ有効（DBレベルで保証）。
--    A→B と B→A は (reader,owner) が異なるため別々に有効。

ALTER TABLE friend_qr_reads ADD COLUMN discovery_id TEXT;

-- 同日重複防止（アプリ側の重複チェックに加え、DBでも一意性を保証）。
CREATE UNIQUE INDEX IF NOT EXISTS uq_friend_qr_reads_daily
  ON friend_qr_reads (reader_user_id, owner_user_id, local_date);

-- 日次の有効フレンド人数集計を速くする（reader + 日付）。※既存 idx_friend_qr_reads_reader と役割は近いが明示。
CREATE INDEX IF NOT EXISTS idx_friend_qr_reads_reader_date
  ON friend_qr_reads (reader_user_id, local_date);
