#!/usr/bin/env bash
# 実PostgreSQL統合テスト（Phase 4）。Docker で使い捨てDBを起動→migrate→全テストを実行。
# 前提：docker / docker compose が使えること。終了時にDBを破棄する。
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL:-postgres://worldawn:worldawn@127.0.0.1:55432/worldawn_test}"

echo "[it] starting test PostgreSQL..."
docker compose -f docker-compose.test.yml up -d --wait
cleanup() { echo "[it] tearing down..."; docker compose -f docker-compose.test.yml down -v; }
trap cleanup EXIT

echo "[it] applying migrations..."
npm run db:migrate

echo "[it] running tests against real PostgreSQL ($DATABASE_URL)..."
node --test "tests/**/*.test.ts"
echo "[it] done."
