/**
 * フレンドコード / 招待コード / フレンドQR のための純粋ユーティリティ。
 *
 * 方針（ローカルMVP）:
 * - フレンドコードは端末プロフィールから一度だけ生成する固定の8文字コード。
 * - QR・招待リンクの中身は ASCII のみ（QRのバイト量を抑える）。
 * - 生成・検証・整形・ペイロード変換はすべてこのファイルに集約する。
 */

/** 紛らわしい文字（0/O/1/I など）を除いた32文字。 */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;

/** QRペイロード・招待リンクのスキーム。 */
export const FRIEND_PAYLOAD_PREFIX = "worldawn:friend:";

/**
 * SHA-256（16進文字列）から決定的に8文字のフレンドコードを作る。
 * 同じ userSalt からは常に同じコードになる。
 */
export const deriveFriendCodeFromHash = (hexHash: string): string => {
  const clean = (hexHash || "").replace(/[^0-9a-fA-F]/g, "");
  let code = "";

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    const pair = clean.slice(i * 2, i * 2 + 2) || "00";
    const byte = parseInt(pair, 16) || 0;
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }

  return code;
};

/** 表示用に "XXXX-XXXX" 形式へ整形する。 */
export const formatFriendCode = (code: string): string => {
  const normalized = normalizeFriendCode(code);
  if (!normalized) {
    return "--------";
  }
  return `${normalized.slice(0, 4)}-${normalized.slice(4)}`;
};

/**
 * 入力（手入力・QR・リンク）を8文字の正規コードへ整える。
 * ハイフン・空白・小文字・スキームを吸収する。無効なら null。
 */
export const normalizeFriendCode = (input: string | null | undefined): string | null => {
  if (!input) {
    return null;
  }

  let value = input.trim();

  // スキーム / リンク形式を剥がす。
  if (value.toLowerCase().startsWith(FRIEND_PAYLOAD_PREFIX)) {
    value = value.slice(FRIEND_PAYLOAD_PREFIX.length);
  } else if (value.toLowerCase().includes("friend")) {
    // worldawn://friend?code=XXXX / worldawn://friend/XXXX などの緩い形式に対応。
    const match = value.match(/([0-9A-Za-z]{4}[-\s]?[0-9A-Za-z]{4})\s*$/);
    if (match) {
      value = match[1] ?? "";
    }
  }

  const upper = value.replace(/[-\s]/g, "").toUpperCase();

  if (upper.length !== CODE_LENGTH) {
    return null;
  }

  for (const char of upper) {
    if (!CODE_ALPHABET.includes(char)) {
      return null;
    }
  }

  return upper;
};

/** 正規コードとして妥当かどうか。 */
export const isValidFriendCode = (input: string | null | undefined): boolean => normalizeFriendCode(input) !== null;

/** フレンドQR / 招待リンクに載せる文字列を作る。 */
export const buildFriendPayload = (code: string): string => {
  const normalized = normalizeFriendCode(code);
  return `${FRIEND_PAYLOAD_PREFIX}${normalized ?? ""}`;
};

/**
 * スキャン結果や共有テキストからフレンドコードを取り出す。
 * フレンドQR以外（商品バーコード等）の場合は null を返す。
 */
export const parseFriendPayload = (data: string | null | undefined): string | null => {
  if (!data) {
    return null;
  }

  const value = data.trim();

  // 明示的なフレンドペイロード、または "friend" を含むリンクのみ受理する。
  if (value.toLowerCase().startsWith(FRIEND_PAYLOAD_PREFIX) || value.toLowerCase().includes("friend")) {
    return normalizeFriendCode(value);
  }

  return null;
};

/** SNS・メッセージ共有用の招待テキスト。 */
export const buildInviteMessage = (code: string, appName: string): string => {
  const formatted = formatFriendCode(code);
  return [
    `${appName}で一緒に遊ぼう！`,
    "",
    `わたしの招待コード: ${formatted}`,
    "",
    "アプリを始めて［マイページ →フレンド →招待コードを入力］にこのコードを入れると、",
    "おたがいに +100 DP がもらえます。",
    "",
    `フレンドQR/コード: ${buildFriendPayload(code)}`
  ].join("\n");
};
