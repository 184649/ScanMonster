# WORLDAWN アプリリリース手順（サーバー連携型）

WORLDAWN はサーバー連携型。公式発見処理はサーバーが確定し、アプリは結果を表示・キャッシュする。

## 0. サーバー準備（前提）
本番 API が起動・疎通していること。VPS 構築は [DEPLOY_CONOHA_VPS.md](DEPLOY_CONOHA_VPS.md)（実行順ランブック）。
リリース前に最低限:
```bash
curl -s https://<API_DOMAIN>/api/health      # {"status":"ok","ok":true}
curl -s -X POST https://<API_DOMAIN>/api/scan -H 'Content-Type: application/json' \
  -H 'x-user-id: demo_user' -d '{"sourceHash":"rel_check","scanType":"barcode","localDate":"2026-07-07"}'
# → {"status":"discovered",...,"characterDiscoveryNo":"...",...}（string）
```

## 1. リリース構成 / API 環境変数
アプリは `EXPO_PUBLIC_API_BASE_URL` で接続先を切り替える（Expo のビルド時公開変数）。

| プロファイル | EXPO_PUBLIC_API_BASE_URL |
| --- | --- |
| development | http://localhost:3000（実機はLAN IP） |
| preview | https://staging-api.example.com |
| production | https://api.example.com |

未設定の場合はローカルモード（発見番号は「暫定・非公式」）。**本番ビルドでは必ず production URL を設定する。**

`eas.json` の例（プロジェクトに合わせて調整）:
```json
{
  "build": {
    "development": { "developmentClient": true, "env": { "EXPO_PUBLIC_API_BASE_URL": "http://localhost:3000" } },
    "preview":     { "distribution": "internal", "env": { "EXPO_PUBLIC_API_BASE_URL": "https://staging-api.example.com" } },
    "production":  { "env": { "EXPO_PUBLIC_API_BASE_URL": "https://api.example.com" } }
  }
}
```

## 2. EAS ビルド手順
```bash
npm install -g eas-cli && eas login
# 開発ビルド（実機デバッグ）
eas build --profile development --platform ios
eas build --profile development --platform android
# 内部配布（QA）
eas build --profile preview --platform all
# 本番
eas build --profile production --platform ios
eas build --profile production --platform android
```

## 3. リリース前チェック（§12.1）
- [ ] 本番 `EXPO_PUBLIC_API_BASE_URL` が production を指す
- [ ] 本番 DB マイグレーション済み・本番シード（全キャラマスタ）投入済み
- [ ] HTTPS 有効（`curl https://api.example.com/api/health` = ok）
- [ ] CORS / `APP_ORIGIN` 設定確認
- [ ] ユーザー識別（x-user-id / 将来 JWT）確認
- [ ] sourceHash が生コード値を保存していない（送信もハッシュのみ）
- [ ] characterDiscoveryNo が**サーバー採番**であること（アプリは採番しない）
- [ ] secret/friend が `is_available_for_scan=false`（出現対象外）
- [ ] characterDiscoveryNo を `Number()` 変換していない（string のまま表示）
- [ ] 認証: register/login/引継ぎコードが動く（`/api/auth/*`, `/api/transfer/*`）。パスワードはハッシュ保存
- [ ] 要望掲示板: 投稿・一覧・リアクションが動く（`/api/feature-requests`）

## 4. ストア提出前 動作確認（§12.3）
- [ ] 初回起動 / 初回ワールド選択
- [ ] スキャン → 新規発見 / 再発見
- [ ] 同日同コード無効（duplicate 表示）
- [ ] 発見証明表示（公式番号・難度・番号価値・最強の証・DP）
- [ ] キャラクター詳細：取得済み発見証明を**すべて**表示・代表表示
- [ ] 発見ログ / 発見カレンダー / 番号コレクション / 今日の一番発見
- [ ] 共有カード（生値・時刻・位置を含まない）
- [ ] オフライン：閲覧できる／新規スキャンはブロックされる

## 5. 本番リリース後 確認（§12.4）
- [ ] 本番 API ログにエラーが出ていない
- [ ] DB に discovery_records / character_records が保存される
- [ ] characterDiscoveryNo がキャラごとに連番（重複なし＝`uq_character_discovery_no`）
- [ ] エラー率 / アプリクラッシュ率
- [ ] 発見番号の重複が無いこと

## 6. ロールバック方針
- API: `git checkout <前タグ> && docker compose up -d --build`。マイグレーションは前方互換を基本とし、破壊的変更は避ける。
- DB: 破壊的マイグレーションを避け、必要時は日次ダンプから復元（DEPLOY_CONOHA_VPS.md §11）。
- アプリ: 直前の EAS ビルド／ストアの旧バージョンへ差し戻し（OTA を使う場合は前チャネルへ）。
