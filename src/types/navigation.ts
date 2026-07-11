import type { NavigatorScreenParams } from "@react-navigation/native";

import type { DiscoveryResultRef } from "./discovery";
import type { FriendQrScanResult } from "../services/apiClient";

export type MainTabParamList = {
  Home: undefined;
  Scan: undefined;
  Dex: undefined;
  Friend: undefined;
  Menu: undefined;
};

export type DiscoveryKind = "first" | "rediscovery" | "duplicate";

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  SummonResult: {
    results: DiscoveryResultRef[];
    /** スキャン画面で公開演出を済ませた場合 true（結果画面では reveal を再生しない）。 */
    presented?: boolean;
  };
  // 所持モンスター（monsterId）を開く。未所持/デバッグ表示ではカタログID（catalogId）でプレビュー表示する。
  MonsterDetail: { monsterId?: string; catalogId?: string };
  Collection: undefined;
  WorldDex: undefined;
  DiscoveryLog: undefined;
  NumberCollection: undefined;
  DiscoveryCalendar: undefined;
  HabitatUnlock: undefined;
  Titles: undefined;
  Research: undefined;
  RegionSettings: undefined;
  Settings: undefined;
  Account: undefined;
  FeatureBoard: undefined;
  MyPage: undefined;
  Legal: { doc: "terms" | "privacy" };
  WorldList: undefined;
  FriendQRCode: undefined;
  FriendQRScanServer: undefined;
  FriendQRResult: { result: FriendQrScanResult };
  FriendInvite: undefined;
  FriendQrScan: undefined;
  FriendDex: undefined;
};
