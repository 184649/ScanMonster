export type TitleCategory = "scan" | "dex" | "unlock" | "world" | "rare" | "rediscovery" | "streak";

export type UserTitle = {
  id: string;
  name: string;
  description: string;
  category: TitleCategory;
  conditionText: string;
};

export type UserTitleState = {
  unlockedTitleIds: string[];
  activeTitleId?: string;
};
