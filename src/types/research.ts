export type FamilyResearch = {
  familyId: string;
  researchPoints: number;
  researchLevel: number;
  unlockedHints: string[];
  updatedAt: string;
};

export type FamilyResearchSummary = FamilyResearch & {
  collectedCount: number;
  variantCount: number;
  nextHint?: string;
  nextRewardLabel: string;
};
