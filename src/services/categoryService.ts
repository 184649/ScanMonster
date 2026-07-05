import { SCAN_CATEGORY_LABELS, SCAN_CATEGORY_ORDER } from "../data/economy";
import type { CategoryDiscoveryRecord, ScanCategory } from "../types/category";
import type { ScanSource, UserMonster } from "../types/monster";

/** monster.scanCategory を安全に取り出す（未設定は other）。 */
export const getMonsterCategory = (monster: UserMonster): ScanCategory => monster.scanCategory ?? "other";

/** 今日の対象・ホームのnude対象にできる「バーコードで探せる」カテゴリ（qr/other を除く）。 */
export const BARCODE_TARGET_CATEGORIES: ScanCategory[] = SCAN_CATEGORY_ORDER.filter(
  (category) => category !== "qr" && category !== "other"
);

/** 全カテゴリの集計（個体一覧から導出）。表示順は SCAN_CATEGORY_ORDER。 */
export const getCategoryRecords = (monsters: UserMonster[]): CategoryDiscoveryRecord[] => {
  const map = new Map<ScanCategory, CategoryDiscoveryRecord>();
  for (const category of SCAN_CATEGORY_ORDER) {
    map.set(category, {
      category,
      discoveredIndividualIds: [],
      discoveredSpeciesIds: [],
      totalScanCount: 0,
      firstDiscoveredAt: undefined,
      lastDiscoveredAt: undefined
    });
  }

  const speciesSeen = new Map<ScanCategory, Set<string>>();
  for (const category of SCAN_CATEGORY_ORDER) {
    speciesSeen.set(category, new Set());
  }

  for (const monster of monsters) {
    const category = getMonsterCategory(monster);
    const record = map.get(category)!;
    record.discoveredIndividualIds.push(monster.id);
    record.totalScanCount += 1;

    const species = speciesSeen.get(category)!;
    if (!species.has(monster.familyId)) {
      species.add(monster.familyId);
      record.discoveredSpeciesIds.push(monster.familyId);
    }

    if (!record.firstDiscoveredAt || monster.obtainedAt < record.firstDiscoveredAt) {
      record.firstDiscoveredAt = monster.obtainedAt;
    }
    if (!record.lastDiscoveredAt || monster.obtainedAt > record.lastDiscoveredAt) {
      record.lastDiscoveredAt = monster.obtainedAt;
    }
  }

  return SCAN_CATEGORY_ORDER.map((category) => map.get(category)!);
};

/** 指定カテゴリの個体数。 */
export const getCategoryCount = (monsters: UserMonster[], category: ScanCategory): number =>
  monsters.reduce((count, monster) => (getMonsterCategory(monster) === category ? count + 1 : count), 0);

/** 指定カテゴリの個体一覧（新しい順）。 */
export const getMonstersByCategory = (monsters: UserMonster[], category: ScanCategory): UserMonster[] =>
  monsters.filter((monster) => getMonsterCategory(monster) === category);

/**
 * 「今日の対象」カテゴリ。まだ発見していないバーコードカテゴリを日替わりで選ぶ。
 * すべて発見済みなら undefined。
 */
export const getTodayTargetCategory = (monsters: UserMonster[], today = new Date()): ScanCategory | undefined => {
  const unexplored = BARCODE_TARGET_CATEGORIES.filter((category) => getCategoryCount(monsters, category) === 0);
  if (unexplored.length === 0) {
    return undefined;
  }
  const dayIndex = Math.floor(today.getTime() / 86_400_000);
  return unexplored[dayIndex % unexplored.length];
};

/**
 * スキャン時の初期カテゴリ。
 * - QRは自動で qr
 * - 今日の対象があればそれ（発見を促す）
 * - なければ other
 */
export const defaultScanCategory = (scanSource: ScanSource, monsters: UserMonster[], today = new Date()): ScanCategory => {
  if (scanSource === "qr") {
    return "qr";
  }
  return getTodayTargetCategory(monsters, today) ?? "other";
};

export type HomeCategoryNudge = {
  category: ScanCategory;
  title: string;
  body: string;
  /** 未開拓カテゴリの誘導か（true）、発見済みカテゴリの実感か（false）。 */
  isUnexplored: boolean;
};

/** ホームに出す未開拓カテゴリ or 実感メッセージ。 */
export const getHomeCategoryNudge = (monsters: UserMonster[], today = new Date()): HomeCategoryNudge | null => {
  const target = getTodayTargetCategory(monsters, today);
  if (target) {
    const label = SCAN_CATEGORY_LABELS[target];
    return {
      category: target,
      title: `まだ${label}から発見していません`,
      body: `今日は${label}のバーコードを試してみませんか？`,
      isUnexplored: true
    };
  }

  // すべて発見済みなら、一番多いカテゴリの実感を返す。
  let best: { category: ScanCategory; count: number } | null = null;
  for (const category of BARCODE_TARGET_CATEGORIES) {
    const count = getCategoryCount(monsters, category);
    if (count > 0 && (!best || count > best.count)) {
      best = { category, count };
    }
  }
  if (!best) {
    return null;
  }
  const label = SCAN_CATEGORY_LABELS[best.category];
  return {
    category: best.category,
    title: `${label}から${best.count}体発見しています`,
    body: "いろいろな生活カテゴリから発見して、カテゴリ図鑑を埋めましょう。",
    isUnexplored: false
  };
};
