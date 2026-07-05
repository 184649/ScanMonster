/**
 * フレンドQRのペイロード（Phase 2・動的QR）。
 * QRは owner の user_id を直接載せず、サーバー発行の短期署名トークンを運ぶ（worldawn:fq:<token>）。
 * owner の解決・改ざん検知・期限判定はサーバーが行う。
 */
const PREFIX = "worldawn:fq:";

/** サーバー発行の短期QRトークンを QR ペイロードに包む。 */
export const buildFriendQrPayload = (qrToken: string): string => `${PREFIX}${qrToken}`;

/** フレンドQRペイロードから短期トークンを取り出す。フレンドQRでなければ null。 */
export const parseFriendQrPayload = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const text = raw.trim();
  if (!text.startsWith(PREFIX)) return null;
  const token = text.slice(PREFIX.length).trim();
  return token.length > 0 ? token : null;
};
