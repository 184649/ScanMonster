# 認証（AUTHENTICATION）

Phase 1（公開前ハードニング）。ユーザー識別を **Bearer トークン**に統一し、`x-user-id` を廃止。

## モデル：1端末 = 1匿名アカウント（ログインUI不要）

```
初回起動
  → POST /api/auth/anon        （サーバーが users 行 + トークン発行）
  → { token, userId } を受領
  → token/userId を SecureStore に保存（src/services/authToken.ts）
以後の全ユーザー依存API
  → Authorization: Bearer <token>
  → サーバーが token から userId を確定（クライアントの userId は認証根拠にしない）
```

## サーバー実装（[authService.ts](../server/src/authService.ts) / [routes.ts](../server/src/routes.ts)）

- **トークン保存はハッシュのみ**：生トークンは 32byte(256bit) ランダム。DBには `SHA-256(token)` を `auth_tokens.token`（PK）に保存。DB 漏洩でも生トークンは復元不可。無効化＝行削除。
- `createAnonymousAccount()`：匿名 `usr_<uuid>` を作成しトークン発行（`account_id = anon:<userId>`）。
- `issueToken(userId, accountId)`：生トークンを返し、ハッシュを保存。register / login / transfer redeem でも使用。
- `requireAuth` ミドルウェア：`Authorization: Bearer <token>` を検証し `req.userId` を確定。無い/不正なら **401**。
- **認証必須**：scan / dex / characters / discoveries / discovery-calendar / worlds unlock・boost / auth register / transfer create / feature-requests（GET/POST/react）/ friend-qr scan / friend-effect。
- **認証不要（アイデンティティ確立系）**：health / auth anon / auth login（メール＋パスワード）/ transfer redeem（コード）。

## アプリ実装

- [authToken.ts](../src/services/authToken.ts)：SecureStore 保存、`ensureAnonToken()`、Bearer 供給（`getActiveToken()`＝連携時は account トークン優先）。
- [apiClient.ts](../src/services/apiClient.ts)：全リクエストに `Authorization: Bearer`。`x-user-id` は送らない。
- 連携/ログイン/引継ぎ時は `setOverrideToken(res.token)`、ログアウトで匿名トークンへ復帰（[authStore.ts](../src/stores/authStore.ts)）。
- 引継ぎ（transfer redeem）は**新端末用トークンも受領**して保存（旧端末のトークンは共有しない）。

## テスト（[authBearer.int.test.ts](../server/tests/authBearer.int.test.ts)）
匿名作成／正しい Bearer 成功／token 無し・不正で 401／**x-user-id だけでは 401**／偽装ヘッダでもなりすませない（発見は token 本人に紐づく）／dex は本人データ／friend-effect も Bearer 必須。

## 残課題（Phase 2 以降）
- トークン失効日時（`expires_at`）・ローテーション。現状は「行削除で無効化」のみ。
- 管理API（`/api/masters/characters`）は現状未認証。管理者トークン化はレート制限フェーズで対応予定。
