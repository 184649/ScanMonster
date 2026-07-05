import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { DP_ABBR, formatDP } from "../data/economy";
import { WORLD_GROUP_SHORT_LABELS } from "../data/worlds";
import { getTitleById } from "../data/titles";
import { createDexSummary } from "../services/dexService";
import { useMonsterStore } from "../stores/monsterStore";
import { useProfileStore } from "../stores/profileStore";

export const MyPageScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useProfileStore((state) => state.profile);
  const monsters = useMonsterStore((state) => state.monsters);
  const histories = useMonsterStore((state) => state.scanHistories);
  const economy = useMonsterStore((state) => state.economy);
  const summary = createDexSummary(monsters, histories);
  const activeTitle = economy.titles.activeTitleId ? getTitleById(economy.titles.activeTitleId) : undefined;
  const displayName = profile?.displayName?.trim() || "トレーナー";
  const exp = summary.discoveredFamilies * 120 + histories.length * 20;
  const trainerLevel = Math.max(1, Math.floor(exp / 1000) + 1);
  const unlockedWorlds = economy.unlocks.unlockedWorldGroups;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>マイページ</Text>
          <Text style={styles.title}>{displayName}</Text>
        </View>

        <View style={styles.profileCard}>
          <MonsterAvatar familyId={monsters[0]?.familyId ?? "fox"} size={76} showRarity={false} />
          <View style={styles.profileBody}>
            <Text numberOfLines={1} style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileMeta}>トレーナー Lv. {trainerLevel}</Text>
            <Text style={styles.profileMeta}>表示称号: {activeTitle?.name ?? "未設定"}</Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>所持{DP_ABBR}</Text>
            <Text style={styles.statValue}>{formatDP(economy.dpBalance)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>獲得称号</Text>
            <Text style={styles.statValue}>{economy.titles.unlockedTitleIds.length}</Text>
          </View>
        </View>

        <View style={styles.dexRow}>
          <View style={styles.dexBox}>
            <Text style={styles.dexValue}>{summary.discoveredFamilies}/{summary.totalFamilies}</Text>
            <Text style={styles.dexLabel}>図鑑</Text>
          </View>
          <View style={styles.dexBox}>
            <Text style={styles.dexValue}>{histories.length}</Text>
            <Text style={styles.dexLabel}>スキャン</Text>
          </View>
          <View style={styles.dexBox}>
            <Text style={styles.dexValue}>{summary.rareMonsters}</Text>
            <Text style={styles.dexLabel}>レア</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>解放済みワールド</Text>
          <Text style={styles.panelText}>
            {unlockedWorlds.map((world) => WORLD_GROUP_SHORT_LABELS[world]).join("・") || "未選択"}
          </Text>
          <PrimaryButton label="ワールド解放・ブースト" onPress={() => navigation.navigate("HabitatUnlock")} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>称号</Text>
          <Text style={styles.panelText}>称号はプレイ実績と自己表現のための機能です。強さやレア確率には影響しません。</Text>
          <PrimaryButton label="称号を見る" onPress={() => navigation.navigate("Titles")} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>設定</Text>
          <Text style={styles.panelText}>データリセット、デバッグ表示、プライバシー方針を確認できます。</Text>
          <PrimaryButton label="設定を開く" variant="secondary" onPress={() => navigation.navigate("Settings")} />
        </View>

        <View style={styles.privacyCard}>
          <Text style={styles.sectionTitle}>プライバシー</Text>
          <Text style={styles.privacyText}>
            生のバーコード値やQR内容は保存しません。同日同コード制限は sourceHash とローカル日付で行います。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFF"
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36
  },
  header: {
    gap: 4
  },
  kicker: {
    color: "#2FA84F",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#071B46",
    fontSize: 30,
    fontWeight: "900"
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA"
  },
  profileBody: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  profileName: {
    color: "#071B46",
    fontSize: 21,
    fontWeight: "900"
  },
  profileMeta: {
    color: "#52627A",
    fontSize: 13,
    fontWeight: "800"
  },
  statRow: {
    flexDirection: "row",
    gap: 12
  },
  statBox: {
    flex: 1,
    gap: 4,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  statLabel: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900"
  },
  statValue: {
    color: "#071B46",
    fontSize: 22,
    fontWeight: "900"
  },
  dexRow: {
    flexDirection: "row",
    gap: 10
  },
  dexBox: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    borderRadius: 12,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  dexValue: {
    color: "#071B46",
    fontSize: 20,
    fontWeight: "900"
  },
  dexLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  panel: {
    gap: 10,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  sectionTitle: {
    color: "#071B46",
    fontSize: 18,
    fontWeight: "900"
  },
  panelText: {
    color: "#52627A",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  privacyCard: {
    gap: 8,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  privacyText: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  }
});
