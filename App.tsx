import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { enableScreens } from "react-native-screens";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { BackButton } from "./src/components/common/BackButton";
import { CollectionScreen } from "./src/screens/CollectionScreen";
import { DexHomeScreen } from "./src/screens/DexHomeScreen";
import { WorldDexScreen } from "./src/screens/WorldDexScreen";
import { FriendDexScreen } from "./src/screens/FriendDexScreen";
import { FriendInviteScreen } from "./src/screens/FriendInviteScreen";
import { FriendQrScanScreen } from "./src/screens/FriendQrScanScreen";
import { HabitatUnlockScreen } from "./src/screens/HabitatUnlockScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { InitialWorldScreen } from "./src/screens/InitialWorldScreen";
import { LoginScreen } from "./src/screens/LoginScreen";
import { MissionScreen } from "./src/screens/MissionScreen";
import { MonsterDetailScreen } from "./src/screens/MonsterDetailScreen";
import { MyPageScreen } from "./src/screens/MyPageScreen";
import { ResearchScreen } from "./src/screens/ResearchScreen";
import { RegionSettingsScreen } from "./src/screens/RegionSettingsScreen";
import { ScanScreen } from "./src/screens/ScanScreen";
import { SettingsScreen } from "./src/screens/SettingsScreen";
import { SummonResultScreen } from "./src/screens/SummonResultScreen";
import { TitlesScreen } from "./src/screens/TitlesScreen";
import { useMonsterStore } from "./src/stores/monsterStore";
import { useProfileStore } from "./src/stores/profileStore";
import { useSettingsStore } from "./src/stores/settingsStore";
import type { MainTabParamList, RootStackParamList } from "./src/types/navigation";

enableScreens();

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

type TabEmojiIconProps = {
  emoji: string;
  color: string;
  size: number;
  focused?: boolean;
  primary?: boolean;
};

const TabEmojiIcon = ({ emoji, color, size, focused = false, primary = false }: TabEmojiIconProps) => {
  if (primary) {
    return (
      <View style={[styles.scanIcon, focused && styles.scanIconFocused]}>
        <Text style={[styles.scanIconText, { fontSize: Math.max(24, size + 4) }]}>{emoji}</Text>
      </View>
    );
  }

  return <Text style={[styles.tabIcon, { color, fontSize: size }]}>{emoji}</Text>;
};

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#2FA84F",
        tabBarInactiveTintColor: "#50627F",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "ホーム",
          tabBarIcon: ({ color, size, focused }) => <TabEmojiIcon emoji="🏠" color={color} size={size} focused={focused} />
        }}
      />
      <Tab.Screen
        name="DexHome"
        component={DexHomeScreen}
        options={{
          title: "図鑑",
          tabBarIcon: ({ color, size, focused }) => <TabEmojiIcon emoji="📖" color={color} size={size} focused={focused} />
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          title: "スキャン",
          tabBarIcon: ({ color, size, focused }) => (
            <TabEmojiIcon emoji="📷" color={color} size={size} focused={focused} primary />
          )
        }}
      />
      <Tab.Screen
        name="MyPage"
        component={MyPageScreen}
        options={{
          title: "マイページ",
          tabBarIcon: ({ color, size, focused }) => <TabEmojiIcon emoji="🏅" color={color} size={size} focused={focused} />
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: "設定",
          tabBarIcon: ({ color, size, focused }) => <TabEmojiIcon emoji="⚙️" color={color} size={size} focused={focused} />
        }}
      />
    </Tab.Navigator>
  );
};

export default function App() {
  const monstersHydrated = useMonsterStore((state) => state.hydrated);
  const settingsHydrated = useSettingsStore((state) => state.hydrated);
  const profileHydrated = useProfileStore((state) => state.hydrated);
  const onboarded = useProfileStore((state) => state.profile?.onboarded ?? false);
  const selectedInitialWorldGroup = useMonsterStore((state) => state.economy.unlocks.selectedInitialWorldGroup);
  const hydrateMonsters = useMonsterStore((state) => state.hydrate);
  const hydrateSettings = useSettingsStore((state) => state.hydrate);
  const hydrateProfile = useProfileStore((state) => state.hydrate);

  useEffect(() => {
    void Promise.all([hydrateMonsters(), hydrateSettings(), hydrateProfile()]);
  }, [hydrateMonsters, hydrateSettings, hydrateProfile]);

  const hydrated = monstersHydrated && settingsHydrated && profileHydrated;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {hydrated && !onboarded ? <LoginScreen /> : null}
      {hydrated && onboarded && !selectedInitialWorldGroup ? <InitialWorldScreen /> : null}
      {hydrated && onboarded && selectedInitialWorldGroup ? (
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={({ navigation }) => ({
              headerTitleStyle: styles.headerTitle,
              headerTintColor: "#071B46",
              headerBackTitle: "戻る",
              headerBackVisible: false,
              headerLeft: () => <BackButton navigation={navigation as any} />,
              contentStyle: { backgroundColor: "#F7FAFF" }
            })}
          >
            <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
            <Stack.Screen name="SummonResult" component={SummonResultScreen} options={{ title: "発見結果" }} />
            <Stack.Screen name="MonsterDetail" component={MonsterDetailScreen} options={{ title: "キャラ詳細" }} />
            <Stack.Screen name="Collection" component={CollectionScreen} options={{ title: "コレクション（準備中）" }} />
            <Stack.Screen name="WorldDex" component={WorldDexScreen} options={{ title: "ワールド図鑑" }} />
            <Stack.Screen name="HabitatUnlock" component={HabitatUnlockScreen} options={{ title: "カテゴリ解放" }} />
            <Stack.Screen name="Titles" component={TitlesScreen} options={{ title: "称号" }} />
            <Stack.Screen name="Research" component={ResearchScreen} options={{ title: "研究（準備中）" }} />
            <Stack.Screen name="RegionSettings" component={RegionSettingsScreen} options={{ title: "地域設定" }} />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "設定" }} />
            <Stack.Screen name="FriendInvite" component={FriendInviteScreen} options={{ title: "フレンド・招待" }} />
            <Stack.Screen name="FriendQrScan" component={FriendQrScanScreen} options={{ title: "フレンドQR" }} />
            <Stack.Screen name="FriendDex" component={FriendDexScreen} options={{ title: "フレンド図鑑" }} />
          </Stack.Navigator>
        </NavigationContainer>
      ) : null}
      {!hydrated ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#2FA84F" size="large" />
          <Text style={styles.loadingText}>WORLDAWNを起動しています…</Text>
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F7FAFF"
  },
  loadingText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "800"
  },
  tabBar: {
    minHeight: 78,
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderTopColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#071B46",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 }
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2
  },
  tabIcon: {
    textAlign: "center",
    lineHeight: 26
  },
  scanIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    backgroundColor: "#38B64B",
    borderWidth: 5,
    borderColor: "#EAF7ED",
    shadowColor: "#2FA84F",
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  scanIconFocused: {
    backgroundColor: "#249C41"
  },
  scanIconText: {
    color: "#FFFFFF",
    fontWeight: "900",
    lineHeight: 32
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900"
  }
});
