import { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ListRenderItem
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { LockKeyhole } from "../components/icons";
import { MonsterAvatar } from "../components/MonsterAvatar";
import type { CatalogCharacter } from "../data/characterCatalog.generated";
import type { WorldGroup } from "../types/worlds";
import { getWorldDexView, getWorldTabs, monstersByCatalogId } from "../services/worldDex";
import type { WorldDexEntry } from "../services/worldDex";
import { effectiveUnlockedWorldGroups } from "../services/worldAccess";
import { useMonsterStore } from "../stores/monsterStore";

const screenWidth = Dimensions.get("window").width;
const GAP = 10;
const CARD_WIDTH = Math.floor((screenWidth - 36 - GAP * 2) / 3);

export const WorldDexScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((state) => state.monsters);
  const persistedWorlds = useMonsterStore((state) => state.economy.unlocks.unlockedWorldGroups);
  const unlockedWorlds = useMemo(() => effectiveUnlockedWorldGroups(persistedWorlds), [persistedWorlds]);
  const tabs = useMemo(() => getWorldTabs(), []);
  const [selected, setSelected] = useState<WorldGroup>(tabs.find((t) => t.initialRelease)?.key ?? tabs[0]!.key);

  const view = useMemo(
    () => getWorldDexView(selected, monsters, unlockedWorlds),
    [selected, monsters, unlockedWorlds]
  );
  const ownedMap = useMemo(() => monstersByCatalogId(monsters), [monsters]);

  const renderCard: ListRenderItem<WorldDexEntry<CatalogCharacter>> = useCallback(
    ({ item: { entry, owned } }) => {
      const ownedMonster = owned ? ownedMap.get(entry.id) : undefined;
      const canPress = owned;
      return (
        <Pressable
          disabled={!canPress}
          onPress={() =>
            ownedMonster
              ? navigation.navigate("MonsterDetail", { monsterId: ownedMonster.id })
              : owned && navigation.navigate("MonsterDetail", { catalogId: entry.id })
          }
          style={({ pressed }) => [styles.card, { width: CARD_WIDTH }, !owned && styles.cardLocked, pressed && canPress && styles.pressed]}
        >
          <Text numberOfLines={1} style={styles.cardNo}>
            {String(entry.no).padStart(3, "0")}
          </Text>
          <View style={[styles.avatarWrap, !owned && styles.avatarHidden]}>
            {entry.hasImage ? (
              <MonsterAvatar imageKey={entry.id} size={CARD_WIDTH - 20} thumb showRarity={false} showElementFrame={false} backgroundColor="#F1F5F9" />
            ) : (
              <View style={[styles.placeholder, { width: CARD_WIDTH - 20, height: CARD_WIDTH - 20 }]}>
                <Text style={styles.placeholderMark}>？</Text>
              </View>
            )}
          </View>
          <Text numberOfLines={1} style={styles.cardName}>
            {owned ? entry.name : entry.hasImage ? "？？？" : "？？？（近日）"}
          </Text>
          <Text numberOfLines={1} style={styles.cardSpecies}>
            {owned ? entry.speciesJa : ""}
          </Text>
        </Pressable>
      );
    },
    [navigation, ownedMap]
  );

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.header}>
        <Text style={styles.title}>ワールド図鑑</Text>
        <Text style={styles.progress}>
          <Text style={styles.progressStrong}>{view.progress.discovered}</Text> / {view.progress.total} 発見
          <Text style={styles.progressSub}>（画像実装 {view.progress.imageReady}）</Text>
        </Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
        {tabs.map((tab) => {
          const active = tab.key === selected;
          const locked = !unlockedWorlds.includes(tab.key);
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="button"
              onPress={() => setSelected(tab.key)}
              style={[styles.tab, active && styles.tabActive, locked && styles.tabLocked]}
            >
              {locked ? <LockKeyhole color={active ? "#FFFFFF" : "#94A3B8"} size={13} strokeWidth={2.6} /> : null}
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {!view.unlocked ? (
        <View style={styles.lockedBanner}>
          <Text style={styles.lockedBannerText}>この世界はまだ解放されていません（今後のアップデートで登場）。</Text>
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View>
      {view.rares.length > 0 ? (
        <View style={styles.rareSection}>
          <Text style={styles.rareTitle}>この世界のレア（{view.rares.filter((r) => r.owned).length} / {view.rares.length}）</Text>
          <View style={styles.grid}>
            {view.rares.map(({ entry, owned }) => {
              const ownedMonster = owned ? ownedMap.get(entry.id) : undefined;
              return (
                <Pressable
                  key={entry.id}
                  disabled={!owned}
                  onPress={() =>
                    ownedMonster
                      ? navigation.navigate("MonsterDetail", { monsterId: ownedMonster.id })
                      : owned && navigation.navigate("MonsterDetail", { catalogId: entry.id })
                  }
                  style={[styles.card, styles.rareCard, { width: CARD_WIDTH }, !owned && styles.cardLocked]}
                >
                  <View style={[styles.avatarWrap, !owned && styles.avatarHidden]}>
                    {entry.hasImage ? (
                      <MonsterAvatar imageKey={entry.id} size={CARD_WIDTH - 20} thumb showRarity={false} showElementFrame={false} backgroundColor="#FEF3C7" />
                    ) : (
                      <View style={[styles.placeholder, { width: CARD_WIDTH - 20, height: CARD_WIDTH - 20 }]}>
                        <Text style={styles.placeholderMark}>？</Text>
                      </View>
                    )}
                  </View>
                  <Text numberOfLines={1} style={styles.cardName}>{owned ? entry.name : "？？？"}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      <Text style={styles.note}>※ 発見できるのは画像実装済みのキャラです。未実装枠は今後追加されます。</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={view.normals}
        keyExtractor={(item) => item.entry.id}
        renderItem={renderCard}
        numColumns={3}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        extraData={ownedMap}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FAFF" },
  content: { padding: 18, paddingBottom: 36 },
  headerBlock: { gap: 14, marginBottom: 14 },
  columnWrap: { gap: GAP, marginBottom: GAP },
  header: { alignItems: "center", gap: 4 },
  title: { color: "#071B46", fontSize: 30, fontWeight: "900" },
  progress: { color: "#52627A", fontSize: 15, fontWeight: "900" },
  progressStrong: { color: "#2FA84F" },
  progressSub: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  tabRow: { gap: 8, paddingRight: 18 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA",
    justifyContent: "center"
  },
  tabActive: { backgroundColor: "#2FA84F", borderColor: "#2FA84F" },
  tabLocked: { opacity: 0.7 },
  tabText: { color: "#071B46", fontSize: 14, fontWeight: "900" },
  tabTextActive: { color: "#FFFFFF" },
  lockedBanner: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  lockedBannerText: { color: "#64748B", fontSize: 13, fontWeight: "800" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    minHeight: 150,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: "#D7E0EA",
    alignItems: "center",
    gap: 2
  },
  rareCard: { borderColor: "#FCD34D", backgroundColor: "#FFFBEB" },
  cardLocked: { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  cardNo: { color: "#94A3B8", fontSize: 11, fontWeight: "900", alignSelf: "flex-start" },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  avatarHidden: { opacity: 0.22 },
  placeholder: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0"
  },
  placeholderMark: { color: "#94A3B8", fontSize: 28, fontWeight: "900" },
  cardName: { color: "#071B46", fontSize: 12, fontWeight: "900", marginTop: 2 },
  cardSpecies: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  rareSection: { gap: 10, marginTop: 4 },
  rareTitle: { color: "#B45309", fontSize: 16, fontWeight: "900" },
  note: { color: "#94A3B8", fontSize: 12, fontWeight: "800", textAlign: "center", marginTop: 14 }
});
