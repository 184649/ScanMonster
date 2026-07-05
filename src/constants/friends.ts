/**
 * 友達招待・フレンド機能の定数。
 *
 * 重要（仕様）: 友達招待の報酬は DP のみ。
 * 限定キャラクター・フレンドQR・特別QR・限定図鑑登録などは一切付与しない。
 */

/** 招待成立で双方に付与する DP。 */
export const FRIEND_INVITE_DP = 100;

/** 招待DPの重複付与を防ぐための1コードあたり付与回数（常に1回）。 */
export const FRIEND_INVITE_DP_PER_CODE = 1;
