# 実PostgreSQL統合テスト（Phase 4・Windows用）。Docker で使い捨てDBを起動→migrate→全テスト。
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

if (-not $env:DATABASE_URL) {
  $env:DATABASE_URL = "postgres://worldawn:worldawn@127.0.0.1:55432/worldawn_test"
}

Write-Host "[it] starting test PostgreSQL..."
docker compose -f docker-compose.test.yml up -d --wait
try {
  Write-Host "[it] applying migrations..."
  npm run db:migrate
  Write-Host "[it] running tests against real PostgreSQL ($env:DATABASE_URL)..."
  node --test "tests/**/*.test.ts"
  Write-Host "[it] done."
} finally {
  Write-Host "[it] tearing down..."
  docker compose -f docker-compose.test.yml down -v
}
