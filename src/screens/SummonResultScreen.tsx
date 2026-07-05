import { useState } from "react";
import { BookOpen, CheckCircle2, GalleryVerticalEnd, RotateCcw, Sparkles } from "../components/icons";
import { Share, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import { AwakeningReveal } from "../components/discovery/AwakeningReveal";
import { DiscoveryRewardSummary } from "../components/discovery/DiscoveryRewardSummary";
import { APP_INFO } from "../constants/appInfo";
import { WORLD_GROUP_LABELS } from "../data/worlds";
import { getCatalogDescriptionById } from "../data/catalogLookup";
import { HABITAT_GROUP_LABELS } from "../data/habitatGroups";
import { getCharacterRarityForMonster, getFamilyHabitatGroup } from "../data/characters";
import { getElementMeta, SEASON_LABELS, TIME_SLOT_LABELS } from "../data/elements";
import { getFamilyById, MONSTER_FAMILIES } from "../data/monsterFamilies";
import { getRareById } from "../data/rareMonsters";
import { MonsterAvatar } from "../components/MonsterAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { ShareCard } from "../components/ShareCard";
import { TagChip } from "../components/TagChip";
import { createDexSummary } from "../services/dexService";
import { getScanStreakView, type ScanStreakView } from "../services/economyService";
import { useMonsterStore } from "../stores/monsterStore";
import type { DiscoveryResultRef } from "../types/discovery";
import type { ScanSource, UserMonster } from "../types/monster";
import type { RootStackParamList } from "../types/navigation";
import { formatDateTime } from "../utils/dateUtils";
import { goBackOrHome } from "../utils/navigation";

const scanSourceLabel = (source: ScanSource): string => (source === "qr" ? "QRコード" : "バーコード");

const characterRarityLabel = {
  normal: "通常",
  rare: "レア",
  secret: "シークレット"
} as const;

const kindBadge = (kind: DiscoveryResultRef["kind"]): { label: string; color: string; soft: string } => {
  if (kind === "first") {
    return { label: "NEW発見！", color: "#B45309", soft: "#FEF3C7" };
  }
  if (kind === "rediscovery") {
    return { label: "再発見", color: "#166534", soft: "#DCFCE7" };
  }
  return { label: "今日は発見済み", color: "#475569", soft: "#E2E8F0" };
};

const StreakResultPanel = ({ streak }: { streak: ScanStreakView }) => {
  const isNewWeek = streak.achievedToday && streak.streakWeek > 1 && streak.weeklyStreakDay === 1;

  if (streak.achievedToday && streak.isSeventh) {
    return (
      <View style={[styles.streakPanel, styles.streakPanelGold]}>
        <Text style={styles.streakPanelBig}>7日連続達成！</Text>
        <Text style={styles.streakPanelText}>今週の連続発見ボーナス最大報酬</Text>
        <Text style={styles.streakPanelReward}>+{streak.todayReward} DP</Text>
      </View>
    );
  }

  if (isNewWeek) {
    return (
      <View style={styles.streakPanel}>
        <Text style={styles.streakPanelTitle}>新しい連続発見の週が始まりました</Text>
        <Text style={styles.streakPanelText}>今週の連続発見 {streak.weeklyStreakDay}日目</Text>
        <Text style={styles.streakPanelReward}>+{streak.todayReward} DP</Text>
      </View>
    );
  }

  return (
    <View style={styles.streakPanel}>
      <Text style={styles.streakPanelTitle}>今日の1スキャン +{streak.todayReward} DP</Text>
      <Text style={styles.streakPanelText}>今週の連続発見 {streak.weeklyStreakDay}日目</Text>
      <Text style={styles.streakPanelNext}>
        {streak.achievedToday
          ? streak.resetsAfterToday
            ? `明日から新しい連続発見の週（次回 +${streak.tomorrowReward} DP）`
            : `明日も発見すると +${streak.tomorrowReward} DP`
          : `今日発見すると ${streak.weeklyStreakDay}日目・${streak.todayReward} DP`}
      </Text>
    </View>
  );
};

export const SummonResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = route.params as RootStackParamList["SummonResult"];
  const refs = params?.results ?? [];
  const monsters = useMonsterStore((state) => state.monsters);
  const histories = useMonsterStore((state) => state.scanHistories);
  const economy = useMonsterStore((state) => state.economy);
  const toggleFavorite = useMonsterStore((state) => state.toggleFavorite);
  const getMonsterById = useMonsterStore((state) => state.getMonsterById);
  const summary = createDexSummary(monsters, histories);
  const streak = getScanStreakView(economy);
  const hasValidDiscovery = refs.some((ref) => ref.kind !== "duplicate");
  // 「目覚めの儀式」演出（単発発見の初回表示で1回だけ再生）。
  const [revealDone, setRevealDone] = useState(false);

  const shareMonster = (monster: UserMonster) => {
    const family = getFamilyById(monster.familyId);
    const rare = monster.rareId ? getRareById(monster.rareId) : undefined;
    const speciesLabel = rare ? `${family.name}のレア` : family.name;
    const rarity = characterRarityLabel[monster.characterRarity ?? getCharacterRarityForMonster(monster)];
    const message = [
      `${APP_INFO.name}で「${monster.displayName}」を発見！`,
      `${speciesLabel} / ${rarity}`,
      `図鑑 ${summary.discoveredFamilies}/${summary.totalFamilies}`,
      `${APP_INFO.tagline} ${APP_INFO.hashtag}`
    ].join("\n");

    void Share.share({ message });
  };

  const navActions = (
    <View style={styles.actions}>
      <PrimaryButton
        label="もう一度スキャン"
        icon={RotateCcw}
        onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })}
      />
      <PrimaryButton label="図鑑で見る" icon={BookOpen} variant="secondary" onPress={() => navigation.navigate("WorldDex")} />
      <PrimaryButton label="ホームへ" variant="ghost" onPress={() => goBackOrHome(navigation)} />
    </View>
  );

  if (refs.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>発見記録が見つかりません</Text>
          <PrimaryButton label="ホームへ" onPress={() => navigation.navigate("MainTabs", { screen: "Home" })} />
        </View>
      </SafeAreaView>
    );
  }

  if (refs.length === 1) {
    const ref = refs[0]!;

    if (ref.kind === "duplicate") {
      const family = getFamilyById(ref.duplicateFamilyId ?? MONSTER_FAMILIES[0]!.id);
      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.hero}>
              <MonsterAvatar familyId={family.id} size={150} showRarity={false} />
              <View style={[styles.resultBadge, { backgroundColor: "#E2E8F0" }]}>
                <Text style={[styles.resultBadgeText, { color: "#475569" }]}>発見済み</Text>
              </View>
              <Text style={styles.title}>今日はこのコードからは発見済み！</Text>
              <Text style={styles.subtitle}>
                同じコードから新しい発見ができるのは1日1回です。{"\n"}
                同日同コードではDPは付与されず、気配ブースト回数も減りません。{"\n"}
                また明日スキャンしてみよう。
              </Text>
            </View>
            <DiscoveryRewardSummary
              rewardLines={ref.dpBreakdown}
              totalEarned={ref.dpEarned}
              balanceAfter={ref.dpBalanceAfter}
            />
            {navActions}
          </ScrollView>
        </SafeAreaView>
      );
    }

    const monster = ref.monsterId ? getMonsterById(ref.monsterId) : undefined;

    if (!monster) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContent}>
            <Text style={styles.title}>発見記録が見つかりません</Text>
            <PrimaryButton label="ホームへ" onPress={() => navigation.navigate("MainTabs", { screen: "Home" })} />
          </View>
        </SafeAreaView>
      );
    }

    const family = getFamilyById(monster.familyId);
    const rare = monster.rareId ? getRareById(monster.rareId) : undefined;
    const primary = getElementMeta(monster.dna.primaryElement);
    const badge = kindBadge(ref.kind);
    const hasWorld = Boolean(monster.worldGroup);
    const catalogDescription = hasWorld
      ? getCatalogDescriptionById(monster.characterId ?? monster.imageKey)
      : undefined;
    const bioMemo = catalogDescription ?? (rare ? rare.loreMemo : family.biologicalMemo);
    const habitat = monster.habitatGroup ?? getFamilyHabitatGroup(monster.familyId);
    const rarity = monster.characterRarity ?? getCharacterRarityForMonster(monster);
    const worldLabel = monster.worldGroup ? WORLD_GROUP_LABELS[monster.worldGroup] : "";

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={[styles.resultBadge, { backgroundColor: badge.soft }]}>
              <CheckCircle2 color={badge.color} size={18} strokeWidth={2.4} />
              <Text style={[styles.resultBadgeText, { color: badge.color }]}>
                {badge.label}（{scanSourceLabel(ref.scanSource)}）
              </Text>
            </View>
            <View style={[styles.heroImage, { backgroundColor: primary.softColor }]}>
              <MonsterAvatar monster={monster} size={210} showRarity />
            </View>
            <Text style={styles.title}>{monster.displayName}</Text>
            <Text style={styles.species}>
              基礎生物：{monster.speciesJa ?? family.baseAnimalName}
              {hasWorld ? ` ・ ${worldLabel}` : ` ・ ${rare ? `${family.name}のレア` : family.name}`}
            </Text>
            <View style={styles.badgeRow}>
              <TagChip label={characterRarityLabel[rarity]} color="#FEF3C7" />
              <TagChip label={hasWorld ? worldLabel : HABITAT_GROUP_LABELS[habitat]} color="#F0FDF4" />
              <TagChip label={primary.label} color={primary.softColor} />
              {rare ? <TagChip label={rare.rareCategory} color="#EDE9FE" /> : null}
            </View>
          </View>

          <DiscoveryRewardSummary
            rewardLines={ref.dpBreakdown}
            totalEarned={ref.dpEarned}
            balanceAfter={ref.dpBalanceAfter}
          />

          <StreakResultPanel streak={streak} />

          <View style={styles.metaPanel}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>発見元</Text>
              <Text style={styles.metaValue}>{scanSourceLabel(monster.scanSource)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>発見時刻</Text>
              <Text style={styles.metaValue}>{formatDateTime(monster.lastDiscoveredAt ?? monster.obtainedAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>季節 / 時間帯</Text>
              <Text style={styles.metaValue}>
                {SEASON_LABELS[monster.dna.contextVariant.season]} / {TIME_SLOT_LABELS[monster.dna.contextVariant.timeSlot]}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>図鑑</Text>
              <Text style={styles.metaValue}>
                {summary.discoveredFamilies}/{summary.totalFamilies}
              </Text>
            </View>
          </View>

          <View style={styles.memoBox}>
            <Text style={styles.memoTitle}>生き物メモ</Text>
            <Text style={styles.memoText}>{bioMemo}</Text>
          </View>

          <View style={styles.shareSection}>
            <Text style={styles.sectionTitle}>共有プレビュー</Text>
            <ShareCard
              monster={monster}
              discoveredFamilies={summary.discoveredFamilies}
              totalFamilies={summary.totalFamilies}
              discoveredIndividuals={summary.discoveredIndividuals}
            />
            <PrimaryButton label="この発見を共有する" icon={Sparkles} onPress={() => shareMonster(monster)} />
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="キャラ詳細を見る" icon={Sparkles} onPress={() => navigation.navigate("MonsterDetail", { monsterId: monster.id })} />
            <PrimaryButton
              label="図鑑で見る"
              icon={BookOpen}
              variant="secondary"
              onPress={() => navigation.navigate("WorldDex")}
            />
            <PrimaryButton
              label={monster.favorite ? "お気に入り解除" : "お気に入り登録"}
              icon={GalleryVerticalEnd}
              variant="ghost"
              onPress={() => void toggleFavorite(monster.id)}
            />
            <PrimaryButton
              label="もう一度スキャン"
              icon={RotateCcw}
              variant="ghost"
              onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })}
            />
          </View>
        </ScrollView>
        {!revealDone ? (
          <AwakeningReveal
            imageKey={monster.imageKey}
            isRare={rarity === "rare"}
            onDone={() => setRevealDone(true)}
          />
        ) : null}
      </SafeAreaView>
    );
  }

  const newCount = refs.filter((ref) => ref.kind === "first").length;
  const totalEarned = refs.reduce((total, ref) => total + ref.dpEarned, 0);
  const balanceAfter = refs[refs.length - 1]?.dpBalanceAfter ?? 0;
  const rewardLines = refs.flatMap((ref) => ref.dpBreakdown);
  const firstShareMonster = refs
    .map((ref) => (ref.kind !== "duplicate" && ref.monsterId ? getMonsterById(ref.monsterId) : undefined))
    .find((monster): monster is UserMonster => Boolean(monster));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.title}>{refs.length}個のコードを読み取りました</Text>
          <Text style={styles.subtitle}>
            {newCount > 0 ? `新しいキャラが ${newCount} 体見つかりました。` : "再発見または発見済みの結果です。"}
          </Text>
        </View>

        <DiscoveryRewardSummary rewardLines={rewardLines} totalEarned={totalEarned} balanceAfter={balanceAfter} />

        {hasValidDiscovery ? <StreakResultPanel streak={streak} /> : null}

        {refs.map((ref, index) => {
          const badge = kindBadge(ref.kind);

          if (ref.kind === "duplicate") {
            const family = getFamilyById(ref.duplicateFamilyId ?? MONSTER_FAMILIES[0]!.id);
            return (
              <View key={ref.id} style={styles.resultCard}>
                <MonsterAvatar familyId={family.id} size={72} showRarity={false} />
                <View style={styles.resultBody}>
                  <Text style={styles.resultIndex}>
                    {index + 1}. {scanSourceLabel(ref.scanSource)}
                  </Text>
                  <Text style={[styles.resultKind, { color: badge.color }]}>発見済み（+{ref.dpEarned} DP）</Text>
                  <Text style={styles.resultSub}>今日はこのコードから発見済みです。</Text>
                </View>
              </View>
            );
          }

          const monster = ref.monsterId ? getMonsterById(ref.monsterId) : undefined;
          if (!monster) {
            return null;
          }
          const family = getFamilyById(monster.familyId);
          const rare = monster.rareId ? getRareById(monster.rareId) : undefined;

          return (
            <View key={ref.id} style={styles.resultCard}>
              <MonsterAvatar monster={monster} size={72} showRarity />
              <View style={styles.resultBody}>
                <Text style={styles.resultIndex}>
                  {index + 1}. {scanSourceLabel(ref.scanSource)}
                </Text>
                <Text style={[styles.resultKind, { color: badge.color }]}>{badge.label}</Text>
                <Text style={styles.resultName}>{monster.displayName}</Text>
                <Text style={styles.resultSub}>
                  {rare ? `${family.name}のレア` : `${family.baseAnimalName}・${family.name}`}
                </Text>
                <PrimaryButton
                  label="詳細を見る"
                  variant="ghost"
                  onPress={() => navigation.navigate("MonsterDetail", { monsterId: monster.id })}
                />
              </View>
            </View>
          );
        })}

        {firstShareMonster ? (
          <PrimaryButton label="この発見を共有する" icon={Sparkles} onPress={() => shareMonster(firstShareMonster)} />
        ) : null}
        {navActions}
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
    paddingBottom: 34
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14
  },
  hero: {
    alignItems: "center",
    gap: 12
  },
  heroImage: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  resultBadgeText: {
    fontSize: 14,
    fontWeight: "900"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  species: {
    color: "#2FA84F",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  metaPanel: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden"
  },
  metaItem: {
    width: "50%",
    minHeight: 64,
    justifyContent: "center",
    gap: 3,
    padding: 12,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#EEF2F7"
  },
  metaLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  metaValue: {
    color: "#071B46",
    fontSize: 15,
    fontWeight: "900"
  },
  streakPanel: {
    gap: 4,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  streakPanelGold: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FCD34D",
    alignItems: "center"
  },
  streakPanelTitle: {
    color: "#166534",
    fontSize: 16,
    fontWeight: "900"
  },
  streakPanelBig: {
    color: "#B45309",
    fontSize: 22,
    fontWeight: "900"
  },
  streakPanelText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "800"
  },
  streakPanelReward: {
    color: "#B45309",
    fontSize: 20,
    fontWeight: "900"
  },
  streakPanelNext: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800"
  },
  memoBox: {
    gap: 8,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#EFFAF2",
    borderWidth: 1,
    borderColor: "#BFE8C7"
  },
  memoTitle: {
    color: "#166534",
    fontSize: 15,
    fontWeight: "900"
  },
  memoText: {
    color: "#31533B",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700"
  },
  shareSection: {
    gap: 12
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  actions: {
    gap: 10
  },
  resultCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  resultBody: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  resultIndex: {
    color: "#2877D9",
    fontSize: 12,
    fontWeight: "900"
  },
  resultKind: {
    fontSize: 14,
    fontWeight: "900"
  },
  resultName: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  resultSub: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700"
  }
});
