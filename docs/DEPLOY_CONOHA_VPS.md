# WORLDAWN ConoHa VPS デプロイ手順（実行順ランブック）

ユーザーが VPS 上でそのまま実行できるコマンド手順。各ステップに **期待される結果** と
**失敗時に見るログ** を併記する。タグの意味:

- `[VPSで実行]` … SSH で ConoHa VPS に入って実行
- `[ローカルPCで実行]` … 手元のPCから実行
- `[アプリ側]` … Expo アプリの環境変数など

前提: ConoHa VPS（Ubuntu 22.04/24.04）、独自ドメイン `api.example.com` を VPS の IP に向け済み
（DNS の A レコード設定済み）。以下 `api.example.com` は自分のドメインに置換する。

構成: `server/`（Node+TypeScript+Express、tsx 実行）＋ PostgreSQL を **Docker Compose**、
公開は **Nginx リバースプロキシ＋HTTPS(certbot)**。API の 3000 番は外部公開しない（Nginx 経由のみ）。

## 検証状況
- 開発機で **pg-mem（実SQL）＋実HTTP** により migration/採番/No.777/最強の証/duplicate/`/api/health`/`/api/scan` を検証済み（`server` テスト 17 pass）。
- **本 VPS 上での docker compose 実行・実 PostgreSQL・Nginx/HTTPS・実機接続は本書の手順でユーザーが実施する（未実施）。**

---

## STEP 1. VPS 初期セットアップ

```bash
[VPSで実行]
# 1-1. 更新
sudo apt update && sudo apt upgrade -y

# 1-2. 作業ユーザー確認（root の場合は一般ユーザー作成を推奨）
whoami
# 期待: worldawn などの一般ユーザー。root なら:
#   sudo adduser worldawn && sudo usermod -aG sudo worldawn  → 再ログイン

# 1-3. 必要ツール（git など）
sudo apt install -y git curl

# 1-4. Docker / Docker Compose 導入
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# ★ここで一度ログアウト→再ログイン（docker をsudoなしで使うため）
docker --version && docker compose version
# 期待: Docker version 2x.x / Docker Compose version v2.x

# 1-5. ファイアウォール（UFW）
sudo ufw allow 22/tcp     # SSH
sudo ufw allow 80/tcp     # HTTP（certbot / Nginx）
sudo ufw allow 443/tcp    # HTTPS
sudo ufw --force enable
sudo ufw status
# 期待: 22,80,443 が ALLOW。3000/5432 は出さない（Nginx/コンテナ内部のみ）

# 1-6. プロジェクト配置
mkdir -p ~/apps && cd ~/apps
git clone <このリポジトリのURL> worldawn
cd worldawn/server
```
**失敗時**: `docker: permission denied` → 再ログインしていない（1-4 の usermod 後の再ログイン必須）。
`git clone` 失敗 → URL/権限確認、プライベートなら deploy key。

Node.js を VPS に直接入れる必要はない（tsx はコンテナ内で動く）。

---

## STEP 2. .env 作成（シークレット生成）

```bash
[VPSで実行]
cd ~/apps/worldawn/server
cp .env.example .env

# 2-1. シークレット生成（表示された値を .env に貼る）
openssl rand -base64 32   # JWT_SECRET 用
openssl rand -base64 32   # SOURCE_HASH_SECRET 用
openssl rand -base64 24   # POSTGRES_PASSWORD 用（記号少なめ推奨）

nano .env
```
`.env` の本番例:
```env
NODE_ENV=production
PORT=3000
# docker compose では api コンテナの DATABASE_URL は compose 側で
# POSTGRES_PASSWORD から自動生成される。ローカル直接起動用にこの行も残してよい。
DATABASE_URL=postgresql://worldawn_user:<POSTGRES_PASSWORD>@db:5432/worldawn
POSTGRES_PASSWORD=<生成した値>
APP_ORIGIN=*
API_BASE_URL=https://api.example.com
JWT_SECRET=<生成した値>
SOURCE_HASH_SECRET=<生成した値>
```
> `docker-compose.yml` は同ディレクトリの `.env` を自動で読み、`${POSTGRES_PASSWORD}` / `${APP_ORIGIN}` を展開する。

**失敗時**: `.env` が読まれない → `docker compose config` で展開結果を確認（下記 STEP 3-0）。

---

## STEP 3. Docker Compose 起動

```bash
[VPSで実行]
cd ~/apps/worldawn/server

# 3-0. 展開結果の事前確認（値が正しく入るか）
docker compose config | grep -E "DATABASE_URL|POSTGRES_PASSWORD|APP_ORIGIN"

# 3-1. ビルド
docker compose build
# 期待: api イメージのビルド成功（node:22-slim + npm install + tsx）

# 3-2. 起動（api 起動時に migration が自動適用される）
docker compose up -d

# 3-3. 稼働確認
docker compose ps
# 期待: db が healthy、api が running(Up)

# 3-4. ログ確認
docker compose logs -f api
# 期待（末尾）: [migrate] applied 0001_init.sql / [worldawn-server] listening on :3000
#   Ctrl+C でログ表示を抜ける（コンテナは動いたまま）
docker compose logs -f db
# 期待: database system is ready to accept connections
```
サービス名は `api` / `db`（`docker-compose.yml` 準拠）。

**失敗時**:
- `docker compose build` 失敗 → ログの npm エラー箇所。`docker compose build --no-cache` で再試行。
- `db` が unhealthy → `docker compose logs db`。`POSTGRES_PASSWORD` 未設定/空をチェック。
- `api` が再起動ループ → `docker compose logs api`。多くは DATABASE_URL 不正 or DB 未起動（depends_on healthcheck 待ち）。

---

## STEP 4. マイグレーション / シード

migration は STEP 3 の `up` で自動適用済み。明示再実行と seed 投入:
```bash
[VPSで実行]
cd ~/apps/worldawn/server

# 4-1. マイグレーション（冪等。再実行しても安全）
docker compose exec api npm run db:migrate
# 期待: [migrate] skip 0001_init.sql (already applied) または applied、最後に [migrate] done

# 4-2. シード投入（ワールド/代表キャラ/デモユーザー/QA固定出現ユーザー）
docker compose exec api npm run db:seed
# 期待: [seed] worlds=4 characters=10 demoUser=demo_user qaUsers=qa_user,qa_user2
```
DB内確認（`psql`）:
```bash
[VPSで実行]
docker compose exec db psql -U worldawn_user -d worldawn -c "\dt"
# 期待: users, world_masters, character_masters, discovery_counters, scan_history,
#       discovery_records, character_records, user_dp, dp_transactions,
#       user_world_unlocks, user_boosts, schema_migrations

docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT COUNT(*) FROM world_masters;"       # 期待: 6（生物4 + QA2）
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT COUNT(*) FROM character_masters;"    # 期待: 12（通常/レア10 + QA2）
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT id,rarity,is_available_for_scan FROM character_masters WHERE rarity IN ('rare');"
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT * FROM discovery_counters LIMIT 5;" # 期待: 初回は0行
```
制約確認:
```bash
[VPSで実行]
docker compose exec db psql -U worldawn_user -d worldawn -c "\d discovery_records" | grep -i unique
# 期待: uq_character_discovery_no (character_id, character_discovery_no)
docker compose exec db psql -U worldawn_user -d worldawn -c "\d scan_history" | grep -i unique
# 期待: uq_scan_history_user_source_date (user_id, source_hash, local_date)
docker compose exec db psql -U worldawn_user -d worldawn -c "\d character_records" | grep -i unique
# 期待: uq_character_record_user_character (user_id, character_id)
```
**失敗時**: `db:migrate` 失敗 → `docker compose logs api` の SQL エラー行。`db:seed` 失敗 → DB 起動前に実行した可能性（`docker compose ps` で db healthy を待つ）。

---

## STEP 5. /api/health 確認

```bash
[VPSで実行]
curl -s http://127.0.0.1:3000/api/health
```
期待:
```json
{"status":"ok","ok":true}
```
**失敗時**: 応答なし → `docker compose ps`（api Up?）、`docker compose logs api`。
`{"status":"db_unavailable"}` → DB接続不可（DATABASE_URL / db コンテナ）。

---

## STEP 6. /api/scan 新規発見確認

```bash
[VPSで実行]
curl -s -X POST http://127.0.0.1:3000/api/scan \
  -H "Content-Type: application/json" \
  -H "x-user-id: demo_user" \
  -d '{"sourceHash":"test_hash_001","scanType":"barcode","localDate":"2026-07-07","clientTimezone":"Asia/Tokyo"}'
```
期待（一例）:
```json
{"status":"discovered","discoveryRecord":{"characterId":"ground_fox","characterDiscoveryNo":"1","difficultyRank":"B","dpGained":50,"...":"..."}}
```
確認項目: `status=discovered` / `characterDiscoveryNo` が **string** / DB に記録される。
```bash
[VPSで実行]
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT character_id, character_discovery_no FROM discovery_records WHERE user_id='demo_user' ORDER BY discovered_at DESC LIMIT 3;"
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT user_id, character_id, discovery_count FROM character_records WHERE user_id='demo_user';"
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT balance FROM user_dp WHERE user_id='demo_user';"  # 期待: > 0
```
**失敗時**: `500 {"error":"scan_failed"}` → `docker compose logs api` の `[scan] failed`。多くは seed 未投入（出現キャラ0）→ STEP 4 を実施。

---

## STEP 7. duplicate 確認（同日同コード）

```bash
[VPSで実行]
# STEP 6 と同じ sourceHash + localDate をもう一度
curl -s -X POST http://127.0.0.1:3000/api/scan \
  -H "Content-Type: application/json" -H "x-user-id: demo_user" \
  -d '{"sourceHash":"test_hash_001","scanType":"barcode","localDate":"2026-07-07"}'
```
期待:
```json
{"status":"duplicate","message":"今日はこのコードからはすでに発見済みです。"}
```
確認（増えていないこと）:
```bash
[VPSで実行]
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT COUNT(*) FROM discovery_records WHERE user_id='demo_user';"  # STEP6直後と同じ
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT balance FROM user_dp WHERE user_id='demo_user';"            # STEP6直後と同じ
```
**失敗時**: duplicate にならない → `scan_history` の一意制約と `local_date` の一致を確認（STEP 17）。

---

## STEP 8. キャラクター別採番確認（QA固定出現ユーザー）

一般ユーザーは出現キャラがランダムなので、**QA固定出現ユーザー**（seed で投入・1ワールド1キャラ）を使う。
`qa_user` は必ず `qa_shibamaru`、`qa_user2` は必ず `qa_kurageru` が出る。
```bash
[VPSで実行]
# qa_user で別コードを3回 → シバマル No.001, 002, 003
for i in 1 2 3; do
  curl -s -X POST http://127.0.0.1:3000/api/scan -H "Content-Type: application/json" -H "x-user-id: qa_user" \
    -d "{\"sourceHash\":\"qa_shiba_$i\",\"scanType\":\"barcode\",\"localDate\":\"2026-07-07\"}" \
    | grep -o '"characterDiscoveryNo":"[0-9]*"'
done
# 期待: "characterDiscoveryNo":"1" / "2" / "3"

# qa_user2 で1回 → クラゲル No.001（キャラごとに独立）
curl -s -X POST http://127.0.0.1:3000/api/scan -H "Content-Type: application/json" -H "x-user-id: qa_user2" \
  -d '{"sourceHash":"qa_kurage_1","scanType":"barcode","localDate":"2026-07-07"}' \
  | grep -o '"characterDiscoveryNo":"[0-9]*"'
# 期待: "characterDiscoveryNo":"1"
```
確認（全体通番でなくキャラ別であること）:
```bash
[VPSで実行]
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT counter_key, current_value FROM discovery_counters WHERE counter_key IN ('character:qa_shibamaru','character:qa_kurageru');"
# 期待: character:qa_shibamaru=3 / character:qa_kurageru=1
```

---

## STEP 9. No.777 確認

```bash
[VPSで実行]
# qa_shibamaru のカウンターを 776 に設定
docker compose exec db psql -U worldawn_user -d worldawn -c "UPDATE discovery_counters SET current_value=776 WHERE counter_key='character:qa_shibamaru';"

# 次の発見で 777
curl -s -X POST http://127.0.0.1:3000/api/scan -H "Content-Type: application/json" -H "x-user-id: qa_user" \
  -d '{"sourceHash":"qa_shiba_777","scanType":"barcode","localDate":"2026-07-07"}'
```
期待（抜粋）:
```json
{"status":"discovered","discoveryRecord":{"characterDiscoveryNo":"777",
  "primaryNumberBadge":{"number":"777","label":"ラッキーセブン","tags":["lucky7","repdigit"],"valueRank":"premium"},
  "difficultyRank":"A","...":"..."}}
```
確認: `characterDiscoveryNo="777"` / `primaryNumberBadge` あり / `tags` に `lucky7` / `valueRank=premium` / 難度が通常より上がる。

（最強の証を強制確認したい場合）api を一時的に `WORLDAWN_FORCE_STRONGEST_PROOF=1` 付きで起動し、スキャンすると
`grantedCharacterTitles` に `strongest_proof` が入り `character_records.titles` に保存される。確認後は外す。

---

## STEP 10. Nginx リバースプロキシ

```bash
[VPSで実行]
sudo apt install -y nginx
sudo cp ~/apps/worldawn/server/nginx.conf.example /etc/nginx/sites-available/worldawn-api
sudo sed -i 's/api.example.com/<あなたのドメイン>/g' /etc/nginx/sites-available/worldawn-api
sudo ln -sf /etc/nginx/sites-available/worldawn-api /etc/nginx/sites-enabled/
# デフォルトサイトが 80 を専有していれば無効化
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
# 期待: syntax is ok / test is successful
sudo systemctl reload nginx
```
確認（HTTP 経由）:
```bash
[ローカルPCで実行]
curl -s http://<あなたのドメイン>/api/health
# 期待: {"status":"ok","ok":true}
```
**失敗時 502 Bad Gateway** → api が 3000 で起動しているか（STEP 5）、`proxy_pass http://127.0.0.1:3000` 一致、`sudo tail -f /var/log/nginx/error.log`。

---

## STEP 11. HTTPS 化（certbot）

```bash
[VPSで実行]
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <あなたのドメイン>
# 対話: メール入力 → 規約同意 → （リダイレクト設定は「2: Redirect」推奨）
# 期待: Congratulations! / 443 サーバーが自動追記され 80→443 リダイレクト

# 自動更新の確認
sudo certbot renew --dry-run
systemctl status certbot.timer
```
確認（HTTPS 経由）:
```bash
[ローカルPCで実行]
curl -s https://<あなたのドメイン>/api/health
# 期待: {"status":"ok","ok":true}

curl -s -X POST https://<あなたのドメイン>/api/scan \
  -H "Content-Type: application/json" -H "x-user-id: demo_user" \
  -d '{"sourceHash":"ext_test_1","scanType":"barcode","localDate":"2026-07-07"}'
# 期待: {"status":"discovered",...,"characterDiscoveryNo":"...",...}
```
**失敗時**: certbot がドメイン検証に失敗 → DNS の A レコードが VPS IP を指しているか、80 番が開いているか（UFW / Nginx）。

---

## STEP 12. アプリ側 EXPO_PUBLIC_API_BASE_URL 設定

```bash
[アプリ側]（リポジトリ直下）
# 開発中に本番/ステージング API を叩いて確認する場合:
EXPO_PUBLIC_API_BASE_URL=https://<あなたのドメイン> npx expo start
```
EAS ビルドでは `eas.json` の各プロファイルに設定（詳細は [APP_RELEASE.md](APP_RELEASE.md)）:
```json
{ "build": { "production": { "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.example.com" } } } }
```
> 未設定だとローカルモード（発見番号は「暫定・非公式」表示）になる。本番ビルドは必ず設定する。

---

## STEP 13. 実機アプリから API 接続確認

```text
[アプリ側]（実機の Expo Go / 開発ビルド）
1. アプリ起動（EXPO_PUBLIC_API_BASE_URL=本番URL でビルド/起動）
2. 初回ワールド選択
3. 手元のバーコード/QRをスキャン
4. 期待: 発見結果画面に「発見証明」＋公式 characterDiscoveryNo（暫定表記なし）
5. キャラクター詳細 → 取得済み発見証明に追加されている
6. 発見ログ / 発見カレンダー / 今日の一番発見 に反映
```
サーバー側で受信を確認:
```bash
[VPSで実行]
docker compose logs -f api      # スキャンのたびに /api/scan の処理ログが出る
docker compose exec db psql -U worldawn_user -d worldawn -c "SELECT user_id, character_id, character_discovery_no, discovered_at FROM discovery_records ORDER BY discovered_at DESC LIMIT 5;"
```
**失敗時**: アプリでネットワークエラー → 実機がHTTPSドメインに到達できるか（`curl` を実機ブラウザで）、CORS（`APP_ORIGIN`）、証明書有効性。

---

## STEP 14. オフライン確認

```text
[アプリ側]（実機）
1. 端末を機内モードにする
2. 新規スキャンを試す
3. 期待: 発見が成立せず、「公式発見番号を発行するには通信が必要です。オンライン状態で再度スキャンしてください。」
4. 図鑑・過去の発見証明・キャラ詳細・発見ログ・カレンダーは閲覧できる
5. 機内モード解除 → 再スキャンで発見できる
```

---

## STEP 15. トラブルシュート

| 症状 | 確認コマンド / 見るログ | 主因・対処 |
| --- | --- | --- |
| `docker compose up` 失敗 | `docker compose logs`、`docker compose build --no-cache` | ビルドエラー/イメージ取得失敗。ディスク容量 `df -h` |
| DB接続できない | `docker compose ps`（db healthy?）、`docker compose logs db` | `POSTGRES_PASSWORD` 未設定、db 起動前に api がアクセス |
| migration 失敗 | `docker compose exec api npm run db:migrate`、`docker compose logs api` | SQL エラー。`schema_migrations` を確認 `... -c "SELECT * FROM schema_migrations;"` |
| seed 失敗 | `docker compose exec api npm run db:seed` | db 未 healthy。`docker compose ps` 後に再実行 |
| /api/health 返らない | `curl -v http://127.0.0.1:3000/api/health`、`docker compose logs api` | api 未起動/再起動ループ。DATABASE_URL 確認 |
| /api/scan が 500 | `docker compose logs api`（`[scan] failed`） | seed 未投入（出現キャラ0）→ STEP 4。DBスキーマ不一致→再 migrate |
| Nginx 502 | `sudo tail -f /var/log/nginx/error.log` | api が 3000 で不稼働、`proxy_pass` 不一致 |
| HTTPS化できない | `sudo certbot certificates`、80番/DNS | Aレコード未反映、80番閉塞（UFW/別プロセス）|
| アプリからAPI接続不可 | 実機ブラウザで `https://<domain>/api/health` | DNS/証明書/CORS(`APP_ORIGIN`)、実機の回線 |
| duplicate にならない | `... -c "\d scan_history"`（uq制約）、送信 `localDate` | 一意制約欠落 or `localDate` が毎回異なる |
| characterDiscoveryNo が重複 | `... -c "SELECT character_id,character_discovery_no,COUNT(*) FROM discovery_records GROUP BY 1,2 HAVING COUNT(*)>1;"` | `uq_character_discovery_no` 欠落（0行なら正常）|

---

## STEP 16. 運用（更新・ログ・バックアップ）

```bash
[VPSで実行]
# デプロイ更新（migration は起動時に自動適用）
cd ~/apps/worldawn/server && git pull && docker compose up -d --build

# ログ / 再起動
docker compose logs -f api
docker compose restart api

# バックアップ（日次 cron 推奨）
docker compose exec -T db pg_dump -U worldawn_user worldawn > ~/backups/worldawn_$(date +%F).sql
# 復元
cat ~/backups/worldawn_YYYY-MM-DD.sql | docker compose exec -T db psql -U worldawn_user worldawn
```
- DB/API は外部ポートを開けない（Nginx 経由のみ、`ports: 127.0.0.1:3000` バインド）。
- 生バーコード値・商品名・位置情報はサーバーにも保存しない（sourceHash と localDate のみ）。
- `x-user-id` は暫定識別。本番前に JWT 等の正式な認証へ置き換える（未確定・今後の課題）。
