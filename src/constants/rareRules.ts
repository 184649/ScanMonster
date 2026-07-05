import type { Season, TimeSlot } from "../types/monster";

export type RareMonsterKey =
  | "rare_phoenix"
  | "rare_dragon"
  | "rare_kraken"
  | "rare_fenrir"
  | "rare_robot"
  | "rare_alien"
  | "rare_ghost"
  | "rare_panda";

/**
 * 出現確率の基準値（初期調整値）。
 * ゲームバランス調整のためここで定数化する。README の確率表と一致させること。
 */
export const RARE_SPAWN_RATES = {
  /** 通常個体 */
  normal: 0.94,
  /** やや珍しい個体（uncommon） */
  uncommonIndividual: 0.05,
  /** レアモンスター基準確率 */
  rareMonster: 0.008,
  /** 超レア条件一致時の基準確率 */
  superRareCondition: 0.002
} as const;

/** 条件を1つ満たすごとに、レア出現確率にかかる倍率。 */
export const RARE_CONDITION_MULTIPLIER = 0.6;

/** レア出現確率の上限（条件を満たしても出すぎないようにする）。 */
export const RARE_RATE_CAP = 0.05;

/** レア判定に渡すコンテキスト。生のコード値は含めない。 */
export type RareSpawnContext = {
  baseFamilyId: string;
  /** 個体差ハッシュ（抽選の乱数源）。 */
  variantSeed: string;
  /** 種族傾向ハッシュ。 */
  sourceHash: string;
  scanSource: "barcode" | "qr";
  timeSlot: TimeSlot;
  season: Season;
  /** 連続スキャン日数。 */
  streakDays: number;
  /** このスキャン前に発見済みのベース種族IDの集合。 */
  discoveredFamilyIds: Set<string>;
  /** このベース種族をすでに何個体発見しているか。 */
  familyDiscoveryCount: number;
};

export type RareCondition = {
  /** README/画面表示用の説明。 */
  label: string;
  test: (ctx: RareSpawnContext) => boolean;
};

export type RareSpawnRule = {
  rareKey: RareMonsterKey;
  /** 分類元の通常種族ID。 */
  baseSpeciesId: string;
  displayName: string;
  /** 基準確率（RARE_SPAWN_RATES を参照）。 */
  baseRate: number;
  /** 出現しやすくなる加点条件。 */
  bonusConditions: RareCondition[];
};

const timeSlotIs = (slots: TimeSlot[], label: string): RareCondition => ({
  label,
  test: (ctx) => slots.includes(ctx.timeSlot)
});

const scanSourceIs = (source: "barcode" | "qr", label: string): RareCondition => ({
  label,
  test: (ctx) => ctx.scanSource === source
});

const streakAtLeast = (days: number, label: string): RareCondition => ({
  label,
  test: (ctx) => ctx.streakDays >= days
});

const discoveredBase = (label: string): RareCondition => ({
  label,
  test: (ctx) => ctx.discoveredFamilyIds.has(ctx.baseFamilyId)
});

const familyCountAtLeast = (count: number, label: string): RareCondition => ({
  label,
  test: (ctx) => ctx.familyDiscoveryCount >= count
});

/** sourceHash の傾向（先頭バイトの偏り）を「特定のコード傾向」として扱う。 */
const sourceHashTrait = (label: string, predicate: (firstByte: number) => boolean): RareCondition => ({
  label,
  test: (ctx) => {
    const byte = Number.parseInt(ctx.sourceHash.slice(0, 2) || "0", 16);
    return Number.isFinite(byte) ? predicate(byte) : false;
  }
});

/**
 * レア出現ルール。確率はマジックナンバーにせず RARE_SPAWN_RATES を参照する。
 * README「レアモンスターの出現仕様」と内容を一致させること。
 */
export const RARE_SPAWN_RULES: RareSpawnRule[] = [
  {
    rareKey: "rare_phoenix",
    baseSpeciesId: "eagle",
    displayName: "フェニックス",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [
      timeSlotIs(["morning"], "朝の時間帯"),
      streakAtLeast(3, "連続スキャン3日以上"),
      discoveredBase("ワシ系の通常種族を発見済み")
    ]
  },
  {
    rareKey: "rare_dragon",
    baseSpeciesId: "crocodile",
    displayName: "ドラゴン",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [
      timeSlotIs(["night"], "夜の時間帯"),
      discoveredBase("ワニ系の通常種族を発見済み"),
      sourceHashTrait("特定のsourceHash傾向", (b) => b % 3 === 0)
    ]
  },
  {
    rareKey: "rare_kraken",
    baseSpeciesId: "jellyfish",
    displayName: "クラーケン",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [
      sourceHashTrait("水・海・飲料系のコード傾向", (b) => b < 96),
      discoveredBase("クラゲ系の通常種族を発見済み")
    ]
  },
  {
    rareKey: "rare_fenrir",
    baseSpeciesId: "dog",
    displayName: "フェンリル",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [
      timeSlotIs(["night", "morning"], "夜または早朝"),
      familyCountAtLeast(2, "イヌ系の通常種族を複数個体発見済み")
    ]
  },
  {
    rareKey: "rare_robot",
    baseSpeciesId: "human",
    displayName: "ロボット",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [
      scanSourceIs("qr", "QRコード読み取り時"),
      sourceHashTrait("デジタル/キャンペーン系コード傾向", (b) => b >= 160)
    ]
  },
  {
    rareKey: "rare_alien",
    baseSpeciesId: "human",
    displayName: "宇宙人",
    baseRate: RARE_SPAWN_RATES.superRareCondition,
    bonusConditions: [
      timeSlotIs(["night"], "深夜帯"),
      scanSourceIs("qr", "QRコード読み取り時")
    ]
  },
  {
    rareKey: "rare_ghost",
    baseSpeciesId: "crow",
    displayName: "ゴースト",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [
      timeSlotIs(["night"], "夜の時間帯"),
      discoveredBase("カラス系の通常種族を発見済み")
    ]
  },
  {
    rareKey: "rare_panda",
    baseSpeciesId: "bear",
    displayName: "パンダ",
    baseRate: RARE_SPAWN_RATES.rareMonster,
    bonusConditions: [discoveredBase("クマ系の通常種族を発見済み")]
  }
];

export const getRareRulesForFamily = (familyId: string): RareSpawnRule[] =>
  RARE_SPAWN_RULES.filter((rule) => rule.baseSpeciesId === familyId);
