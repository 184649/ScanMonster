import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import {
  INITIAL_WORLD_GROUPS,
  WORLD_GROUP_LABELS,
  WORLD_GROUP_SHORT_LABELS
} from "../data/worlds";
import { getCharacterIdForMonster } from "../data/characters";
import { createDexSummary } from "../services/dexService";
import { useMonsterStore } from "../stores/monsterStore";
import type { WorldGroup } from "../types/worlds";

const countByWorldGroup = (monsters: ReturnType<typeof useMonsterStore.getState>["monsters"], world: WorldGroup) =>
  new Set(
    monsters.filter((monster) => monster.worldGroup === world).map(getCharacterIdForMonster)
  ).size;

export const DexHomeScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((state) => state.monsters);
  const histories = useMonsterStore((state) => state.scanHistories);
  const economy = useMonsterStore((state) => state.economy);
  const summary = createDexSummary(monsters, histories);
  const unlocked = economy.unlocks.unlockedWorldGroups;
  const discoveredRares = new Set(
    monsters
      .filter((monster) => monster.characterRarity === "rare" || monster.rareId)
      .map((monster) => monster.characterId ?? monster.imageKey)
  ).size;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>発見の記録</Text>
          <Text style={styles.title}>図鑑</Text>
          <Text style={styles.subtitle}>初回リリースはワールド図鑑に集約します。カテゴリ図鑑や個体差コレクションは使いません。</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate("WorldDex")}
          style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
        >
          <View style={styles.heroText}>
            <Text style={styles.heroTitle}>ワールド図鑑</Text>
            <Text style={styles.heroValue}>{new Set(monsters.map((m) => m.characterId ?? m.imageKey)).size} 種発見</Text>
            <Text style={styles.heroBody}>地上・水辺・空・虫のワールド別に、発見済み・未発見を確認できます。</Text>
          </View>
          {monsters[0] ? (
            <MonsterAvatar monster={monsters[0]} size={118} showRarity={false} />
          ) : (
            <MonsterAvatar familyId="rabbit" size={118} showRarity={false} />
          )}
        </Pressable>

        <View style={styles.grid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("WorldDex")}
            style={({ pressed }) => [styles.smallCard, styles.rareCard, pressed && styles.pressed]}
          >
            <Text style={styles.cardEmoji}>✨</Text>
            <Text style={styles.cardTitle}>レア</Text>
            <Text style={styles.cardValue}>{discoveredRares}</Text>
            <Text style={styles.cardBody}>レアはワールド図鑑で確認できます。確率1〜3%、DPでは上がりません。</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("HabitatUnlock")}
            style={({ pressed }) => [styles.smallCard, styles.unlockCard, pressed && styles.pressed]}
          >
            <Text style={styles.cardEmoji}>🗝️</Text>
            <Text style={styles.cardTitle}>解放ワールド</Text>
            <Text style={styles.cardValue}>{unlocked.length} / 6</Text>
            <Text style={styles.cardBody}>DPで解放すると出現対象が増えます。</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>ワールド別の発見数</Text>
          {INITIAL_WORLD_GROUPS.map((world) => {
            const isUnlocked = unlocked.includes(world);
            return (
              <View key={world} style={styles.habitatRow}>
                <View style={styles.habitatNameBlock}>
                  <Text style={styles.habitatName}>{WORLD_GROUP_LABELS[world]}</Text>
                  <Text style={styles.habitatState}>{isUnlocked ? "解放済み" : "未解放"}</Text>
                </View>
                <Text style={styles.habitatCount}>{countByWorldGroup(monsters, world)} 種</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>解放済みワールド</Text>
          <Text style={styles.body}>
            {unlocked.map((world) => WORLD_GROUP_SHORT_LABELS[world]).join("・") || "まだ選択されていません"}
          </Text>
          <PrimaryButton label="ワールド解放へ" onPress={() => navigation.navigate("HabitatUnlock")} />
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
    gap: 16,
    paddingBottom: 36
  },
  header: {
    gap: 6
  },
  kicker: {
    color: "#2FA84F",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center"
  },
  title: {
    color: "#071B46",
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: "#52627A",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    fontWeight: "700"
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BFE8C7"
  },
  heroText: {
    flex: 1,
    gap: 5
  },
  heroTitle: {
    color: "#166534",
    fontSize: 20,
    fontWeight: "900"
  },
  heroValue: {
    color: "#071B46",
    fontSize: 30,
    fontWeight: "900"
  },
  heroBody: {
    color: "#31533B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  grid: {
    flexDirection: "row",
    gap: 12
  },
  smallCard: {
    flex: 1,
    gap: 5,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1
  },
  rareCard: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE"
  },
  unlockCard: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D"
  },
  cardEmoji: {
    fontSize: 26
  },
  cardTitle: {
    color: "#071B46",
    fontSize: 16,
    fontWeight: "900"
  },
  cardValue: {
    color: "#071B46",
    fontSize: 22,
    fontWeight: "900"
  },
  cardBody: {
    color: "#52627A",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
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
  habitatRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEF2F7",
    paddingTop: 10
  },
  habitatNameBlock: {
    flex: 1,
    gap: 2
  },
  habitatName: {
    color: "#071B46",
    fontSize: 14,
    fontWeight: "900"
  },
  habitatState: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  habitatCount: {
    color: "#2FA84F",
    fontSize: 15,
    fontWeight: "900"
  },
  body: {
    color: "#52627A",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  }
});
