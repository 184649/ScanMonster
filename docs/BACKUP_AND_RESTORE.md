# バックアップと復元（BACKUP_AND_RESTORE）

Phase 5–6。公式発見番号・発見証明・ユーザーデータは取り返しのつかない資産なので、日次バックアップ＋復元検証を運用する。

## 現況（正直な明記）

- スクリプト・手順は用意済み：[backup.sh](../server/scripts/backup.sh) / [restore.sh](../server/scripts/restore.sh) / [restore-verify.sh](../server/scripts/restore-verify.sh)。
- **この開発環境には稼働中PostgreSQL・pg_dump が無いため、実際のバックアップ取得・復元・復元検証は「未実行」**。実行は VPS もしくは Docker のある環境で行う。

## バックアップ（[backup.sh](../server/scripts/backup.sh)）

- `pg_dump -Fc -Z 6`（カスタム形式・圧縮）。
- **破損検知**：取得後に `pg_restore --list` が通ることを確認し、壊れたダンプは世代に残さない。
- **チェックサム**：`.sha256` を併記。
- **世代保持・ローテーション**：`KEEP`（既定14世代）を残し古いものを削除。
- **オフサイト複製**：`OFFSITE_CMD`（例 `rclone copy {file} remote:worldawn/`）で **DB本体と別の保存先**へ。VPSローカルだけに置かない。
- **失敗検知**：いずれかの失敗で非0終了（cron/systemd 側で検知・通知）。

環境変数：`DATABASE_URL`（必須）/ `BACKUP_DIR`（既定 `/var/backups/worldawn`）/ `KEEP` / `OFFSITE_CMD`。

### 日次スケジュール例（cron）

```cron
# 毎日 03:15(UTC) にバックアップ。失敗は MAILTO へ。
15 3 * * * DATABASE_URL='postgres://user:pass@127.0.0.1:5432/worldawn' \
  BACKUP_DIR=/var/backups/worldawn KEEP=14 \
  OFFSITE_CMD='rclone copy {file} remote:worldawn/' \
  /opt/worldawn/server/scripts/backup.sh >> /var/log/worldawn-backup.log 2>&1
```

systemd timer でも可（`OnCalendar=*-*-* 03:15:00 UTC`）。より短い間隔が必要なら6〜12時間おきに。

## 含める対象

`pg_dump` はDB全体を対象とするため、以下を含む：
users / accounts / auth_tokens / character_masters / world_masters / discovery_counters / discovery_records / character_records / scan_history / friend_qr_reads / user_world_legendary / user_dp / dp_transactions / user_world_unlocks / user_boosts / transfer_codes / feature_requests / feature_request_reactions。

## 復元（[restore.sh](../server/scripts/restore.sh)）

```bash
./scripts/restore.sh /var/backups/worldawn/worldawn_YYYYmmddTHHMMSSZ.dump \
  "postgres://user:pass@127.0.0.1:5432/worldawn_restore"
```

- 復元前に `pg_restore --list` と `.sha256` を照合。
- `--clean --if-exists` で置換。**本番へ流す場合は対象URLを二重確認**。

## 復元テスト（[restore-verify.sh](../server/scripts/restore-verify.sh)）

「バックアップが存在する」だけでは不十分。**実際に復元でき、重要データが一致すること**を確認する。

```bash
DATABASE_URL='postgres://.../worldawn' \
TARGET_DATABASE_URL='postgres://.../worldawn_verify' \
  ./scripts/restore-verify.sh
```

手順：source をダンプ → target（空DB）へ復元 → 全ユーザー資産テーブルの**件数**、**公式発見番号（character_id:no の全一致）**、**discovery_counters** を突き合わせ。すべて一致で `PASS`。
公式番号の**重複・巻き戻り・再利用が無い**ことをこの比較で担保する。

### 定期の復元リハーサル（推奨）

月1回、最新バックアップを検証用DBへ復元し `restore-verify.sh` 相当（または `pg_restore --list` ＋主要件数チェック）を実施。結果をログに残す。

## サンプルデータでの一気通貫（Docker）

Docker があれば、[POSTGRES_INTEGRATION_TEST.md](POSTGRES_INTEGRATION_TEST.md) の使い捨てDBに `db:seed` でサンプル（複数キャラ発見・公式番号・DP・ワールド解放・フレンド交流・legendary解放）を作り、`backup.sh` → 別DBへ `restore.sh` → `restore-verify.sh` で PASS を確認できる（この環境ではDocker不在のため未実行）。

## 未実行の明記

- 実バックアップ取得・実復元・復元検証の**実行結果は無し（環境待ち）**。スクリプトは `bash -n` 構文チェック済み。
