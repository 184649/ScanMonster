# セキュリティ（SECURITY）

公開前ハードニングの現況。Phase 1–3 実装済み。Phase 4 以降は未実施（末尾）。

## 認証（Phase 1・実装済み）
- 全ユーザー依存APIは `Authorization: Bearer <token>`（`x-user-id` は廃止）。詳細 [AUTHENTICATION.md](AUTHENTICATION.md)。
- トークンはDBに **SHA-256 ハッシュのみ**保存（生値は返すのみ・32byte乱数）。無効化＝行削除。
- 1端末=1匿名アカウント（`POST /api/auth/anon`）。ログインUI不要。

## 動的フレンドQR（Phase 2・実装済み）
- QRは userId 直載せをやめ、**HMAC署名付き短期トークン（約60秒）**を運ぶ。owner はサーバーが署名検証で解決。
- 改ざん/期限切れ/自己QR/同一相手同日重複を無効化。スクショ後日使い回し不可。詳細 [FRIEND_QR_AND_EFFECT.md](FRIEND_QR_AND_EFFECT.md)。
- 秘密鍵は環境変数 `FRIEND_QR_SECRET`（本番必須）。

## レート制限・farming対策（Phase 3・実装済み）
実装：[rateLimit.ts](../server/src/rateLimit.ts)（プロセス内メモリ・固定ウィンドウ）。しきい値は `RL_<NAME>_MAX` / `RL_<NAME>_WINDOW_MS` で上書き可。超過は **429 + Retry-After**。

| エンドポイント | キー | 既定しきい値 | 狙い |
|---|---|---|---|
| `POST /auth/anon` | IP | 120 / 10分 | 大量アカウント作成（NAT配下の対面イベントは許容） |
| `POST /scan` | user | 60 / 分 | 番号farming・連打 |
| `POST /friend-qr/token` | user | 30 / 分 | owner 側トークン乱発 |
| `POST /friend-qr/scan` | user | 60 / 分 | reader 側連打 |
| `POST /transfer/create` | user | 5 / 時 | 引継ぎコード乱発 |
| `POST /transfer/redeem` | IP | 10 / 時 | コード総当たり |
| `POST /masters/characters` | IP | 30 / 分 | 管理API監視 |

**設計上の要点**：
- **user 単位が主防御**。owner が100人に読まれても、各 reader は別バケットなので誤ブロックしない。
- **IP 単位は緩め**（校内WiFi等のNAT配下の対面イベントで多数端末が同一IPになるため）。主に大量アカウント作成・総当たり対策。
- ログは `[rate-limit] blocked name/ip/user/at` のみ（本文・個人情報を残さない・長期保存しない前提）。

**制約（要対応）**：メモリ実装のため**単一プロセス前提**。水平スケール時は共有ストア（Redis 等）が必要（未実装）。`/masters/characters` は現状未認証（管理者トークン化は今後）。

## 収集データ / 非収集（プライバシー方針）
- 収集：`users.id`、発見記録、`scan_history.source_hash`（ハッシュのみ）、DP、ワールド解放、フレンド交流履歴、（連携時のみ）メール＋パスワードハッシュ、トークンハッシュ、都道府県コード/名（scan時・任意）。
- **非収集**：生バーコード/QR内容、商品名、OCR、正確な住所・詳細位置・移動履歴。
- 詳細な正式文書（利用規約・プライバシーポリシー）は Phase 7–8 で作成予定（未着手）。

## 未実施（公開前の残ブロッカー）
- 実PostgreSQL統合テストの実行（Docker不在＝コードのみ）／自動バックアップ＋復元テスト／利用規約・プライバシーポリシー実文／完全引継ぎ統合テスト。
