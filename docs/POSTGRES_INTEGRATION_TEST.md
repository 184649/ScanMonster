# 実PostgreSQL統合テスト（POSTGRES_INTEGRATION_TEST）

Phase 4。既存の結合テストは `DATABASE_URL` が設定されていれば**そのまま実PostgreSQLに対して**走る設計（未設定時は pg-mem）。

## 現況（正直な明記）

- **この開発環境では Docker が使えないため、実PostgreSQLでの実行は「未実行」**。
- 用意済み：`docker-compose.test.yml` ／ 実行スクリプト（`scripts/it-postgres.sh` / `.ps1`）／ CI（`.github/workflows/server-it.yml`）／ 実PG専用の同時採番テスト。
- pg-mem での全テストは **133 pass**（同時採番テストは実PG専用のため pg-mem では skip）。

## 実行方法（Docker がある環境）

```bash
cd server
npm run it:postgres          # DB起動 → migrate → 全テスト → DB破棄
```

手動で分けて実行する場合：

```bash
cd server
docker compose -f docker-compose.test.yml up -d --wait
export DATABASE_URL="postgres://worldawn:worldawn@127.0.0.1:55432/worldawn_test"
npm run db:migrate
node --test "tests/**/*.test.ts"
docker compose -f docker-compose.test.yml down -v
```

Windows（PowerShell）：`./scripts/it-postgres.ps1`

## CI

`.github/workflows/server-it.yml` が PostgreSQL 16 のサービスコンテナを起動し、`typecheck → db:migrate → node --test` を実行する。

## VPS（ConoHa 等）での実行手順

```bash
# 例：既存の本番とは別のテスト用DBを作る
sudo -u postgres createdb worldawn_test
export DATABASE_URL="postgres://<user>:<pass>@127.0.0.1:5432/worldawn_test"
cd /opt/worldawn/server
npm ci
npm run db:migrate
node --test "tests/**/*.test.ts"
# 後始末
sudo -u postgres dropdb worldawn_test
```

## 実PostgreSQLで確認される主な項目

migration適用 / seed / 匿名認証 / Bearer / 通常スキャン / 同日同コード重複 / サーバー抽選 / 動的フレンドQR（生成・期限・改ざん・self・同日重複・新規/既存・100人上限・101人目）/ rare補正 / legendary解放・未解放0% / secret固定 / BIGINT・公式番号string / character別連番 / UNIQUE制約 / **同時採番（行ロックで直列化・重複なし）** / transaction / discovery_records / character_records / DP / world unlock / transfer。

## 同時採番の仕様

`discovery_counters` を `UPDATE ... current_value = current_value + 1 ... RETURNING`（1トランザクション内）で行ロックにより直列化。`UNIQUE(character_id, character_discovery_no)`（`uq_character_discovery_no`）で二重採番を最終防御。**採番後にトランザクションが失敗すると欠番が生じ得る**（番号の再利用はしない）＝設計上の許容仕様。[numberingConcurrency.int.test.ts](../server/tests/numberingConcurrency.int.test.ts) が N 並行発見で 1..N の一意性を検証（実PG専用）。
