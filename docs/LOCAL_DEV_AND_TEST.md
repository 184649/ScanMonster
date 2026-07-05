# WORLDAWN ローカル開発・動作確認手順

WORLDAWN は **サーバー連携型**。公式発見番号(characterDiscoveryNo)は必ずサーバーが採番する（§1）。
ローカルは閲覧キャッシュ用途。オフラインでは新規スキャン不可（§3）。

構成: Expo アプリ（リポジトリ直下） / API サーバー（`server/`, Node+TypeScript+Express） / PostgreSQL。

## 1. 前提
- Node.js 20+（推奨 22）、Docker（PostgreSQL 用に推奨）
- iOS/Android 実機 または シミュレータ（Expo Go 可）

## 2. PostgreSQL を起動
Docker を使う場合（最短）:
```bash
docker run --name worldawn-pg -e POSTGRES_USER=worldawn_user -e POSTGRES_PASSWORD=change_me \
  -e POSTGRES_DB=worldawn -p 5432:5432 -d postgres:16
```
または `server/docker-compose.yml` の db サービスのみ起動:
```bash
cd server && docker compose up -d db
```

## 3. API サーバー（server/）
```bash
cd server
cp .env.example .env         # DATABASE_URL を上のDBに合わせる
npm install
npm run db:migrate           # スキーマ適用（冪等）
npm run db:seed              # ワールド・代表キャラ・デモユーザー投入
npm run server:dev           # http://localhost:3000 で起動（tsx watch）
```
疎通確認:
```bash
curl http://localhost:3000/api/health           # {"status":"ok"}
curl -X POST http://localhost:3000/api/scan \
  -H 'Content-Type: application/json' -H 'x-user-id: demo_user' \
  -d '{"sourceHash":"local_test_1","scanType":"barcode","localDate":"2026-07-07"}'
```

## 4. Expo アプリ（リポジトリ直下）
サーバーモードにするには `EXPO_PUBLIC_API_BASE_URL` を設定する:
```bash
# 実機は PC の LAN IP を使う（localhost は実機から見えない）
EXPO_PUBLIC_API_BASE_URL=http://192.168.x.x:3000 npx expo start
```
未設定で起動するとローカルモード（発見番号は「暫定・非公式」表示）になる。

## 5. テスト実行
```bash
# アプリ（純粋ロジック：番号価値/難度/最強の証/DP/発見パイプライン）→ 67 pass
npm test

# サーバー（ドメイン7 ＋ 結合7 ＋ HTTP3 = 17 pass）
cd server && npm test
```
サーバーの結合/HTTP テストは **DATABASE_URL 未設定なら pg-mem（インメモリ PostgreSQL 互換）** で実行され、
Docker/実DBが無くても migrate 相当・/api/scan・採番・No.777・最強の証・/api/health を実際に検証する。
**実 PostgreSQL で検証する場合**は先に migrate/seed し、DATABASE_URL を渡す:
```bash
cd server && DATABASE_URL=postgresql://worldawn_user:change_me@localhost:5432/worldawn npm test
```

### 実行済みの結合検証（pg-mem・実SQL）
- 新規発見 → `status=discovered`、`characterDiscoveryNo="1"`(string)、discovery_records/character_records/user_dp/scan_history 保存
- 同日同コード → `duplicate`（番号もDPも増えない）
- 同キャラ別コード → No.002 / No.003（キャラ別連番）
- 翌日再スキャン → No.004
- 別キャラ → No.001 から独立
- カウンター776→次発見 No.777（primaryNumberBadge=premium、tags に lucky7）
- `WORLDAWN_FORCE_STRONGEST_PROOF=1` → strongest_proof が付与・character_records.titles に保存
- HTTP: `GET /api/health` → `{status:"ok",ok:true}` / `POST /api/scan`（x-user-id）→ discovered

## 6. 動作確認シナリオ

### 新規発見（§10.3）
1. アプリ起動 → 初回ワールド選択 → コードをスキャン
2. アプリは sourceHash を `POST /api/scan` へ送信
3. 発見結果が返り、**公式 characterDiscoveryNo** と発見証明が表示される
4. キャラクター詳細に発見証明が追加される

### 同日同コード
1. 同じコードを同じ日に再スキャン → `duplicate` が返る
2. 発見番号は増えない / DPは増えない / ブーストは消費されない

### キャラごとの採番（QA固定出現ユーザー）
seed は「1ワールド=1キャラ」の **QA固定出現ユーザー** を投入する（`qa_user`→必ず `qa_shibamaru`、
`qa_user2`→必ず `qa_kurageru`）。出現がランダムにならないので採番を確定的に確認できる。
```bash
# 同キャラ別コードで No.001, 002, 003
for i in 1 2 3; do curl -s -X POST http://localhost:3000/api/scan \
  -H 'Content-Type: application/json' -H 'x-user-id: qa_user' \
  -d "{\"sourceHash\":\"s_$i\",\"scanType\":\"barcode\",\"localDate\":\"2026-07-07\"}" \
  | grep -o '"characterDiscoveryNo":"[0-9]*"'; done
# 別キャラは独立して No.001
curl -s -X POST http://localhost:3000/api/scan -H 'Content-Type: application/json' -H 'x-user-id: qa_user2' \
  -d '{"sourceHash":"k_1","scanType":"barcode","localDate":"2026-07-07"}' | grep -o '"characterDiscoveryNo":"[0-9]*"'
```

### 番号価値テスト（No.777）
```bash
# QAシバマルのカウンターを 776 にしてから次の発見で 777 を出す
psql "$DATABASE_URL" -c "UPDATE discovery_counters SET current_value=776 WHERE counter_key='character:qa_shibamaru';"
curl -s -X POST http://localhost:3000/api/scan -H 'Content-Type: application/json' -H 'x-user-id: qa_user' \
  -d '{"sourceHash":"s_777","scanType":"barcode","localDate":"2026-07-07"}'
```
→ `characterDiscoveryNo="777"`・`primaryNumberBadge.valueRank="premium"`・tags に `lucky7`・難度上昇。

### 最強の証テスト
サーバーを `WORLDAWN_FORCE_STRONGEST_PROOF=1` 付きで起動すると、次の発見で必ず strongest_proof が付く。
```bash
WORLDAWN_FORCE_STRONGEST_PROOF=1 npm run server:dev   # 確認後は外す
```
character_records.titles に `strongest_proof` が保存され、発見証明・キャラ詳細に「最強の証」が表示される。

### オフライン
機内モード等で通信を切ってスキャン → 「公式発見番号を発行するには通信が必要です。オンライン状態で再度スキャンしてください。」が表示され、発見が成立しない。図鑑・過去の発見証明・カレンダー・ログは閲覧できる。

### アカウント連携・引継ぎ・要望掲示板（curl）
```bash
# 連携（ゲスト demo_user にアカウント作成）
curl -s -X POST http://localhost:3000/api/auth/register -H 'Content-Type: application/json' \
  -H 'x-user-id: demo_user' -d '{"email":"a@example.com","password":"secret123"}'
# ログイン（別端末想定）→ 同じ userId が返る
curl -s -X POST http://localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"a@example.com","password":"secret123"}'
# 引継ぎコード発行→使用
curl -s -X POST http://localhost:3000/api/transfer/create -H 'x-user-id: demo_user'
curl -s -X POST http://localhost:3000/api/transfer/redeem -H 'Content-Type: application/json' -d '{"code":"XXXXXXXX"}'
# 要望投稿→一覧→リアクション
curl -s -X POST http://localhost:3000/api/feature-requests -H 'Content-Type: application/json' \
  -H 'x-user-id: demo_user' -d '{"title":"ダークモードが欲しい","body":"夜に使いやすく"}'
curl -s "http://localhost:3000/api/feature-requests?sort=top" -H 'x-user-id: other_user'
curl -s -X POST http://localhost:3000/api/feature-requests/<ID>/react -H 'x-user-id: other_user'
```
アプリ側は 設定＞アカウント・コミュニティ から「アカウント・データ引継ぎ」「要望掲示板」。
