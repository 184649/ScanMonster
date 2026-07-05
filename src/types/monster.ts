import type { CharacterRarity, HabitatGroup } from "./habitat";

export type ElementType =
  | "normal"
  | "nature"
  | "aqua"
  | "flame"
  | "bolt"
  | "ice"
  | "earth"
  | "wind"
  | "light"
  | "shadow"
  | "digital"
  | "special";

export type TimeSlot = "morning" | "day" | "evening" | "night";
export type Season = "spring" | "summer" | "autumn" | "winter";

export type IndividualVariantCategory = "time" | "season" | "rarity";
export type IndividualVariantKey =
  | "asatsuyu"
  | "youkou"
  | "tasogare"
  | "tsukikage"
  | "harukaze"
  | "natsuhikari"
  | "momiji"
  | "yukitomoshi"
  | "common"
  | "uncommon"
  | "rare"
  | "legend";

// 将来拡張用。初回リリースでは "barcode" のみを使用する。
export type SourceType = "barcode" | "qr";

// キャラクターの世界。初回リリースでは "animal" のみを使用する。
// food / plant / dinosaur / fantasy / space は将来拡張用。
export type CharacterWorld = "animal" | "food" | "plant" | "dinosaur" | "fantasy" | "space";

// スキャン手段。初回リリースでは "barcode" のみを使用する。
// receipt / photo / sky / moon / time / qr / event / sponsor は将来拡張用。
export type ScanSource = "barcode" | "receipt" | "photo" | "sky" | "moon" | "time" | "qr" | "event" | "sponsor";

// 限定区分。初回リリースでは "none" のみを使用する。
export type LimitedType = "none" | "event" | "region" | "sponsor" | "seasonal";

// レア度の段階表現。数値 rarity と併用する。
export type RarityTier = "normal" | "uncommon" | "rare" | "hiddenRare";

// 初回リリースではキャラクターを動かさない。将来モーション対応のためのプレースホルダ。
export type AnimationType = "none";

export type Rarity = 1 | 2 | 3 | 4 | 5;

export type StatBlock = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  tec: number;
  luck: number;
};

export type MonsterFamily = {
  id: string;
  no: number;
  /** 種族ラベル。例: "イヌ種"。図鑑の見出しや研究タイトルに使用。 */
  name: string;
  /** モンスター表示名。例: "バウル"。 */
  displayName: string;
  /** 基礎生物名。例: "イヌ"。 */
  baseAnimalName: string;
  /** 図鑑カテゴリ。例: "けもの"。 */
  category: string;
  /** キャラクターの世界。初回は "animal"。 */
  characterWorld: CharacterWorld;
  /** 画像ファイル名（拡張子なし）と一致する imageKey。 */
  imageKey: string;
  /** fallback 表示で使う絵文字。 */
  emoji: string;
  /** 既定属性。MonsterAvatar など互換用に baseElement と同値。 */
  defaultElement: ElementType;
  baseElement: ElementType;
  /** 副属性（任意）。 */
  subElement?: ElementType;
  /** このキャラだけの「記憶に残る記号」。 */
  signatureMark: string;
  /** 性格候補。個体差生成に使用。 */
  personalityPool: string[];
  /** 変えてはいけないシルエットの核。 */
  silhouetteTraits: string[];
  /** 固定デザイン要素。 */
  fixedDesignTraits: string[];
  /** 個体差で変えてよい要素。 */
  variableDesignTraits: string[];
  /** 生き物メモ（学習要素）。 */
  biologicalMemo: string;
  /** ゲーム内特徴。 */
  gameTrait: string;
  /** 研究で解放される未発見ヒント。 */
  researchHints: string[];
  /** 分類元に隠れているレアID。 */
  hiddenRareIds: string[];
  /** 互換用のシルエット種別キー。 */
  silhouetteKey: string;
  /** 互換用の体型キー。 */
  baseBodyType: string;
  /** 出現傾向の重み付け（高いほどレア）。 */
  rarityBias: number;
  description: string;
};

export type RareMonster = {
  id: string;
  displayName: string;
  /** 分類元の通常種族ID。 */
  baseFamilyId: string;
  imageKey: string;
  emoji: string;
  /** 種別。例: "神話生物"。 */
  rareCategory: string;
  rarity: Rarity;
  defaultElement: ElementType;
  designConcept: string;
  /** 通常種族とのつながり。 */
  relationToBaseFamily: string;
  /** 伝承メモ / 空想メモ / 希少メモ。 */
  loreMemo: string;
  /** 発見難度の表示。 */
  discoveryDifficulty: string;
  /** 未発見ヒント。 */
  unlockHint: string;
};

export type ContextVariant = {
  timeSlot: TimeSlot;
  season: Season;
  regionKey: string;
  regionName: string;
  variantName: string;
  tags: string[];
};

export type MonsterDNA = {
  /** バーコード種別＋正規化値から得たハッシュ。種族傾向を決める。 */
  sourceHash: string;
  /** 個体差（色・模様・性格・レア度・称号）を決めるハッシュ。 */
  variantSeedHash: string;
  familyId: string;
  /** 隠れレアの場合のレアID。 */
  rareId?: string;
  primaryElement: ElementType;
  secondaryElement?: ElementType;
  rarity: Rarity;
  rarityTier: RarityTier;
  bodyVariant: string;
  colorPalette: string;
  eyeType: string;
  patternType: string;
  auraType: string;
  personality: string;
  statBias: string;
  trait: string;
  skillIds: string[];
  contextVariant: ContextVariant;
  individualVariantKey?: IndividualVariantKey;
  individualVariantName?: string;
  individualVariantCategory?: IndividualVariantCategory;
};

export type UserMonster = {
  id: string;
  characterId?: string;
  /** 領域・ワールド（ground/waterside/sky/bug...）。カタログ由来キャラのみ。 */
  realmGroup?: import("./worlds").RealmGroup;
  worldGroup?: import("./worlds").WorldGroup;
  /** カタログ由来キャラの和名/英名（表示・図鑑用）。 */
  speciesJa?: string;
  speciesEn?: string;
  familyId: string;
  /** 隠れレアの場合のレアID。 */
  rareId?: string;
  characterWorld: CharacterWorld;
  scanSource: ScanSource;
  limitedType: LimitedType;
  sourceType: SourceType;
  barcodeType: string;
  /** 生のバーコード値は保存しない。ハッシュのみ保存する。 */
  sourceHash: string;
  variantSeedHash: string;
  dna: MonsterDNA;
  displayName: string;
  nickname?: string;
  habitatGroup?: HabitatGroup;
  characterRarity?: CharacterRarity;
  firstDiscoveredAt?: string;
  lastDiscoveredAt?: string;
  discoveryCount?: number;
  rarityTier: RarityTier;
  /** 同じ種族内での個体番号（個体差の目印）。 */
  variantNo?: number;
  /** 体格（こがた / ふつう / おおがた）。 */
  sizeClass?: string;
  level: number;
  exp: number;
  stats: StatBlock;
  loreText: string;
  imageKey: string;
  obtainedAt: string;
  favorite: boolean;
  /**
   * 発見元の生活カテゴリ（カテゴリ図鑑用）。
   * QRは自動で "qr"、不明は "other"。ユーザーが後から変更できる。
   * バーコード値・商品名は保存しない（カテゴリのみ保存）。
   */
  scanCategory?: import("./category").ScanCategory;
  /** 初回リリースではキャラクターを動かさない。 */
  animationType: AnimationType;
  motionProfile?: string;
  expeditionStatus?: "idle" | "in_expedition";
};
