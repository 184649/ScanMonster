import type { NavigatorScreenParams } from "@react-navigation/native";

import type { DiscoveryResultRef } from "./discovery";

export type MainTabParamList = {
  Home: undefined;
  DexHome: undefined;
  Scan: undefined;
  MyPage: undefined;
  SettingsTab: undefined;
};

export type DiscoveryKind = "first" | "rediscovery" | "duplicate";

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  SummonResult: {
    results: DiscoveryResultRef[];
  };
  // 所持モンスター（monsterId）を開く。未所持/デバッグ表示ではカタログID（catalogId）でプレビュー表示する。
  MonsterDetail: { monsterId?: string; catalogId?: string };
  Collection: undefined;
  WorldDex: undefined;
  HabitatUnlock: undefined;
  Titles: undefined;
  Research: undefined;
  RegionSettings: undefined;
  Settings: undefined;
  FriendInvite: undefined;
  FriendQrScan: undefined;
  FriendDex: undefined;
};
