/**
 * アカウント連携の状態（端末に保存）。
 * userId はサーバー採番の正規 user_id（＝全データのキー）。ログイン/引継ぎで切替わる。
 */
export type AccountState = {
  /** サーバー上の正規 user_id（x-user-id として使う）。 */
  userId: string;
  /** 認証トークン（将来の保護APIに使用）。 */
  token?: string;
  email?: string;
  displayName?: string;
  /** アカウント連携済みか（メール＋パスワード）。引継ぎコードのみは false。 */
  linked: boolean;
  updatedAt: string;
};
