import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { BookOpen, ScanLine, Sparkles } from "../components/icons";
import { getFamilyById } from "../data/monsterFamilies";
import { createResearchSummaries } from "../services/researchService";
import { useMonsterStore } from "../stores/monsterStore";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../theme";

export const ResearchScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((state) => state.monsters);
  const research = useMonsterStore((state) => state.research);
  const summaries = createResearchSummaries(monsters, research)
    .filter((summary) => summary.collectedCount > 0 || summary.researchPoints > 0)
    .sort((a, b) => b.researchLevel - a.researchLevel || b.researchPoints - a.researchPoints);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>同じ種族を集める意味を育てる</Text>
          <Text style={styles.title}>研究</Text>
          <Text style={styles.subtitle}>同じ種族を集めるほど研究が進み、未発見個体のヒントを見つけやすくなります。</Text>
        </View>

        {summaries.length === 0 ? (
          <View style={styles.emptyPanel}>
            <Sparkles color={colors.success} size={34} strokeWidth={2.4} />
            <Text style={styles.emptyTitle}>研究データはまだありません</Text>
            <Text style={styles.emptyText}>モンスターをスキャンして同じ種族を集めると、種族研究が進みます。</Text>
            <PrimaryButton label="スキャンへ" icon={ScanLine} onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })} />
          </View>
        ) : (
          summaries.map((summary) => {
            const progress = Math.min(100, (summary.researchPoints % 75) / 75 * 100);
            const family = getFamilyById(summary.familyId);

            return (
              <View key={summary.familyId} style={styles.researchCard}>
                <MonsterAvatar familyId={summary.familyId} size={86} showRarity={false} />
                <View style={styles.researchBody}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.familyName}>{family.name}</Text>
                    <Text style={styles.levelBadge}>研究Lv.{summary.researchLevel}</Text>
                  </View>
                  <Text style={styles.metaText}>発見個体 {summary.collectedCount} / 個体差 {summary.variantCount}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress}%` }]} />
                  </View>
                  <Text style={styles.nextReward}>{summary.nextRewardLabel}: {summary.nextHint ?? "解放済み"}</Text>
                  {summary.unlockedHints.slice(0, 2).map((hint) => (
                    <Text key={hint} style={styles.hintText}>・{hint}</Text>
                  ))}
                </View>
              </View>
            );
          })
        )}

        <PrimaryButton label="ワールド図鑑へ" icon={BookOpen} variant="secondary" onPress={() => navigation.navigate("WorldDex")} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBg
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36
  },
  header: {
    gap: 6
  },
  kicker: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.navy,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: "#5B6A83",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  emptyPanel: {
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
    textAlign: "center"
  },
  researchCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  researchBody: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  familyName: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900"
  },
  levelBadge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    color: colors.successDark,
    backgroundColor: colors.successSoft,
    fontSize: 11,
    fontWeight: "900"
  },
  metaText: {
    color: colors.textSlate,
    fontSize: 12,
    fontWeight: "800"
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: colors.border
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.success
  },
  nextReward: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "900"
  },
  hintText: {
    color: colors.textSlate,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700"
  }
});
