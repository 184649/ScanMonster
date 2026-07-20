import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { DexProgressBar } from "../components/dex/DexProgressBar";
import type { CatalogCharacter, CatalogRare, DexClass } from "../data/characterCatalog.generated";
import {
  getDexPresentation,
  dexProgressOf,
  completionCelebrationOf,
  shouldCelebrateWorldComplete
} from "../services/dexPresentation.core";
import { CompletionCelebrationCard } from "../components/dex/CompletionCelebrationCard";
import { buildWorldCompleteShareText } from "../services/shareText.core";
import { buildWorldCompleteCard, shareHeadlineFor } from "../services/shareCard.core";
import { playSound } from "../services/soundService";
import { effectiveUnlockedWorldGroups } from "../services/worldAccess";
import { getWorldDexView, getWorldTabs, monstersByCatalogId, type WorldDexEntry } from "../services/worldDex";
import { useMonsterStore } from "../stores/monsterStore";
import type { WorldGroup } from "../types/worlds";
import { colors } from "../theme";

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

  // ワールド完成演出。完成した瞬間に一度だけ出す（タブを戻っても再表示しない）。
  const progress = useMemo(
    () => dexProgressOf(view.progress.discovered, view.progress.imageReady),
    [view.progress.discovered, view.progress.imageReady]
  );
  const celebratedRef = useRef<Set<string>>(new Set());
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => {
    if (!shouldCelebrateWorldComplete(progress, selected, celebratedRef.current)) return;
    celebratedRef.current.add(selected);
    setCelebrating(true);
    playSound("dex_complete");
  }, [progress, selected]);

  const worldLabel = tabs.find((t) => t.key === selected)?.label ?? "";
  const celebration = progress.isComplete ? completionCelebrationOf("world", worldLabel) : undefined;
  // 記念カードに並べる代表生物（発見済み・画像ありのものから先頭8件）。
  const representativeIds = useMemo(
    () => view.normals.filter((n) => n.owned && n.entry.hasImage).map((n) => n.entry.id),
    [view.normals]
  );
  // ワールド完成カード：代表4体を並べた記念カードを自動生成する。
  const worldCompleteCard = progress.isComplete
    ? buildWorldCompleteCard({
        worldLabel,
        representatives: view.normals
          .filter((n) => n.owned && n.entry.hasImage)
          .slice(0, 4)
          .map((n) => ({
            id: n.entry.id,
            name: n.entry.name,
            dexClass: (n.entry.dexClass ?? "NORMAL") as DexClass
          })),
        totalDiscovered: progress.total,
        completedAt: new Date().toISOString()
      })
    : undefined;

  const renderDexCard = useCallback(
    ({ entry, owned }: WorldDexEntry<DexCardEntry>) => {
      const ownedMonster = owned ? ownedMap.get(entry.id) : undefined;
      const canPress = owned && entry.hasImage;
      const title = !entry.hasImage ? "準備中" : owned ? entry.name : "???";
      const subtitle = !entry.hasImage ? "" : owned ? entry.speciesJa : "";
      // 一覧の統一カード：枠色・背景は図鑑分類で決める（画像側にレア演出を焼き込まない）。
      // 未発見のあいだは分類を漏らさないため、既定（NORMAL）の見た目にする。
      const presentation = getDexPresentation((owned ? entry.dexClass : "NORMAL") as DexClass);

      return (
        <Pressable
          disabled={!canPress}
          onPress={() => ownedMonster && navigation.navigate("MonsterDetail", { monsterId: ownedMonster.id })}
          style={({ pressed }) => [
            styles.card,
            { width: CARD_WIDTH },
            owned && {
              borderColor: presentation.frameColor,
              backgroundColor: presentation.backgroundColor,
              borderWidth: presentation.frameWidth
            },
            !owned && styles.cardLocked,
            !entry.hasImage && styles.cardPreparing,
            pressed && canPress && styles.pressed
          ]}
        >
          {/* カード内側の subtle glow。イラストの上には重ねない（枠の内側だけ）。 */}
          {owned && presentation.hasInnerGlow ? (
            <View pointerEvents="none" style={[styles.innerGlow, { borderColor: presentation.glowColor }]} />
          ) : null}

          <View style={styles.cardTopRow}>
            <Text numberOfLines={1} style={styles.cardNo}>
              {String(entry.no).padStart(3, "0")}
            </Text>
            {owned && presentation.rarityTag ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.cardBadge,
                  { color: presentation.badgeTextColor, backgroundColor: presentation.badgeBackgroundColor }
                ]}
              >
                {presentation.rarityTag}
              </Text>
            ) : null}
          </View>

          {entry.hasImage && owned ? (
            <View style={styles.avatarWrap}>
              <MonsterAvatar
                imageKey={entry.id}
                size={CARD_WIDTH - 20}
                thumb
                showRarity={false}
                showElementFrame={false}
                backgroundColor={colors.borderFaint}
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
        {/* 完成率を可視化して「あと何種か」を常に見せる。母数は画像準備済みの種。 */}
        <DexProgressBar progress={progress} />
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
              {locked ? <LockKeyhole color={active ? "#FFFFFF" : colors.textFaint} size={13} strokeWidth={2.6} /> : null}
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
      <Text style={styles.note}>未発見の生きものは共通シルエットで表示されます。発見するまで名前や姿は分かりません。</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <CompletionCelebrationCard
        visible={celebrating}
        celebration={celebration}
        representativeIds={representativeIds}
        shareCard={worldCompleteCard}
        shareMessage={
          worldCompleteCard
            ? `${shareHeadlineFor(worldCompleteCard)}
${buildWorldCompleteShareText(worldLabel, progress.total)}`
            : undefined
        }
        onClose={() => setCelebrating(false)}
      />
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
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  fixedHeader: {
    gap: 12,
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.screenBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  content: { paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 14, paddingBottom: 36 },
  columnWrap: { gap: GAP, marginBottom: GAP },
  header: { alignItems: "center", gap: 4 },
  title: { color: colors.navy, fontSize: 30, fontWeight: "900" },
  progress: { color: colors.textSlate, fontSize: 15, fontWeight: "900" },
  progressStrong: { color: colors.success },
  progressSub: { color: colors.textFaint, fontSize: 12, fontWeight: "800" },
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
    borderColor: colors.border,
    justifyContent: "center"
  },
  tabActive: { backgroundColor: colors.success, borderColor: colors.success },
  tabLocked: { opacity: 0.7 },
  tabText: { color: colors.navy, fontSize: 14, fontWeight: "900" },
  tabTextActive: { color: "#FFFFFF" },
  lockedBanner: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.borderFaint,
    borderWidth: 1,
    borderColor: colors.border
  },
  lockedBannerText: { color: colors.textMuted, fontSize: 13, fontWeight: "800", lineHeight: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  card: {
    minHeight: 150,
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    borderColor: colors.border,
    alignItems: "center",
    gap: 2
  },
  rareCard: { borderColor: colors.accentGold, backgroundColor: colors.accentGoldSoft },
  cardLocked: { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
  cardPreparing: { backgroundColor: colors.surfaceMuted, borderStyle: "dashed" },
  pressed: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  innerGlow: {
    position: "absolute",
    top: 3,
    left: 3,
    right: 3,
    bottom: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    opacity: 0.55
  },
  cardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  cardNo: { color: colors.textFaint, fontSize: 11, fontWeight: "900" },
  cardBadge: {
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
    overflow: "hidden",
    flexShrink: 1
  },
  avatarWrap: { alignItems: "center", justifyContent: "center" },
  mysteryRoot: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: colors.border
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
    backgroundColor: colors.textBody
  },
  mysteryHead: {
    position: "absolute",
    top: "28%",
    right: "20%",
    width: "32%",
    height: "32%",
    borderRadius: 999,
    backgroundColor: colors.textBody
  },
  mysteryEarLeft: {
    position: "absolute",
    top: "-16%",
    left: "16%",
    width: "28%",
    height: "28%",
    borderRadius: 999,
    backgroundColor: colors.textBody,
    transform: [{ rotate: "-18deg" }]
  },
  mysteryEarRight: {
    position: "absolute",
    top: "-14%",
    right: "10%",
    width: "24%",
    height: "24%",
    borderRadius: 999,
    backgroundColor: colors.textBody,
    transform: [{ rotate: "18deg" }]
  },
  mysteryTail: {
    position: "absolute",
    left: "15%",
    bottom: "39%",
    width: "24%",
    height: "11%",
    borderRadius: 999,
    backgroundColor: colors.textBody,
    transform: [{ rotate: "-28deg" }]
  },
  mysteryFootLeft: {
    position: "absolute",
    left: "34%",
    bottom: "20%",
    width: "13%",
    height: "10%",
    borderRadius: 999,
    backgroundColor: colors.textBody
  },
  mysteryFootRight: {
    position: "absolute",
    right: "30%",
    bottom: "20%",
    width: "13%",
    height: "10%",
    borderRadius: 999,
    backgroundColor: colors.textBody
  },
  mysteryMark: {
    color: colors.surfaceMuted,
    fontSize: 32,
    fontWeight: "900"
  },
  placeholder: {
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border,
    paddingHorizontal: 6
  },
  placeholderMark: { color: colors.textMuted, fontSize: 13, fontWeight: "900", textAlign: "center" },
  cardName: { color: colors.navy, fontSize: 12, fontWeight: "900", marginTop: 2 },
  cardSpecies: { color: colors.textMuted, fontSize: 10, fontWeight: "800" },
  rareSection: { gap: 10, marginTop: 8 },
  rareTitle: { color: "#B45309", fontSize: 16, fontWeight: "900" },
  note: { color: colors.textFaint, fontSize: 12, fontWeight: "800", textAlign: "center", marginTop: 14, lineHeight: 18 }
});
