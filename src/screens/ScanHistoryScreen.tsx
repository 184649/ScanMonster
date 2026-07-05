import { Clock3, Hash, Search } from "../components/icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { EmptyState } from "../components/EmptyState";
import { TagChip } from "../components/TagChip";
import { SEASON_LABELS, TIME_SLOT_LABELS } from "../data/elements";
import { getReadableBarcodeType } from "../services/scannerService";
import { useMonsterStore } from "../stores/monsterStore";
import { formatFullDateTime } from "../utils/dateUtils";
import { shortHash } from "../utils/randomFromHash";

export const ScanHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const histories = useMonsterStore((state) => state.scanHistories);
  const monsters = useMonsterStore((state) => state.monsters);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>プライバシー保護済み</Text>
          <Text style={styles.title}>スキャン履歴</Text>
          <Text style={styles.subtitle}>生データは保存せず、短縮したsourceHashと生成結果だけを表示します。</Text>
        </View>

        {histories.length === 0 ? (
          <EmptyState
            title="履歴がありません"
            message="バーコードかQRコードを読み取ると、スキャン日時と生成結果がここに残ります。"
            icon={Search}
          />
        ) : (
          <View style={styles.list}>
            {histories.map((history) => {
              const monster = monsters.find((item) => item.id === history.resultMonsterId);

              return (
                <Pressable
                  key={history.id}
                  accessibilityRole="button"
                  onPress={() => monster && navigation.navigate("MonsterDetail", { monsterId: monster.id })}
                  style={({ pressed }) => [styles.historyCard, pressed && monster && styles.pressed]}
                >
                  <View style={styles.historyHeader}>
                    <View style={styles.iconBox}>
                      <Clock3 color="#1D4ED8" size={20} strokeWidth={2.4} />
                    </View>
                    <View style={styles.historyTitleBlock}>
                      <Text style={styles.historyTitle}>{monster?.displayName ?? "生成個体不明"}</Text>
                      <Text style={styles.historyDate}>{formatFullDateTime(history.scannedAt)}</Text>
                    </View>
                  </View>
                  <View style={styles.hashRow}>
                    <Hash color="#64748B" size={16} strokeWidth={2.4} />
                    <Text style={styles.hashText}>{shortHash(history.sourceHash, 14)}</Text>
                  </View>
                  <View style={styles.tagRow}>
                    <TagChip label={history.sourceType === "qr" ? "QRコード" : "バーコード"} color="#EAF2FF" />
                    <TagChip label={getReadableBarcodeType(history.barcodeType)} color="#F1F5F9" />
                    <TagChip label={history.regionName} color="#DCFCE7" />
                    <TagChip label={SEASON_LABELS[history.season]} color="#FEF3C7" />
                    <TagChip label={TIME_SLOT_LABELS[history.timeSlot]} color="#E0E7FF" />
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
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
  header: {
    gap: 6
  },
  kicker: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21
  },
  list: {
    gap: 10
  },
  historyCard: {
    gap: 10,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }]
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF"
  },
  historyTitleBlock: {
    flex: 1,
    minWidth: 0
  },
  historyTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  historyDate: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  hashRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  hashText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900"
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  }
});
