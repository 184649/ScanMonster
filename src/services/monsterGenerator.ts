import { makeIndividualImageKey } from "../assets/monsterIndividualImages";
import { getIndividualVariant, getSeasonVariantKey, getTimeVariantKey } from "../data/individualVariants";
import { getFamilyById, MONSTER_FAMILIES } from "../data/monsterFamilies";
import { getRareById } from "../data/rareMonsters";
import type {
  ElementType,
  MonsterDNA,
  MonsterFamily,
  Rarity,
  RarityTier,
  ScanSource,
  Season,
  SourceType,
  StatBlock,
  TimeSlot,
  UserMonster,
  IndividualVariantKey
} from "../types/monster";
import type { RegionKey } from "../types/region";
import type { ScanHistory } from "../types/scan";
import type { DiscoveryType } from "./discoveryRate";
import { getLocalDateKey, getScanTimeBucket } from "../utils/dateUtils";
import { pickFromHash, valueFromHash } from "../utils/randomFromHash";
import { evaluateRareSpawn } from "../utils/rareSpawn";
import { createContextVariant, getSeason, getTimeSlot } from "./contextService";

/** レア判定に渡す追加コンテキスト（ストアから渡す）。 */
type RareSpawnInput = {
  streakDays: number;
  discoveredFamilyIds: Set<string>;
  familyDiscoveryCount: number;
};

type GenerateMonsterParams = {
  /** 種族傾向を決める（同じバーコードなら同じ傾向）。 */
  sourceHash: string;
  /** 個体差を決める（秒単位の時刻・userSalt を含む）。 */
  variantSeed: string;
  sourceType: SourceType;
  scanSource: ScanSource;
  barcodeType: string;
  scannedAt: Date;
  regionKey: RegionKey;
  /** 初回発見の補正（通常以上の見栄えにし、レアは出さない）。 */
  boostFirstDiscovery?: boolean;
  /** レア出現判定の文脈。 */
  rareInput?: RareSpawnInput;
  /** 出現確率ロジックのロール結果（normal/variant/rare）。指定時は希少性を制御する。 */
  forcedType?: DiscoveryType;
  /** 開発用：種族を強制する（図鑑の全種発見などに使用）。 */
  familyOverride?: MonsterFamily;
  /** 開発用：レアIDを強制する（そのレアの baseFamily を種族に使う）。 */
  rareOverride?: string;
};

const sizeClasses = ["こがた", "ふつう", "おおがた"];

type GenerateMonsterResult = {
  monster: UserMonster;
  scanHistory: ScanHistory;
};

const bodyVariants = ["スフィア", "ライン", "コア", "リーフ", "シャード", "ミスト", "ギア", "フレア"];
const eyeTypes = ["まる目", "シャープ目", "星目", "ドット目", "眠たげ目", "リング目"];
const patternTypes = ["バー模様", "ドット模様", "波紋模様", "結晶模様", "リング模様", "斜線模様"];
const auraTypes = ["微光", "粒子", "風帯", "火花", "静電気", "水膜", "影光"];
const statBiases = ["耐久寄り", "攻撃寄り", "防御寄り", "速度寄り", "技巧寄り", "幸運寄り"];
const traits = ["環境同期", "コード感知", "反射装甲", "ゆらぎ制御", "高速解析", "静音移動", "記録保護"];
const palettes = ["blue-yellow", "mint-gold", "sky-coral", "silver-blue", "lime-navy", "rose-cyan", "amber-indigo"];
const skillPool = ["scan-pulse", "hash-bite", "data-veil", "context-boost", "signal-dash", "tag-spark", "region-guard", "season-bloom"];

const timeSlotPrefix: Record<string, string> = {
  morning: "朝露",
  day: "陽光",
  evening: "黄昏",
  night: "月影"
};

const seasonPrefix: Record<string, string> = {
  spring: "春風",
  summer: "夏光",
  autumn: "紅葉",
  winter: "雪灯"
};

export const pickFamilyFromHash = (sourceHash: string) => {
  const weightedFamilies = MONSTER_FAMILIES.flatMap((family) => {
    const weight = Math.max(1, 6 - family.rarityBias);
    return Array.from({ length: weight }, () => family);
  });

  return pickFromHash(sourceHash, weightedFamilies, 0);
};

export const pickRarityFromHash = (variantSeed: string, familyBias = 1): Rarity => {
  const roll = valueFromHash(variantSeed, 1, 100, 12) + familyBias * 2;

  if (roll >= 98) {
    return 5;
  }

  if (roll >= 90) {
    return 4;
  }

  if (roll >= 72) {
    return 3;
  }

  if (roll >= 42) {
    return 2;
  }

  return 1;
};

const pickRarityVariantKey = (variantSeed: string, rarity: Rarity): IndividualVariantKey => {
  if (rarity >= 5 && valueFromHash(variantSeed, 1, 100, 82) <= 65) {
    return "legend";
  }

  if (rarity >= 4 && valueFromHash(variantSeed, 1, 100, 83) <= 70) {
    return "rare";
  }

  const roll = valueFromHash(variantSeed, 1, 100, 84);
  if (roll <= 70) {
    return "common";
  }
  if (roll <= 90) {
    return "uncommon";
  }
  if (roll <= 98) {
    return "rare";
  }
  return "legend";
};

const pickIndividualVariantKey = ({
  variantSeed,
  timeSlot,
  season,
  rarity
}: {
  variantSeed: string;
  timeSlot: TimeSlot;
  season: Season;
  rarity: Rarity;
}): IndividualVariantKey => {
  const categoryRoll = valueFromHash(variantSeed, 1, 100, 80);

  if (categoryRoll <= 34) {
    return getTimeVariantKey(timeSlot);
  }

  if (categoryRoll <= 62) {
    return getSeasonVariantKey(season);
  }

  return pickRarityVariantKey(variantSeed, rarity);
};

export const rarityTierFromRarity = (rarity: Rarity, isHiddenRare = false): RarityTier => {
  if (isHiddenRare) {
    return "hiddenRare";
  }

  if (rarity >= 4) {
    return "rare";
  }

  if (rarity === 3) {
    return "uncommon";
  }

  return "normal";
};

export const calculateStats = (dna: MonsterDNA, level = 1): StatBlock => {
  const base = 34 + dna.rarity * 8 + level * 2;
  const seed = dna.variantSeedHash;
  const stats: StatBlock = {
    hp: base + valueFromHash(seed, 0, 18, 0),
    atk: base + valueFromHash(seed, 0, 18, 6),
    def: base + valueFromHash(seed, 0, 18, 12),
    spd: base + valueFromHash(seed, 0, 18, 18),
    tec: base + valueFromHash(seed, 0, 18, 24),
    luck: base + valueFromHash(seed, 0, 18, 30)
  };

  const biasMap: Record<string, keyof StatBlock> = {
    "耐久寄り": "hp",
    "攻撃寄り": "atk",
    "防御寄り": "def",
    "速度寄り": "spd",
    "技巧寄り": "tec",
    "幸運寄り": "luck"
  };
  const boostedStat = biasMap[dna.statBias];

  if (boostedStat) {
    stats[boostedStat] += 8 + dna.rarity * 2;
  }

  return stats;
};

export const generateMonsterFromScan = ({
  sourceHash,
  variantSeed,
  sourceType,
  scanSource,
  barcodeType,
  scannedAt,
  regionKey,
  boostFirstDiscovery,
  rareInput,
  forcedType,
  familyOverride,
  rareOverride
}: GenerateMonsterParams): GenerateMonsterResult => {
  // 種族は sourceHash で決定（同じバーコードなら同じ種族傾向）。
  // 開発用の rareOverride / familyOverride があればそれを優先する。
  const rareOverrideObj = rareOverride ? getRareById(rareOverride) : undefined;
  const family = rareOverrideObj
    ? getFamilyById(rareOverrideObj.baseFamilyId)
    : familyOverride ?? pickFamilyFromHash(sourceHash);

  const timeSlot = getTimeSlot(scannedAt);
  const season = getSeason(scannedAt);
  const context = createContextVariant(scannedAt, regionKey, sourceType);

  // 出現タイプ（normal/variant/rare）のロール結果で希少性を制御する。
  // ノーマルを主役にし、別個体・レアは希少に保つ（上限は discoveryRate 側で担保）。
  const wantRare = forcedType === "rare";
  const wantVariant = forcedType === "variant";
  const wantNormal = forcedType === "normal";

  // レア判定：normal/variant のロールならレアは出さない。初回発見でも出さない。
  let rareId: string | undefined;
  if (rareOverride) {
    // 開発用：指定レアを確定させる。
    rareId = rareOverride;
  } else if (!boostFirstDiscovery && family.hiddenRareIds.length > 0) {
    if (wantRare) {
      // rare ロール：この種族のレアから決定的に1体選ぶ。
      rareId = pickFromHash(variantSeed, family.hiddenRareIds, 90);
    } else if (!wantNormal && !wantVariant) {
      // forcedType 未指定（従来動作）：既存のレア出現エンジンで判定。
      rareId = evaluateRareSpawn({
        baseFamilyId: family.id,
        variantSeed,
        sourceHash,
        scanSource: scanSource === "qr" ? "qr" : "barcode",
        timeSlot,
        season,
        streakDays: rareInput?.streakDays ?? 0,
        discoveredFamilyIds: rareInput?.discoveredFamilyIds ?? new Set<string>(),
        familyDiscoveryCount: rareInput?.familyDiscoveryCount ?? 0
      })?.rareKey;
    }
  }
  const rare = rareId ? getRareById(rareId) : undefined;

  let rarity = pickRarityFromHash(variantSeed, family.rarityBias);

  if (rare) {
    rarity = rare.rarity;
  } else if (wantNormal) {
    // ノーマルは控えめ（★1〜2）。
    rarity = Math.min(rarity, 2) as Rarity;
  } else if (wantVariant) {
    // 別個体は少し高め（★3以上）。
    rarity = Math.max(rarity, 3) as Rarity;
  } else if (boostFirstDiscovery) {
    // 初回発見は通常以上（uncommon 以上）に補正
    rarity = Math.max(rarity, 3) as Rarity;
  }

  const rarityTier = rarityTierFromRarity(rarity, Boolean(rare));
  let individualVariantKey = pickIndividualVariantKey({ variantSeed, timeSlot, season, rarity });
  if (wantNormal) {
    individualVariantKey = "common";
  } else if (wantVariant && individualVariantKey === "common") {
    // 別個体ロールなのに common になった場合は、時間/季節の別個体にする。
    individualVariantKey = valueFromHash(variantSeed, 0, 1, 71) === 0 ? getTimeVariantKey(timeSlot) : getSeasonVariantKey(season);
  }
  const individualVariant = getIndividualVariant(individualVariantKey);

  const useSeasonPrefix = valueFromHash(variantSeed, 0, 1, 70) === 0;
  const prefixWord = useSeasonPrefix ? seasonPrefix[season]! : timeSlotPrefix[timeSlot]!;
  const variantName = `${prefixWord}型`;

  const personality = pickFromHash(variantSeed, family.personalityPool, 44);

  const primaryElement: ElementType =
    rare?.defaultElement ??
    (family.subElement && valueFromHash(variantSeed, 0, 100, 18) > 78 ? family.subElement : family.defaultElement);
  const secondaryElement = !rare && family.subElement && primaryElement !== family.subElement ? family.subElement : undefined;

  const dna: MonsterDNA = {
    sourceHash,
    variantSeedHash: variantSeed,
    familyId: family.id,
    rareId,
    primaryElement,
    secondaryElement,
    rarity,
    rarityTier,
    bodyVariant: pickFromHash(variantSeed, bodyVariants, 24),
    colorPalette: `${pickFromHash(variantSeed, palettes, 28)}-${season}`,
    eyeType: pickFromHash(variantSeed, eyeTypes, 32),
    patternType: pickFromHash(variantSeed, patternTypes, 36),
    auraType: `${pickFromHash(variantSeed, auraTypes, 40)}/${timeSlot}`,
    personality,
    statBias: pickFromHash(variantSeed, statBiases, 48),
    trait: pickFromHash(variantSeed, traits, 52),
    skillIds: [pickFromHash(variantSeed, skillPool, 56), pickFromHash(variantSeed, skillPool, 60)],
    contextVariant: { ...context, variantName },
    individualVariantKey,
    individualVariantName: individualVariant.nameJa,
    individualVariantCategory: individualVariant.category
  };

  const displayName = rare ? rare.displayName : `${variantName}${family.displayName}`;
  // 同種族でも個体ごとに別画像を割り当てる（variantSeed で決定的に選ぶ）。
  const imageKey = rare ? rare.imageKey : makeIndividualImageKey(family.imageKey, individualVariantKey);
  const loreText = rare
    ? `${rare.loreMemo} ${rare.relationToBaseFamily}`
    : `${family.baseAnimalName}をベースにした${family.name}の${variantName}個体。${context.regionName}で発見され、${personality}な性格。${family.gameTrait}`;

  const obtainedAt = scannedAt.toISOString();
  const suffix = valueFromHash(variantSeed + obtainedAt, 1000, 9999, 2);
  const id = `mon_${Date.now()}_${sourceHash.slice(0, 8)}_${suffix}`;
  // 同じ種族内での個体番号（1〜99）と体格。個体差を分かりやすくする。
  const variantNo = valueFromHash(variantSeed, 1, 99, 66);
  const sizeClass = pickFromHash(variantSeed, sizeClasses, 68);

  const monster: UserMonster = {
    id,
    familyId: family.id,
    rareId,
    characterWorld: "animal",
    scanSource,
    limitedType: "none",
    sourceType,
    barcodeType,
    sourceHash,
    variantSeedHash: variantSeed,
    dna,
    displayName,
    rarityTier,
    variantNo,
    sizeClass,
    level: 1,
    exp: 0,
    stats: calculateStats(dna),
    loreText,
    imageKey,
    obtainedAt,
    favorite: false,
    animationType: "none"
  };

  const scanHistory: ScanHistory = {
    id: `scan_${Date.now()}_${sourceHash.slice(0, 8)}`,
    sourceType,
    scanSource,
    barcodeType,
    sourceHash,
    variantSeedHash: variantSeed,
    resultMonsterId: monster.id,
    scannedAt: obtainedAt,
    scanDate: getLocalDateKey(scannedAt),
    scanTimeBucket: getScanTimeBucket(scannedAt),
    timeSlot,
    season,
    regionKey,
    regionName: context.regionName
  };

  return { monster, scanHistory };
};

export const getFamilyDisplayName = (familyId: string): string => getFamilyById(familyId).displayName;
