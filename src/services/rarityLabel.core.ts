/**
 * レアリティ表示ラベル（純粋・テスト可能・段3）。
 * normal / rare / legendary / secret を正式に扱う。legendary を normal へ丸めない。
 * secret は未発見時にUIへ出さない方針だが、発見済み表示では「特別」と表す（存在は隠さない＝発見済みなので可）。
 */
import type { CharacterRarity } from "../types/habitat";

/** キャラのレアリティ表示ラベル（発見済み表示用）。 */
export const characterRarityLabel: Record<CharacterRarity, string> = {
  normal: "通常",
  rare: "レア",
  legendary: "伝説",
  secret: "特別"
};

/** 発見証明・ログのバッジ表示（DiscoveryRarity 全種を安全に扱う）。secret/legendary も正式表示。 */
export const rarityBadgeLabel = (rarity: string): string => {
  switch (rarity) {
    case "rare":
      return "レア";
    case "legendary":
      return "伝説";
    case "prefecture":
      return "地域";
    case "secret":
      return "特別"; // secret とは書かない
    case "friend":
      return "フレンド";
    default:
      return "通常";
  }
};
