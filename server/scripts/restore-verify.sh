#!/usr/bin/env bash
# WORLDAWN 復元テスト（Phase 6）。
# source をダンプ → 別の空DB(target)へ復元 → 重要テーブルの件数と公式番号が一致することを確認する。
#
# 必須： DATABASE_URL（source）／ TARGET_DATABASE_URL（復元先。空DB推奨・上書きされる）
# 期待： すべて一致で "[verify] PASS"（非一致があれば非0終了）。
set -euo pipefail

SRC="${DATABASE_URL:?set DATABASE_URL (source)}"
TARGET="${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL (restore destination)}"

log() { echo "[verify] $*"; }
q() { psql "$1" -tAc "$2"; }

TMP=$(mktemp -d)
DUMP="$TMP/verify.dump"
trap 'rm -rf "$TMP"' EXIT

log "dump source..."
pg_dump "$SRC" -Fc -f "$DUMP"
log "restore into target..."
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET" "$DUMP"

TABLES="users accounts auth_tokens character_masters world_masters discovery_counters discovery_records character_records scan_history friend_qr_reads user_world_legendary user_dp dp_transactions user_world_unlocks user_boosts transfer_codes feature_requests feature_request_reactions"

fail=0
for t in $TABLES; do
  a=$(q "$SRC" "SELECT COUNT(*) FROM $t" 2>/dev/null || echo NA)
  b=$(q "$TARGET" "SELECT COUNT(*) FROM $t" 2>/dev/null || echo NA)
  if [ "$a" != "$b" ]; then log "MISMATCH $t src=$a target=$b"; fail=1; else log "ok $t=$a"; fi
done

# 公式発見番号（キャラ別連番）が完全一致すること。巻き戻り・重複・再利用がないことを担保。
na=$(q "$SRC" "SELECT COALESCE(string_agg(character_id||':'||character_discovery_no, ',' ORDER BY character_id, character_discovery_no), '') FROM discovery_records")
nb=$(q "$TARGET" "SELECT COALESCE(string_agg(character_id||':'||character_discovery_no, ',' ORDER BY character_id, character_discovery_no), '') FROM discovery_records")
if [ "$na" != "$nb" ]; then log "MISMATCH official numbers"; fail=1; else log "ok official numbers identical"; fi

# 採番カウンターの一致。
ca=$(q "$SRC" "SELECT COALESCE(string_agg(counter_key||'='||current_value, ',' ORDER BY counter_key), '') FROM discovery_counters")
cb=$(q "$TARGET" "SELECT COALESCE(string_agg(counter_key||'='||current_value, ',' ORDER BY counter_key), '') FROM discovery_counters")
if [ "$ca" != "$cb" ]; then log "MISMATCH discovery_counters"; fail=1; else log "ok discovery_counters identical"; fi

if [ "$fail" -eq 0 ]; then log "PASS"; else log "FAIL"; exit 1; fi
