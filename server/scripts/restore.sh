#!/usr/bin/env bash
# WORLDAWN 復元（Phase 6）。バックアップ(.dump)を対象DBへ復元する。
#
# 使い方： restore.sh <dumpfile> <TARGET_DATABASE_URL>
#   TARGET_DATABASE_URL は環境変数でも可。
# 注意： --clean --if-exists で既存オブジェクトを置換する。本番DBへ流す場合は十分に確認すること。
set -euo pipefail

FILE="${1:?dump file required}"
TARGET="${2:-${TARGET_DATABASE_URL:?set TARGET_DATABASE_URL or pass as 2nd arg}}"

log() { echo "[restore] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

[ -f "$FILE" ] || { log "ERROR dump not found: $FILE"; exit 1; }

# 破損検知（復元前）。
if ! pg_restore --list "$FILE" >/dev/null 2>&1; then
  log "ERROR dump integrity check failed"
  exit 2
fi

# 任意：チェックサム照合。
if [ -f "$FILE.sha256" ]; then
  if command -v sha256sum >/dev/null 2>&1; then sha256sum -c "$FILE.sha256" || { log "ERROR checksum mismatch"; exit 3; }; fi
fi

log "restoring $FILE -> $TARGET"
pg_restore --clean --if-exists --no-owner --no-privileges -d "$TARGET" "$FILE"
log "done"
