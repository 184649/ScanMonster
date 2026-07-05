import { EXPEDITION_AREAS, getExpeditionAreaById } from "../data/expeditionAreas";
import { getElementMeta } from "../data/elements";
import { getFamilyById } from "../data/monsterFamilies";
import { calculateStats } from "./monsterGenerator";
import type { ActiveExpedition, ExpeditionArea, ExpeditionReward, ExpeditionStatus } from "../types/expedition";
import type { UserMonster } from "../types/monster";
import { valueFromHash } from "../utils/randomFromHash";

export const MAX_EXPEDITION_MONSTERS = 3;
export const MAX_MONSTER_LEVEL = 20;

export const getExpeditionDisplayStatus = (expedition: ActiveExpedition, now = new Date()): ExpeditionStatus => {
  if (expedition.status === "claimed") {
    return "claimed";
  }

  if (Date.parse(expedition.endsAt) <= now.getTime()) {
    return "completed";
  }

  return "in_progress";
};

export const isMonsterInActiveExpedition = (monsterId: string, expeditions: ActiveExpedition[]): boolean => {
  return expeditions.some(
    (expedition) => getExpeditionDisplayStatus(expedition) === "in_progress" && expedition.monsterIds.includes(monsterId)
  );
};

export const createActiveExpedition = (areaId: string, monsterIds: string[], now = new Date()): ActiveExpedition => {
  const area = getExpeditionAreaById(areaId) ?? EXPEDITION_AREAS[0]!;
  const endsAt = new Date(now.getTime() + area.durationMinutes * 60 * 1000);

  return {
    id: `exp_${now.getTime()}_${areaId}`,
    areaId,
    monsterIds: monsterIds.slice(0, MAX_EXPEDITION_MONSTERS),
    startedAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    status: "in_progress"
  };
};

export const getMinutesRemaining = (expedition: ActiveExpedition, now = new Date()): number => {
  return Math.max(0, Math.ceil((Date.parse(expedition.endsAt) - now.getTime()) / 60000));
};

export const getExpeditionSuccessScore = (area: ExpeditionArea, monsters: UserMonster[]): number => {
  return monsters.reduce((score, monster) => {
    const elementMatch =
      area.recommendedElements.includes(monster.dna.primaryElement) ||
      (monster.dna.secondaryElement ? area.recommendedElements.includes(monster.dna.secondaryElement) : false);
    const rarityBonus = monster.dna.rarity * 3;
    const levelBonus = monster.level * 2;
    return score + levelBonus + rarityBonus + (elementMatch ? 24 : 0);
  }, 20);
};

export const calculateExpeditionReward = (area: ExpeditionArea, monsters: UserMonster[]): ExpeditionReward => {
  const score = getExpeditionSuccessScore(area, monsters);
  const seed = `${area.id}:${monsters.map((monster) => monster.sourceHash).join(":")}`;
  const bonus = valueFromHash(seed, 0, 18, 5);
  const exp = area.durationMinutes * 35 + monsters.length * 20 + Math.floor(score / 3);
  const gems = Math.max(1, Math.floor((area.durationMinutes + bonus) / 3));
  const researchPoints = area.durationMinutes * 8 + monsters.length * 6 + Math.floor(score / 8);
  const family = monsters[0] ? getFamilyById(monsters[0].familyId) : undefined;
  const element = monsters[0] ? getElementMeta(monsters[0].dna.primaryElement) : undefined;
  const unlockedHints = family
    ? [
        `${family.name}の新しい痕跡を見つけました。`,
        `${area.name}では${element?.label ?? "特定属性"}の個体が反応しやすいようです。`
      ]
    : [`${area.name}で未発見個体の痕跡を見つけました。`];

  return {
    exp,
    gems,
    researchPoints,
    materials: [`${area.name.replace("探索", "")}メダル`, "研究メモ"],
    unlockedHints
  };
};

export const createRewardSummary = (reward: ExpeditionReward): string[] => {
  return [
    `EXP +${reward.exp}`,
    `ジェム +${reward.gems}`,
    `研究Pt +${reward.researchPoints}`,
    ...reward.materials,
    ...reward.unlockedHints.slice(0, 1)
  ];
};

export const addExpToMonster = (monster: UserMonster, exp: number): UserMonster => {
  let nextExp = monster.exp + exp;
  let nextLevel = monster.level;

  while (nextLevel < MAX_MONSTER_LEVEL) {
    const required = nextLevel * 120;

    if (nextExp < required) {
      break;
    }

    nextExp -= required;
    nextLevel += 1;
  }

  return {
    ...monster,
    level: nextLevel,
    exp: nextExp,
    stats: calculateStats(monster.dna, nextLevel),
    expeditionStatus: "idle"
  };
};
