import type { ElementType } from "./monster";

export type ExpeditionStatus = "in_progress" | "completed" | "claimed";

export type ExpeditionArea = {
  id: string;
  name: string;
  description: string;
  requiredLevel: number;
  durationMinutes: number;
  recommendedElements: ElementType[];
  rewardPreview: string[];
  unlockCondition?: string;
};

export type ActiveExpedition = {
  id: string;
  areaId: string;
  monsterIds: string[];
  startedAt: string;
  endsAt: string;
  status: ExpeditionStatus;
  rewardClaimedAt?: string;
  rewardSummary?: string[];
};

export type ExpeditionReward = {
  exp: number;
  gems: number;
  researchPoints: number;
  materials: string[];
  unlockedHints: string[];
};
