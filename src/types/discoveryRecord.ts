/**
 * 発見記録ドメイン（フェーズ1）。仕様 §15〜§27, §32 準拠。
 *
 * 設計方針:
 *  - 同じキャラを複数個体では持たない。図鑑上1種＝1つの CharacterRecord。
 *  - 再発見でも DiscoveryRecord（＝発見証明）を毎回発行し、履歴として残す。
 *  - 発見番号(characterDiscoveryNo)は BIGINT 相当を string で保持し Number 変換しない。
 *  - 端末内アプリのため userId は持たない（単一ユーザー）。将来サーバー化時に付与。
 */

/** レアリティ種別。normal>rare>legendary>secret の順に希少。legendary は条件解放後のみ・secret はUIで明示しない。 */
export type DiscoveryRarity = "normal" | "rare" | "legendary" | "prefecture" | "secret" | "friend";

/** 発見難度。C(よくある) 〜 SSS(極めて稀)。 */
export type DifficultyRank = "C" | "B" | "A" | "S" | "SS" | "SSS";

/** 番号価値ランク。 */
export type NumberValueRank = "normal" | "memorial" | "rare" | "premium" | "legend";

/** 番号の特徴タグ。 */
export type NumberTag =
  | "early"
  | "round"
  | "repdigit"
  | "sequential"
  | "reverse_sequential"
  | "palindrome"
  | "lucky7"
  | "year";

/** キャラクター記録に刻まれる称号。strongest_proof が最高位（＝最強の証）。 */
export type CharacterTitle =
  | "strongest_proof"
  | "early_discoverer"
  | "lucky_number"
  | "repdigit_number"
  | "round_number"
  | "reunion_10"
  | "reunion_50"
  | "reunion_100";

/** 発見番号のスコープ。初回は character のみ運用。他は将来拡張枠。 */
export type NumberScope = "character" | "world" | "event" | "friend_link";

export type DiscoveryNumberBadge = {
  numberScope: NumberScope;
  /** BIGINT 相当。必ず string。フロントで Number 変換しない。 */
  number: string;
  label: string;
  tags: NumberTag[];
  valueRank: NumberValueRank;
};

/**
 * 1回の有効スキャンで発行される発見証明。生コード値・商品名・正確な時刻・位置は含めない。
 * certificateId は id と同一（端末内では発見証明＝発見記録）。
 */
export type DiscoveryRecord = {
  id: string;
  certificateId: string;

  characterId: string;
  /** 表示用の複製（ログ/カレンダーで join せず出せるように保持）。 */
  characterName: string;
  imageKey: string;
  worldGroup?: string;
  rarity: DiscoveryRarity;

  discoveredAt: string;
  localDate: string;

  isNewForUser: boolean;
  isRediscovery: boolean;

  difficultyRank: DifficultyRank;

  /** キャラ別公式発見番号（BIGINT 相当・string）。 */
  characterDiscoveryNo: string;
  worldDiscoveryNo?: string;

  numberBadges: DiscoveryNumberBadge[];
  primaryNumberBadge?: DiscoveryNumberBadge;

  grantedCharacterTitles: CharacterTitle[];
  /** 最強の証が付いたか（表示/難度で使用）。 */
  strongestProof: boolean;

  discoveryRankLabel: string;

  dpGained: number;

  /**
   * 発見番号の出所。"server"＝公式（サーバー採番）、"local"＝暫定（非公式・端末内キャッシュ用）。
   * ローカル採番は公式番号として扱わない（§1.2/§7）。
   */
  numberSource: "server" | "local";

  /** prefecture 発見時の都道府県名（地域発見表示用）。 */
  prefectureName?: string;

  /** この発見でそのワールドの伝説が解放された場合のワールド（解放演出のトリガ）。§5。 */
  legendaryUnlockedNow?: string;
};

export type CharacterRecord = {
  characterId: string;

  firstDiscoveredAt: string;
  lastDiscoveredAt: string;

  discoveryCount: number;

  bestDifficultyRank: DifficultyRank;

  titles: CharacterTitle[];
  activeTitle?: CharacterTitle;

  representativeDiscoveryId?: string;
  /** 代表選出のための比較スコア（内部用）。 */
  representativeScore: number;

  firstDiscoveryId: string;
  latestDiscoveryId: string;

  /** これまでに得た「価値ある番号」のバッジ（重複番号は1つ）。 */
  numberBadges: DiscoveryNumberBadge[];
};
