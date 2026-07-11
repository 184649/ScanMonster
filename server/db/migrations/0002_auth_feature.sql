-- 認証・アカウント連携・データ引継ぎ・要望掲示板（フェーズ）。冪等。

-- アカウント（メール＋パスワード）。primary_user_id が全データのキー（users.id）。
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  primary_user_id TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_accounts_email ON accounts (email);
CREATE INDEX IF NOT EXISTS idx_accounts_primary_user ON accounts (primary_user_id);

-- 認証トークン（ログイン/登録で発行。将来の保護APIに使用）。
CREATE TABLE IF NOT EXISTS auth_tokens (
  token TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 引継ぎコード（アカウント無しでも端末変更で復元できる）。
CREATE TABLE IF NOT EXISTS transfer_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ
);

-- 要望・機能改善の投稿。
CREATE TABLE IF NOT EXISTS feature_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_feature_requests_created ON feature_requests (created_at);

-- 要望へのリアクション（1ユーザー1種別1回）。
CREATE TABLE IF NOT EXISTS feature_request_reactions (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_reaction_user ON feature_request_reactions (request_id, user_id, type);
CREATE INDEX IF NOT EXISTS idx_reaction_request ON feature_request_reactions (request_id);
