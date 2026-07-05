#!/usr/bin/env bash
# WORLDAWN 自動バックアップ（Phase 5）。pg_dump カスタム形式・世代保持・破損検知・任意オフサイト複製。
#
# 必須環境変数： DATABASE_URL
# 任意： BACKUP_DIR(default /var/backups/worldawn) / KEEP(残す世代数 default 14) /
#        OFFSITE_CMD（{file} を実パスに置換して実行。例: "rclone copy {file} remote:worldawn/"）
#
# 失敗時は非0で終了する（cron/systemd 側で検知）。
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?set DATABASE_URL}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/worldawn}"
KEEP="${KEEP:-14}"

log() { echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }
sha() { if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1"; else shasum -a 256 "$1"; fi; }

mkdir -p "$BACKUP_DIR"
ts=$(date -u +%Y%m%dT%H%M%SZ)
file="$BACKUP_DIR/worldawn_${ts}.dump"

log "starting pg_dump -> $file"
if ! pg_dump "$DATABASE_URL" -Fc -Z 6 -f "$file"; then
  log "ERROR pg_dump failed"
  exit 1
fi

# 破損検知：pg_restore --list が通ることを確認（壊れたダンプを世代に残さない）。
if ! pg_restore --list "$file" >/dev/null 2>&1; then
  log "ERROR integrity check failed (pg_restore --list)"
  rm -f "$file"
  exit 2
fi

sha "$file" > "$file.sha256"
log "created $(du -h "$file" | cut -f1) $file"

# オフサイト複製（DB本体と別の保存先へ）。設定時のみ。
if [ -n "${OFFSITE_CMD:-}" ]; then
  if eval "${OFFSITE_CMD//\{file\}/$file}"; then
    eval "${OFFSITE_CMD//\{file\}/$file.sha256}" || true
    log "offsite copied"
  else
    log "ERROR offsite copy failed"
    exit 3
  fi
fi

# 世代ローテーション（新しい方から KEEP 個を残す）。
mapfile -t old < <(ls -1t "$BACKUP_DIR"/worldawn_*.dump 2>/dev/null | tail -n +$((KEEP + 1)) || true)
for f in "${old[@]:-}"; do
  [ -n "$f" ] || continue
  log "rotate remove $f"
  rm -f "$f" "$f.sha256"
done

log "done"
