import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { playSound } from "../services/soundService";
import type { SoundId } from "../types/sound";
import { formatDP } from "../data/economy";
import {
  INITIAL_WORLD_GROUPS,
  WORLD_BOOST_COST,
  WORLD_GROUP_DESCRIPTIONS,
  WORLD_GROUP_EMOJI,
  WORLD_GROUP_LABELS,
  getNextWorldUnlockCost,
  getWorldRates
} from "../data/worlds";
import { useMonsterStore } from "../stores/monsterStore";

// ルート名（HabitatUnlock）は維持。中身は「ワールド解放＋ワールドブースト」の統合画面。
export const HabitatUnlockScreen = () => {
  const economy = useMonsterStore((state) => state.economy);
  const unlockWorldGroup = useMonsterStore((state) => state.unlockWorldGroup);
  const startWorldBoost = useMonsterStore((state) => state.startWorldBoost);
  const [message, setMessage] = useState<string | null>(null);
  const unlocked = economy.unlocks.unlockedWorldGroups;
  const nextCost = getNextWorldUnlockCost(unlocked.length);
  const activeBoost = economy.unlocks.activeWorldBoost;
  const rates = getWorldRates(unlocked, activeBoost);

  const runAction = async (
    action: () => Promise<{ ok: boolean; message: string }>,
    successSound: SoundId
  ) => {
    const result = await action();
    setMessage(result.message);
    playSound(result.ok ? successSound : "error");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>DPでワールドを広げる</Text>
          <Text style={styles.title}>ワールド解放</Text>
          <Text style={styles.subtitle}>解放済みワールドだけが出現対象です。ワールドブーストはレア確率を上げず、ワールドの出現率だけを変えます。</Text>
        </View>

        <View style={styles.dpPanel}>
          <Text style={styles.dpLabel}>所持DP</Text>
          <Text style={styles.dpValue}>{formatDP(economy.dpBalance)}</Text>
          <Text style={styles.dpHint}>
            次のワールド解放: {nextCost === null ? "すべて解放済み" : formatDP(nextCost)}
          </Text>
          {activeBoost ? (
            <Text style={styles.boostText}>
              ワールドブースト中: {WORLD_GROUP_LABELS[activeBoost.targetWorld]} / 残り{activeBoost.remainingScans}回
            </Text>
          ) : null}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.list}>
          {INITIAL_WORLD_GROUPS.map((world) => {
            const isUnlocked = unlocked.includes(world);
            const rate = rates[world];
            const shortage = nextCost !== null ? Math.max(0, nextCost - economy.dpBalance) : 0;
            const canBoost = isUnlocked && unlocked.length > 1 && !activeBoost;
            return (
              <View key={world} style={[styles.card, isUnlocked && styles.cardUnlocked]}>
                <View style={styles.cardTop}>
                  <Text style={styles.emoji}>{WORLD_GROUP_EMOJI[world]}</Text>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle}>{WORLD_GROUP_LABELS[world]}</Text>
                    <Text style={styles.cardText}>{WORLD_GROUP_DESCRIPTIONS[world]}</Text>
                    <Text style={styles.rateText}>
                      {isUnlocked ? `現在の出現率: ${Math.round((rate ?? 0) * 1000) / 10}%` : "未解放"}
                    </Text>
                  </View>
                </View>
                {isUnlocked ? (
                  <PrimaryButton
                    label={
                      canBoost
                        ? `ワールドブーストを使う（${formatDP(WORLD_BOOST_COST)}）`
                        : activeBoost
                          ? "ブースト発動中"
                          : "2ワールド以上でブースト可能"
                    }
                    variant="secondary"
                    disabled={!canBoost}
                    soundId="none"
                    onPress={() => void runAction(() => startWorldBoost(world), "boost_activate")}
                  />
                ) : (
                  <PrimaryButton
                    label={
                      nextCost === null
                        ? "解放不可"
                        : shortage > 0
                          ? `あと${formatDP(shortage)}必要`
                          : `解放する（${formatDP(nextCost)}）`
                    }
                    disabled={nextCost === null || shortage > 0}
                    soundId="none"
                    onPress={() => void runAction(() => unlockWorldGroup(world), "world_unlock")}
                  />
                )}
              </View>
            );
          })}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteTitle}>レア確率について</Text>
          <Text style={styles.noteText}>ワールドブーストはワールドの出現率だけを変えます。レア確率は進行度に応じた1〜3%の範囲から変わりません。</Text>
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
    gap: 6
  },
  kicker: {
    color: "#2FA84F",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#071B46",
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: "#52627A",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  dpPanel: {
    gap: 5,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  dpLabel: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900"
  },
  dpValue: {
    color: "#071B46",
    fontSize: 30,
    fontWeight: "900"
  },
  dpHint: {
    color: "#57451D",
    fontSize: 13,
    fontWeight: "800"
  },
  boostText: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900"
  },
  message: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  list: {
    gap: 12
  },
  card: {
    gap: 12,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA"
  },
  cardUnlocked: {
    borderColor: "#BFE8C7",
    backgroundColor: "#F8FFF9"
  },
  cardTop: {
    flexDirection: "row",
    gap: 12
  },
  emoji: {
    fontSize: 30
  },
  cardBody: {
    flex: 1,
    gap: 4
  },
  cardTitle: {
    color: "#071B46",
    fontSize: 18,
    fontWeight: "900"
  },
  cardText: {
    color: "#52627A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  rateText: {
    color: "#2FA84F",
    fontSize: 12,
    fontWeight: "900"
  },
  note: {
    gap: 6,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  noteTitle: {
    color: "#1D4ED8",
    fontSize: 15,
    fontWeight: "900"
  },
  noteText: {
    color: "#31506F",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  }
});
