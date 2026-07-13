import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { USER_TITLES, getTitleById } from "../data/titles";
import { useMonsterStore } from "../stores/monsterStore";
import { colors } from "../theme";

export const TitlesScreen = () => {
  const economy = useMonsterStore((state) => state.economy);
  const setActiveTitle = useMonsterStore((state) => state.setActiveTitle);
  const [message, setMessage] = useState<string | null>(null);
  const unlockedIds = new Set(economy.titles.unlockedTitleIds);
  const activeTitle = economy.titles.activeTitleId ? getTitleById(economy.titles.activeTitleId) : undefined;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>プレイ実績</Text>
          <Text style={styles.title}>称号</Text>
          <Text style={styles.subtitle}>獲得した称号を1つマイページに表示できます。称号は強さには影響しません。</Text>
        </View>

        <View style={styles.activeCard}>
          <Text style={styles.activeLabel}>表示中の称号</Text>
          <Text style={styles.activeTitle}>{activeTitle?.name ?? "未設定"}</Text>
          <Text style={styles.activeText}>{activeTitle?.description ?? "条件を達成すると称号を設定できます。"}</Text>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.list}>
          {USER_TITLES.map((title) => {
            const unlocked = unlockedIds.has(title.id);
            const active = economy.titles.activeTitleId === title.id;
            return (
              <View key={title.id} style={[styles.titleCard, unlocked && styles.titleCardUnlocked]}>
                <View style={styles.titleBody}>
                  <Text style={[styles.titleName, !unlocked && styles.lockedText]}>{title.name}</Text>
                  <Text style={styles.condition}>{title.conditionText}</Text>
                  <Text style={styles.description}>{unlocked ? title.description : "未獲得"}</Text>
                </View>
                <PrimaryButton
                  label={active ? "設定中" : unlocked ? "表示する" : "未獲得"}
                  variant={active ? "secondary" : "ghost"}
                  disabled={!unlocked || active}
                  onPress={() => {
                    void (async () => {
                      const result = await setActiveTitle(title.id);
                      setMessage(result.message);
                    })();
                  }}
                />
              </View>
            );
          })}
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
    gap: 14,
    paddingBottom: 36
  },
  header: {
    gap: 6
  },
  kicker: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.navy,
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: colors.textSlate,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  activeCard: {
    gap: 5,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  activeLabel: {
    color: "#6D28D9",
    fontSize: 12,
    fontWeight: "900"
  },
  activeTitle: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: "900"
  },
  activeText: {
    color: colors.textBody,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  message: {
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
  list: {
    gap: 10
  },
  titleCard: {
    gap: 10,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  titleCardUnlocked: {
    borderColor: "#BFE8C7"
  },
  titleBody: {
    gap: 4
  },
  titleName: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900"
  },
  lockedText: {
    color: colors.textFaint
  },
  condition: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  description: {
    color: colors.textSlate,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  }
});
