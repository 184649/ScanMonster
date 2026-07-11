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
import type { CatalogCharacter, CatalogRare } from "../data/characterCatalog.generated";
import { effectiveUnlockedWorldGroups } from "../services/worldAccess";
import { getWorldDexView, getWorldTabs, monstersByCatalogId, type WorldDexEntry } from "../services/worldDex";
import { useMonsterStore } from "../stores/monsterStore";
import type { WorldGroup } from "../types/worlds";

const screenWidth = Dimensions.get("window").width;
const GAP = 10;
const HORIZONTAL_PADDING = 18;
const CARD_WIDTH = Math.floor((screenWidth - HORIZONTAL_PADDING * 2 - GAP * 2) / 3);

type DexCardEntry = CatalogCharacter | CatalogRare;

const isRareEntry = (entry: DexCardEntry): entry is CatalogRare => !("status" in entry);

const MysterySilhouette = ({ size }: { size: number }) => (
  <View style={[styles.mysteryRoot, { width: size, height: size }]}>
    <View style={styles.mysteryGlow} />
    <View style={styles.mysteryTail} />
    <View style={styles.mysteryBody} />
    <View style={styles.mysteryHead}>
      <View style={styles.mysteryEarLeft} />
      <View style={styles.mysteryEarRight} />
    </View>
    <View style={styles.mysteryFootLeft} />
    <View style={styles.mysteryFootRight} />
    <Text style={styles.mysteryMark}>?</Text>
  </View>
);

export const WorldDexScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((state) => state.monsters);
  const persistedWorlds = useMonsterStore((state) => state.economy.unlocks.unlockedWorldGroups);
  const unlockedWorlds = useMemo(() => effectiveUnlockedWorldGroups(persistedWorlds), [persistedWorlds]);
  const tabs = useMemo(() => getWorldTabs(), []);
  const [selected, setSelected] = useState<WorldGroup>(tabs.find((tab) => tab.initialRelease)?.key ?? tabs[0]!.key);

  const view = useMemo(() => getWorldDexView(selected, monsters, unlockedWorlds), [selected, monsters, unlockedWorlds]);
  const ownedMap = useMemo(() => monstersByCatalogId(monsters), [monsters]);

  const renderDexCard = useCallback(
    ({ entry, owned }: WorldDexEntry<DexCardEntry>) => {
      const ownedMonster = owned ? ownedMap.get(entry.id) : undefined;
      const canPress = owned && entry.hasImage;
      const title = !entry.hasImage ? "準備中" : owned ? entry.name : "???";
      const subtitle = !entry.hasImage ? "" : owned ? entry.speciesJa : "";

      return (
        <Pressable
          disabled={!canPress}
          onPress={() => ownedMonster && navigation.navigate("MonsterDetail", { monsterId: ownedMonster.id })}
          style={({ pressed }) => [
            styles.card,
            isRareEntry(entry) && styles.rareCard,
            { width: CARD_WIDTH },
            !owned && styles.cardLocked,
            !entry.hasImage && styles.cardPreparing,
            pressed && canPress && styles.pressed
          ]}
        >
          <Text numberOfLines={1} style={styles.cardNo}>
            {String(entry.no).padStart(3, "0")}
          </Text>

          {entry.hasImage && owned ? (
            <View style={styles.avatarWrap}>
              <MonsterAvatar
                imageKey={entry.id}
                size={CARD_WIDTH - 20}
                thumb
                showRarity={false}
                showElementFrame={false}
                backgroundColor={isRareEntry(entry) ? "#FEF3C7" : "#F1F5F9"}
              />
            </View>
          ) : entry.hasImage ? (
            <MysterySilhouette size={CARD_WIDTH - 20} />
          ) : (
            <View style={[styles.placeholder, { width: CARD_WIDTH - 20, height: CARD_WIDTH - 20 }]}>
              <Text style={styles.placeholderMark}>準備中</Text>
            </View>
          )}

          <Text numberOfLines={1} style={styles.cardName}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.cardSpecies}>
            {subtitle}
          </Text>
        </Pressable>
      );
    },
    [navigation, ownedMap]
  );

  const renderCard: ListRenderItem<WorldDexEntry<CatalogCharacter>> = useCallback(
    ({ item }) => renderDexCard(item),
    [renderDexCard]
  );

  const fixedHeader = (
    <View style={styles.fixedHeader}>
      <View style={styles.header}>
        <Text style={styles.title}>ワールド図鑑</Text>
        <Text style={styles.progress}>
          <Text style={styles.progressStrong}>{view.progress.discovered}</Text> / {view.progress.total} 発見
          <Text style={styles.progressSub}>  画像準備済み {view.progress.imageReady}</Text>
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
          <Text style={styles.lockedBannerText}>このワールドは未解放です。図鑑の確認はできますが、スキャン出現は解放後です。</Text>
        </View>
      ) : null}
    </View>
  );

  const footer = (
    <View>
      {view.rares.length > 0 ? (
        <View style={styles.rareSection}>
          <Text style={styles.rareTitle}>
            このワールドのレア {view.rares.filter((rare) => rare.owned).length} / {view.rares.length}
          </Text>
          <View style={styles.grid}>
            {view.rares.map((item) => (
              <View key={item.entry.id}>{renderDexCard(item)}</View>
            ))}
          </View>
        </View>
      ) : null}
      <Text style={styles.note}>未発見のキャラクターは共通シルエットで表示されます。発見するまで名前や姿は分かりません。</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {fixedHeader}
      <FlatList
        data={view.normals}
        keyExtractor={(item) => item.entry.id}
        renderItem={renderCard}
        numColumns={3}
        columnWrapperStyle={styles.columnWrap}
        contentContainerStyle={styles.content}
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
  fixedHeader: {
    gap: 12,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: "#F7FAFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0"
  },
  content: { paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 14, paddingBottom: 36 },
  columnWrap: { gap: GAP, marginBottom: GAP },
  header: { alignItems: "center", gap: 4 },
  title: { color: "#071B46", fontSize: 30, fontWeight: "900" },
  progress: { color: "#52627A", fontSize: 15, fontWeight: "900" },
  progressStrong: { color: "#2FA84F" },
  progressSub: { color: "#94A3B8", fontSize: 12, fontWeight: "800" },
  tabRow: { gap: 8, paddingRight: HORIZONTAL_PADDING },
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
  lockedBannerText: { color: "#64748B", fontSize: 13, fontWeight: "800", lineHeight: 18 },
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
  cardPreparing: { backgroundColor: "#F8FAFC", borderStyle: "dashed" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  cardNo: { color: "#94A3B8", fontSize: 11, fontWeight: "900", alignSelf: "flex-start" },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  mysteryRoot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "#E2E8F0"
  },
  mysteryGlow: {
    position: "absolute",
    width: "82%",
    height: "82%",
    borderRadius: 999,
    backgroundColor: "#CBD5E1"
  },
  mysteryBody: {
    position: "absolute",
    bottom: "23%",
    left: "23%",
    width: "54%",
    height: "34%",
    borderRadius: 999,
    backgroundColor: "#334155"
  },
  mysteryHead: {
    position: "absolute",
    top: "28%",
    right: "20%",
    width: "32%",
    height: "32%",
    borderRadius: 999,
    backgroundColor: "#334155"
  },
  mysteryEarLeft: {
    position: "absolute",
    top: "-16%",
    left: "16%",
    width: "28%",
    height: "28%",
    borderRadius: 999,
    backgroundColor: "#334155",
    transform: [{ rotate: "-18deg" }]
  },
  mysteryEarRight: {
    position: "absolute",
    top: "-14%",
    right: "10%",
    width: "24%",
    height: "24%",
    borderRadius: 999,
    backgroundColor: "#334155",
    transform: [{ rotate: "18deg" }]
  },
  mysteryTail: {
    position: "absolute",
    left: "15%",
    bottom: "39%",
    width: "24%",
    height: "11%",
    borderRadius: 999,
    backgroundColor: "#334155",
    transform: [{ rotate: "-28deg" }]
  },
  mysteryFootLeft: {
    position: "absolute",
    left: "34%",
    bottom: "20%",
    width: "13%",
    height: "10%",
    borderRadius: 999,
    backgroundColor: "#334155"
  },
  mysteryFootRight: {
    position: "absolute",
    right: "30%",
    bottom: "20%",
    width: "13%",
    height: "10%",
    borderRadius: 999,
    backgroundColor: "#334155"
  },
  mysteryMark: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "900"
  },
  placeholder: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2E8F0",
    paddingHorizontal: 6
  },
  placeholderMark: { color: "#64748B", fontSize: 13, fontWeight: "900", textAlign: "center" },
  cardName: { color: "#071B46", fontSize: 12, fontWeight: "900", marginTop: 2 },
  cardSpecies: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  rareSection: { gap: 10, marginTop: 8 },
  rareTitle: { color: "#B45309", fontSize: 16, fontWeight: "900" },
  note: { color: "#94A3B8", fontSize: 12, fontWeight: "800", textAlign: "center", marginTop: 14, lineHeight: 18 }
});
