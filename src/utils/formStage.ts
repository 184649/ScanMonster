import type { ImageSourcePropType } from "react-native";

import { getFormImageSource } from "../assets/monsterFormImages";
import { FORM_STAGE_LABELS, FORM_STAGE_SUFFIX } from "../data/economy";
import { getFamilyById } from "../data/monsterFamilies";
import type { EconomyStateData, FormStage } from "../types/economy";
import type { UserMonster } from "../types/monster";

export const getActiveFormStage = (economy: EconomyStateData, monsterId: string): FormStage =>
  economy.unlocks.activeFormByMonsterId[monsterId] ?? "base";

/** 表示名に姿の接尾辞を付ける。base は接尾辞なし（元の名前だけ）。 */
export const getFormStageDisplayName = (baseName: string, stage: FormStage): string =>
  `${baseName}${FORM_STAGE_SUFFIX[stage]}`;

export const getMonsterDisplayNameWithForm = (monster: UserMonster, economy: EconomyStateData): string => {
  const baseName = monster.nickname || monster.displayName;
  return getFormStageDisplayName(baseName, getActiveFormStage(economy, monster.id));
};

export const getFormStageLabel = (stage: FormStage): string => FORM_STAGE_LABELS[stage];

/**
 * 姿に対応する装飾つき画像を返す。
 * - base、またはレア個体、または画像未配置の場合は undefined（発見時の画像へフォールバック）。
 * - 装飾画像は色フィルターではなく、装飾・小物・種族固有パーツを描き足した別PNG。
 */
export const getMonsterFormImageSource = (monster: UserMonster, stage: FormStage): ImageSourcePropType | undefined => {
  if (stage === "base" || monster.rareId) {
    return undefined;
  }

  const speciesKey = getFamilyById(monster.familyId).imageKey;
  return getFormImageSource(speciesKey, monster.dna.individualVariantKey, stage);
};
