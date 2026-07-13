import { useState } from "react";
import { CheckCircle2, ScanLine, Sparkles, Trophy } from "../components/icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { getRegionOption } from "../data/regions";
import { showComingSoon } from "../utils/showComingSoon";
import { useMonsterStore } from "../stores/monsterStore";
import { useSettingsStore } from "../stores/settingsStore";
import { calculateConsecutiveScanDays, getLocalDateKey, isSameLocalDate } from "../utils/dateUtils";
import { colors } from "../theme";

type Mission = {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
  target: number;
  reward: string;
};

const clampProgress = (progress: number, target: number): number => {
  if (target <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress / target));
};

export const MissionScreen = () => {
  const navigation = useNavigation<any>();
  const [message, setMessage] = useState<string | null>(null);
  const monsters = useMonsterStore((state) => state.monsters);
  const histories = useMonsterStore((state) => state.scanHistories);
  const claimMissionReward = useMonsterStore((state) => state.claimMissionReward);
  const isMissionRewardClaimed = useMonsterStore((state) => state.isMissionRewardClaimed);
  const selectedRegionKey = useSettingsStore((state) => state.settings.selectedRegionKey ?? "unknown");
  const region = getRegionOption(selectedRegionKey);
  const today = new Date();
  const dateKey = getLocalDateKey(today);
  const todayScans = histories.filter((history) => isSameLocalDate(new Date(history.scannedAt), today)).length;
  const regionFinds = monsters.filter((monster) => monster.dna.contextVariant.regionKey === selectedRegionKey).length;
  const rareFinds = monsters.filter((monster) => monster.dna.rarity >= 3).length;
  const hiddenRareFinds = new Set(monsters.map((monster) => monster.rareId).filter(Boolean)).size;
  const qrFinds = histories.filter((history) => history.sourceType === "qr").length;
  const scanStreak = calculateConsecutiveScanDays(histories.map((history) => history.scannedAt), today);

  const missions: Mission[] = [
    {
      id: "scan-3",
      title: "スキャンを3回しよう",
      subtitle: "候補確認から発見まで進めるとカウントされます。",
      progress: todayScans,
      target: 3,
      reward: "+30 DP"
    },
    {
      id: "scan-5",
      title: "スキャンを5回しよう",
      subtitle: "1日5回までの達成ボーナスが見える化されます。",
      progress: todayScans,
      target: 5,
      reward: "+50 DP"
    },
    {
      id: "region-find",
      title: `${region.shortName}でモンスターを1体発見`,
      subtitle: "現在地の地域バリアントを集めよう。",
      progress: regionFinds,
      target: 1,
      reward: "発見DP"
    },
    {
      id: "rare-find",
      title: "★3以上の個体を1体仲間に",
      subtitle: "レア変異は図鑑の見どころです。",
      progress: rareFinds,
      target: 1,
      reward: "発見DP"
    },
    {
      id: "qr-find",
      title: "QRコードを1回発見しよう",
      subtitle: "QR発見ボーナスが追加で入ります。",
      progress: qrFinds,
      target: 1,
      reward: "+10 DP"
    },
    {
      id: "hidden-rare",
      title: "隠れレアを1体発見しよう",
      subtitle: "特別な発見は大きなDPボーナスになります。",
      progress: hiddenRareFinds,
      target: 1,
      reward: "+100 DP"
    }
  ];
  const completedMissions = missions.filter((mission) => mission.progress >= mission.target).length;

  const handleClaimMission = async (mission: Mission) => {
    await claimMissionReward(mission.id, dateKey, mission.reward);
    setMessage(`${mission.title} を確認しました。DPはスキャンや発見時に自動で付与されています。`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>毎日少しずつ集める</Text>
          <Text style={styles.title}>ミッション</Text>
          <Text style={styles.subtitle}>ログインとスキャンで得られるDPの進み具合をまとめました。</Text>
        </View>

        {message ? <Text style={styles.messageBox}>{message}</Text> : null}

        <View style={styles.streakCard}>
          <View style={styles.streakHeader}>
            <View>
              <Text style={styles.streakTitle}>連続スキャン {scanStreak}日目!</Text>
              <Text style={styles.streakSubtitle}>{scanStreak > 0 ? "明日も続けると報酬UP" : "今日の1回目から始めよう"}</Text>
            </View>
            <Trophy color="#F97316" size={34} strokeWidth={2.4} />
          </View>
          <View style={styles.streakDays}>
            {Array.from({ length: 7 }, (_, index) => (
              <View key={index} style={styles.dayItem}>
                <Text style={styles.dayText}>{index + 1}日目</Text>
                <View
                  style={[
                    styles.dayCircle,
                    index < Math.min(scanStreak, 7) && styles.dayCircleDone,
                    index === Math.min(scanStreak, 7) - 1 && styles.dayCircleCurrent
                  ]}
                >
                  {index < Math.min(scanStreak, 7) ? <CheckCircle2 color="#FFFFFF" size={18} strokeWidth={2.4} /> : null}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.missionPanel}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Sparkles color="#4F46E5" size={18} strokeWidth={2.4} />
            </View>
            <Text style={styles.sectionTitle}>今日のミッション</Text>
            <Text style={styles.sectionCount}>{completedMissions} / {missions.length}</Text>
          </View>
          {missions.map((mission) => {
            const complete = mission.progress >= mission.target;
            const ratio = clampProgress(mission.progress, mission.target);
            const claimed = isMissionRewardClaimed(mission.id, dateKey);

            return (
              <View key={mission.title} style={styles.missionRow}>
                <View style={[styles.checkDot, complete && styles.checkDotComplete]}>
                  {complete ? <CheckCircle2 color="#FFFFFF" size={15} strokeWidth={2.4} /> : null}
                </View>
                <View style={styles.missionBody}>
                  <Text style={styles.missionTitle}>{mission.title}</Text>
                  <Text style={styles.missionSubtitle}>{mission.subtitle}</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${ratio * 100}%` }]} />
                  </View>
                </View>
                <View style={styles.rewardBlock}>
                  <Text style={styles.progressText}>
                    {Math.min(mission.progress, mission.target)} / {mission.target}
                  </Text>
                  {complete ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={claimed}
                      onPress={() => void handleClaimMission(mission)}
                      style={[styles.claimButton, claimed && styles.claimedButton]}
                    >
                      <Text style={[styles.claimText, claimed && styles.claimedText]}>{claimed ? "受取済" : "受け取る"}</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.rewardText}>{mission.reward}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.actionRow}>
          <PrimaryButton label="スキャンへ" icon={ScanLine} onPress={() => navigation.navigate("Scan")} />
          <PrimaryButton
            label="週間ミッション（今後追加予定）"
            variant="ghost"
            onPress={() => showComingSoon("週間ミッションは今後のアップデートで追加予定です。")}
          />
        </View>
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
  streakCard: {
    gap: 14,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFDF4",
    borderWidth: 1,
    borderColor: "#FCD98A"
  },
  streakHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  streakTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: "900"
  },
  streakSubtitle: {
    color: "#374151",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3
  },
  streakDays: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6
  },
  dayItem: {
    alignItems: "center",
    gap: 6
  },
  dayText: {
    color: colors.textBody,
    fontSize: 11,
    fontWeight: "800"
  },
  dayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.border
  },
  dayCircleDone: {
    backgroundColor: "#67BD4A"
  },
  dayCircleCurrent: {
    borderWidth: 4,
    borderColor: "#FBD38D",
    width: 38,
    height: 38,
    borderRadius: 19
  },
  missionPanel: {
    gap: 12,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF"
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "900",
    flex: 1
  },
  sectionCount: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "900"
  },
  missionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint,
    paddingTop: 12
  },
  checkDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center"
  },
  checkDotComplete: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  missionBody: {
    flex: 1,
    minWidth: 0,
    gap: 5
  },
  missionTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "900"
  },
  missionSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  progressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.border,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.success
  },
  rewardBlock: {
    alignItems: "flex-end",
    gap: 4,
    minWidth: 72
  },
  progressText: {
    color: "#4F46E5",
    fontSize: 14,
    fontWeight: "900"
  },
  rewardText: {
    color: colors.navy,
    fontSize: 11,
    fontWeight: "900"
  },
  claimButton: {
    minHeight: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    backgroundColor: colors.success
  },
  claimedButton: {
    backgroundColor: colors.border
  },
  claimText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900"
  },
  claimedText: {
    color: colors.textSlate
  },
  messageBox: {
    color: colors.successDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  actionRow: {
    gap: 10
  }
});
