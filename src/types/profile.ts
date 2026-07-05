/** 追加済みフレンド1件。相手の生データは持たず、フレンドコードのみ保持する。 */
export type FriendLink = {
  /** 相手のフレンドコード（正規8文字）。 */
  friendCode: string;
  /** 相手の表示名（任意。QR/招待に含まれていれば保存）。 */
  displayName?: string;
  /** 追加した経路。 */
  source: "qr" | "code";
  addedAt: string;
};

export type UserProfile = {
  /** 個体差生成に使う端末固有のソルト。生成後は変更しない。 */
  userSalt: string;
  createdAt: string;
  /** 自分の固定フレンドコード（招待・フレンドQRで共有する8文字）。 */
  friendCode: string;
  /** マイページ表示名（ログイン画面で設定）。未設定なら既定名を使う。 */
  displayName?: string;
  /** ログイン（開始）済みか。ログイン画面の表示制御に使う。 */
  onboarded: boolean;
  /** 招待された側として一度だけ入力した招待コード（再取得防止）。 */
  invitedByCode?: string;
  /** 追加済みフレンド。 */
  friends: FriendLink[];
  /** 招待DP（+100）を既に付与したフレンドコード一覧（重複付与防止）。 */
  rewardedFriendCodes: string[];
};
