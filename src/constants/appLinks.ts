/**
 * アプリから参照する外部URL。
 *
 * TODO: ストア申請前に、privacyPolicyUrl と contactUrl を本番URLへ差し替えること。
 * 現在は仮のプレースホルダURLです（本番確定ではありません）。
 */
export const APP_LINKS = {
  privacyPolicyUrl: "https://example.com/worldawn/privacy",
  contactUrl: "https://example.com/worldawn/contact"
} as const;

/** 本番URLに差し替え済みかどうかの簡易判定（example.com を含む間は仮）。 */
export const isPlaceholderUrl = (url: string): boolean => url.includes("example.com");
