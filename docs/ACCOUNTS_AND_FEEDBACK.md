# WORLDAWN アカウント連携・データ引継ぎ・要望掲示板

発見記録・公式発見番号・図鑑・DP は消えると致命的。安全に作成/復元でき、ゲスト開始でも後から
連携でき、端末変更で引き継げるようにする。加えて、ユーザー参加型の要望掲示板を用意する。

## 方針（初回体験を重くしない）
- 初回起動：**ゲストではじめる**（既定）／ ログイン・連携してはじめる（任意）。
- プレイ中：設定＞アカウントで連携を促す。
- 端末変更：ログイン、または引継ぎコードで復元。

## 識別モデル
全データは `users.id`（= x-user-id）をキーに保存。ゲストは端末の `userSalt`。
`accounts.primary_user_id` がそのアカウントの正規 user_id。

- **連携(register)**：現在のゲスト user_id にアカウント（メール＋パスワード）を紐づける。
  データ移動は不要（その user_id がアカウントの正規IDになる）。
- **ログイン(login)**：別端末で `primary_user_id` を取り戻す（＝引継ぎ）。アプリは以後この userId を x-user-id に使う。
- **引継ぎコード**：アカウント無しでも user_id を別端末へ引き継ぐ（単回使用）。
- クライアントの送信 user_id は `getActiveServerUserId()`（アカウント有→その userId、無→端末 userSalt）。

## DB（migration `0002_auth_feature.sql`）
| テーブル | 用途 |
| --- | --- |
| accounts | id / email(unique) / password_hash(scrypt) / primary_user_id / display_name |
| auth_tokens | token / account_id / user_id（発行トークン） |
| transfer_codes | code(PK) / user_id / expires_at / used_at（単回） |
| feature_requests | id / user_id / title / body / status / created_at |
| feature_request_reactions | request_id + user_id + type を unique（1人1回） |

## API
| メソッド | パス | 用途 |
| --- | --- | --- |
| POST | /api/auth/register | ゲスト(x-user-id)にアカウント連携。`{token,userId,email}` |
| POST | /api/auth/login | ログイン→`{token,userId,email}`（userId=引継ぎ先） |
| POST | /api/transfer/create | 引継ぎコード発行（x-user-id）。`{code,expiresAt}` |
| POST | /api/transfer/redeem | コードで user_id を取り戻す。`{userId}` |
| GET | /api/feature-requests?sort=top\|new | 掲示板一覧（reactionCount / reactedByMe / mine 付き） |
| POST | /api/feature-requests | 投稿 `{title,body}` |
| POST | /api/feature-requests/:id/react | リアクション（トグル）。`{reacted,count}` |

パスワードは scrypt でハッシュ（`salt:hash`、timing-safe 比較）。メール重複=409、認証失敗=401。

## アプリ構成
- `src/config/apiConfig.ts`（isServerMode）／`src/services/apiClient.ts`（各API）／`src/services/activeUser.ts`（active userId）。
- `src/stores/authStore.ts`：account 状態＋ register/login/logout/createTransferCode/redeemTransfer/syncFromServer。
- 画面：`LoginScreen`（ゲスト＋ログイン）、`AccountScreen`（連携/ログイン/引継ぎコード発行・入力/ログアウト）、`FeatureBoardScreen`（投稿・人気/新着・リアクション）。設定＞「アカウント・コミュニティ」から遷移。
- スキャン等の API 呼び出しは `getActiveServerUserId(userSalt)` を x-user-id に使用。

## データ引継ぎの同期（現状）
ログイン/引継ぎ後に `syncFromServer()` が `GET /api/discoveries` を取得し、発見証明・キャラ記録の
ローカルキャッシュを置き換える（`applyServerDiscoveries`）。名前・画像はローカルカタログで補完。

**未同期（今後）**：所持モンスター（図鑑の所持表示）・DP残高・ワールド解放/ブースト・称号は
サーバー権威だが端末キャッシュへの完全同期は未実装（別端末では初回ワールド選択が再度出る場合がある）。
発見ログ・カレンダー・番号コレクション・キャラ詳細の記録は引き継がれる。

## テスト
サーバー結合 `server/tests/authFeature.int.test.ts`（pg-mem 実SQL）：
register→login で同 userId／メール重複409・誤パス401／引継ぎ create→redeem→再利用不可／
要望 投稿→一覧・リアクション トグルでカウント増減／短いタイトルは拒否。`cd server && npm test` に含まれる。

## セキュリティ・プライバシー
- パスワードはハッシュのみ保存。生バーコード/商品名/位置は従来どおり保存しない。
- `x-user-id` は現状の識別。将来 `auth_tokens` を使ったトークン認証へ強化予定（未確定）。
