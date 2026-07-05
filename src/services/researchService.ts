import { MONSTER_FAMILIES } from "../data/monsterFamilies";
import type { UserMonster } from "../types/monster";
import type { FamilyResearch, FamilyResearchSummary } from "../types/research";

const DEFAULT_HINTS = [
  "夜に出現しやすい個体がいるようです。",
  "春の草花が多い場所で変異の報告があります。",
  "同じ種族を複数集めるとレア変異の条件が見えてきます。",
  "別のバーコードからも、違う個体差の仲間が見つかることがあります。"
];

export const getResearchLevelFromPoints = (points: number): number => {
  if (points >= 240) {
    return 5;
  }

  if (points >= 140) {
    return 4;
  }

  if (points >= 75) {
    return 3;
  }

  if (points >= 30) {
    return 2;
  }

  return 1;
};

export const getDefaultFamilyHints = (familyId: string): string[] => {
  const family = MONSTER_FAMILIES.find((item) => item.id === familyId);
  const baseName = family?.name ?? "この種族";

  // 各種族固有の研究ヒント（生き物メモにつながる）を優先する。
  const familyHints = family?.researchHints ?? [];

  return Array.from(
    new Set([
      `${baseName}は地域や時間帯で違う個体差が出ます。`,
      ...familyHints,
      ...DEFAULT_HINTS
    ])
  );
};

export const getOrCreateFamilyResearch = (researchItems: FamilyResearch[], familyId: string): FamilyResearch => {
  return (
    researchItems.find((item) => item.familyId === familyId) ?? {
      familyId,
      researchPoints: 0,
      researchLevel: 1,
      unlockedHints: [],
      updatedAt: new Date(0).toISOString()
    }
  );
};

export const createResearchSummaries = (
  monsters: UserMonster[],
  researchItems: FamilyResearch[]
): FamilyResearchSummary[] => {
  return MONSTER_FAMILIES.map((family) => {
    const familyMonsters = monsters.filter((monster) => monster.familyId === family.id);
    const variants = new Set(familyMonsters.map((monster) => monster.dna.contextVariant.variantName));
    const stored = getOrCreateFamilyResearch(researchItems, family.id);
    const collectedBonus = familyMonsters.length * 8 + variants.size * 10;
    const researchPoints = Math.max(stored.researchPoints, collectedBonus);
    const researchLevel = Math.max(stored.researchLevel, getResearchLevelFromPoints(researchPoints));
    const hints = getDefaultFamilyHints(family.id);
    const unlockedHints = Array.from(new Set([...stored.unlockedHints, ...hints.slice(0, Math.min(researchLevel, hints.length))]));
    const nextHint = hints.find((hint) => !unlockedHints.includes(hint));

    return {
      ...stored,
      researchPoints,
      researchLevel,
      unlockedHints,
      collectedCount: familyMonsters.length,
      variantCount: variants.size,
      nextHint,
      nextRewardLabel: nextHint ? "次の未発見ヒント" : "カード背景・称号の拡張候補"
    };
  });
};

export const addResearchReward = (
  researchItems: FamilyResearch[],
  familyId: string,
  points: number,
  hints: string[]
): FamilyResearch[] => {
  const current = getOrCreateFamilyResearch(researchItems, familyId);
  const researchPoints = current.researchPoints + points;
  const researchLevel = getResearchLevelFromPoints(researchPoints);
  const unlockedHints = Array.from(new Set([...current.unlockedHints, ...hints]));
  const updated: FamilyResearch = {
    ...current,
    researchPoints,
    researchLevel,
    unlockedHints,
    updatedAt: new Date().toISOString()
  };

  return [updated, ...researchItems.filter((item) => item.familyId !== familyId)];
};
