/**
 * 発見結果の見出し文言（純粋・テスト可能）。仕様 §3.3。
 *  - secret は「secret/シークレット」と言わず「未知の出現！」。
 *  - prefecture のみ「都道府県キャラ発見！○○県…」。
 *  - 位置情報・確率などの内部値は一切出さない。
 */
export type ResultRarity = "normal" | "rare" | "legendary" | "prefecture" | "secret" | "friend";

export type DiscoveryTitle = { title: string; subtitle: string };

export const discoveryTitle = (rarity: ResultRarity | string | undefined, prefectureName?: string): DiscoveryTitle => {
  switch (rarity) {
    case "rare":
      return { title: "珍しい発見！", subtitle: "めったに出会えない仲間です" };
    case "legendary":
      return { title: "伝説の発見！", subtitle: "名だたる存在と出会いました" };
    case "prefecture":
      return {
        title: "都道府県キャラ発見！",
        subtitle: prefectureName ? `${prefectureName}のキャラと出会いました` : "地域のキャラと出会いました"
      };
    case "secret":
      // secret とは言わない（存在を明示しない）。
      return { title: "未知の出現！", subtitle: "記録にない反応を確認しました" };
    default:
      return { title: "発見！", subtitle: "新しい仲間を発見しました" };
  }
};
