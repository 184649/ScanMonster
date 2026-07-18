import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { DailyStreakCard } from "../components/DailyStreakCard";
import { FriendEffectCard } from "../components/FriendEffectCard";
import { DiscoveryCertificateCard } from "../components/discovery/DiscoveryCertificateCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { DP_DESCRIPTION, formatDP } from "../data/economy";
import {
  WORLD_GROUP_LABELS,
  WORLD_GROUP_SHORT_LABELS,
  getNextWorldUnlockCost
} from "../data/worlds";
import { getTitleById } from "../data/titles";
import { createDexSummary } from "../services/dexService";
import { topDiscoveryOfDay } from "../services/discoveryQueries";
import { resolveUserMonsterDisplayNameWithNickname } from "../services/characterPresentationResolver";
import { useMonsterStore } from "../stores/monsterStore";
import { formatDateTime, getLocalDateKey } from "../utils/dateUtils";
import { colors, radius } from "../theme";

type InfoCardProps = {
  title: string;
  value: string;
  body: string;
  accent: string;
  onPress: () => void;
};

const InfoCard = ({ title, value, body, accent, onPress }: InfoCardProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    style={({ pressed }) => [styles.infoCard, { borderColor: accent }, pressed && styles.pressed]}
  >
    <Text style={[styles.infoTitle, { color: accent }]}>{title}</Text>
    <Text style={styles.infoValue}>{value}</Text>
    <Text style={styles.infoBody}>{body}</Text>
  </Pressable>
);

export const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((state) => state.monsters);
  const histories = useMonsterStore((state) => state.scanHistories);
  const economy = useMonsterStore((state) => state.economy);
  const discoveryRecords = useMonsterStore((state) => state.discoveryRecords);
  const todayTop = topDiscoveryOfDay(discoveryRecords, getLocalDateKey(new Date()));
  const summary = createDexSummary(monsters, histories);
  const unlockedWorlds = economy.unlocks.unlockedWorldGroups;
  const nextUnlockCost = getNextWorldUnlockCost(unlockedWorlds.length);
  const activeBoost = economy.unlocks.activeWorldBoost;
  const activeTitle = economy.titles.activeTitleId ? getTitleById(economy.titles.activeTitleId) : undefined;
  const recentMonsters = monsters.slice(0, 6);
  const exp = summary.discoveredFamilies * 120 + histories.length * 20;
  const trainerLevel = Math.max(1, Math.floor(exp / 1000) + 1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.logo}>
              WORLD<Text style={styles.logoGreen}>AWN</Text>
            </Text>
            <Text style={styles.kicker}>スキャンして、世界を広げよう</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate("Titles")}
            style={({ pressed }) => [styles.titleBadge, pressed && styles.pressed]}
          >
            <Text style={styles.titleBadgeLabel}>称号</Text>
            <Text numberOfLines={1} style={styles.titleBadgeText}>{activeTitle?.name ?? "未設定"}</Text>
          </Pressable>
        </View>

        <View style={styles.playerCard}>
          {recentMonsters[0] ? (
            <MonsterAvatar monster={recentMonsters[0]} size={64} thumb showRarity={false} />
          ) : (
            <MonsterAvatar familyId="fox" size={64} showRarity={false} />
          )}
          <View style={styles.playerBody}>
            <Text style={styles.playerName}>トレーナー Lv. {trainerLevel}</Text>
            <Text style={styles.playerMeta}>発見 {summary.discoveredFamilies}種 / スキャン {histories.length}回</Text>
          </View>
        </View>

        <DailyStreakCard
          scanStreakDays={economy.scanStreak.totalScanStreakDays}
          todayEarnedDP={economy.login.todayEarnedDP}
          weeklyStreakDay={economy.scanStreak.weeklyStreakDay}
          bestScanStreakDays={economy.scanStreak.bestScanStreakDays}
          onPress={() => navigation.navigate("Mission")}
        />

        <View style={styles.todayPanel}>
          <Text style={styles.sectionTitle}>今日の一番発見</Text>
          {todayTop ? (
            <Pressable onPress={() => navigation.navigate("MonsterDetail", { catalogId: todayTop.characterId })}>
              <DiscoveryCertificateCard record={todayTop} compact highlighted={todayTop.strongestProof} />
            </Pressable>
          ) : (
            <Text style={styles.todayEmpty}>まだ今日の発見はありません。スキャンして一番発見をつくろう。</Text>
          )}
          <View style={styles.discoveryLinks}>
            <PrimaryButton label="発見ログ" variant="ghost" onPress={() => navigation.navigate("DiscoveryLog")} />
            <PrimaryButton label="カレンダー" variant="ghost" onPress={() => navigation.navigate("DiscoveryCalendar")} />
            <PrimaryButton label="番号コレクション" variant="ghost" onPress={() => navigation.navigate("NumberCollection")} />
          </View>
        </View>

        <FriendEffectCard />

        <View style={styles.dpPanel}>
          <Text style={styles.dpLabel}>所持ドーンポイント</Text>
          <Text style={styles.dpValue}>{formatDP(economy.dpBalance)}</Text>
          <Text style={styles.dpDescription}>{DP_DESCRIPTION}</Text>
          <PrimaryButton label="ワールド解放・ブースト" onPress={() => navigation.navigate("HabitatUnlock")} />
        </View>

        <View style={styles.infoGrid}>
          <InfoCard
            title="図鑑"
            value={`${summary.discoveredFamilies} / ${summary.totalFamilies}`}
            body="発見したキャラ"
            accent={colors.success}
            onPress={() => navigation.navigate("WorldDex")}
          />
          <InfoCard
            title="解放ワールド"
            value={`${unlockedWorlds.length} / 6`}
            body={unlockedWorlds.map((world) => WORLD_GROUP_SHORT_LABELS[world]).join("・") || "未選択"}
            accent="#2877D9"
            onPress={() => navigation.navigate("HabitatUnlock")}
          />
          <InfoCard
            title="次の解放"
            value={nextUnlockCost === null ? "完了" : formatDP(nextUnlockCost)}
            body={nextUnlockCost === null ? "すべてのワールドを解放済み" : "DPで出現対象を増やす"}
            accent="#B45309"
            onPress={() => navigation.navigate("HabitatUnlock")}
          />
          <InfoCard
            title="レア発見"
            value={`${summary.rareMonsters}`}
            body="レア確率はDPでは上がりません"
            accent="#7C3AED"
            onPress={() => navigation.navigate("WorldDex")}
          />
        </View>

        <View style={styles.boostPanel}>
          <Text style={styles.sectionTitle}>ワールドブースト</Text>
          {activeBoost ? (
            <Text style={styles.boostText}>
              {WORLD_GROUP_LABELS[activeBoost.targetWorld]}が出やすい状態です。残り{activeBoost.remainingScans}回の有効スキャンで効果があります。
            </Text>
          ) : (
            <Text style={styles.boostText}>ブーストは未使用です。2ワールド以上解放すると、300 DPで次の10回だけ狙いたいワールドを出やすくできます。</Text>
          )}
          <Text style={styles.boostSub}>ブーストはレア確率を変えません。</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="スキャンする" onPress={() => navigation.navigate("Scan")} />
          <PrimaryButton label="図鑑を見る" variant="secondary" onPress={() => navigation.navigate("WorldDex")} />
          <PrimaryButton label="ワールド一覧" variant="ghost" onPress={() => navigation.navigate("WorldList")} />
          <PrimaryButton label="フレンドQR" variant="ghost" onPress={() => navigation.navigate("FriendQRCode")} />
          <PrimaryButton label="称号を見る" variant="ghost" onPress={() => navigation.navigate("Titles")} />
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近の発見</Text>
          <Pressable onPress={() => navigation.navigate("WorldDex")}>
            <Text style={styles.moreText}>図鑑へ ›</Text>
          </Pressable>
        </View>

        {recentMonsters.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
            {recentMonsters.map((monster) => {
              const displayName = resolveUserMonsterDisplayNameWithNickname(monster);
              return (
                <Pressable
                  key={monster.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${displayName}の詳細を開く`}
                  onPress={() => navigation.navigate("MonsterDetail", { monsterId: monster.id })}
                  style={({ pressed }) => [styles.recentCard, pressed && styles.pressed]}
                >
                  <MonsterAvatar monster={monster} size={88} showRarity={false} />
                  <Text numberOfLines={1} style={styles.recentName}>{displayName}</Text>
                  <Text style={styles.recentMeta}>{monster.discoveryCount ?? 1}回発見</Text>
                  <Text numberOfLines={1} style={styles.recentMeta}>{formatDateTime(monster.lastDiscoveredAt ?? monster.obtainedAt)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだ発見がありません</Text>
            <Text style={styles.emptyText}>バーコードやQRコードを読み取って、最初のキャラを見つけましょう。</Text>
            <PrimaryButton label="最初のスキャンへ" onPress={() => navigation.navigate("Scan")} />
          </View>
        )}
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
    gap: 16,
    paddingBottom: 36
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  logo: {
    color: colors.navy,
    fontSize: 38,
    fontWeight: "900"
  },
  logoGreen: {
    color: colors.success
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800"
  },
  titleBadge: {
    width: 116,
    borderRadius: radius.md,
    padding: 10,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  titleBadgeLabel: {
    color: "#6D28D9",
    fontSize: 11,
    fontWeight: "900"
  },
  titleBadgeText: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "900"
  },
  playerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.md,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  playerBody: {
    flex: 1,
    gap: 4
  },
  playerName: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  playerMeta: {
    color: colors.textSlate,
    fontSize: 13,
    fontWeight: "800"
  },
  todayPanel: {
    gap: 12,
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  todayEmpty: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  discoveryLinks: {
    gap: 8
  },
  dpPanel: {
    gap: 10,
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: colors.accentGoldSoft,
    borderWidth: 1,
    borderColor: colors.accentGold
  },
  dpLabel: {
    color: colors.accentGoldInk,
    fontSize: 12,
    fontWeight: "900"
  },
  dpValue: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: "900"
  },
  dpDescription: {
    color: "#57451D",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  infoCard: {
    width: "48%",
    minHeight: 130,
    borderRadius: radius.md,
    padding: 13,
    backgroundColor: colors.surface,
    borderWidth: 1.4
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "900"
  },
  infoValue: {
    color: colors.navy,
    fontSize: 25,
    fontWeight: "900",
    marginTop: 10
  },
  infoBody: {
    color: colors.textSlate,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "800",
    marginTop: 4
  },
  boostPanel: {
    gap: 6,
    borderRadius: radius.md,
    padding: 14,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  boostText: {
    color: "#31533B",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  boostSub: {
    color: colors.successDark,
    fontSize: 12,
    fontWeight: "900"
  },
  actions: {
    gap: 10
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  moreText: {
    color: colors.textSlate,
    fontSize: 13,
    fontWeight: "900"
  },
  recentRow: {
    gap: 10,
    paddingRight: 18
  },
  recentCard: {
    width: 118,
    gap: 4,
    borderRadius: radius.md,
    padding: 9,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  recentName: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "900"
  },
  recentMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  emptyCard: {
    gap: 10,
    borderRadius: radius.md,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  }
});
