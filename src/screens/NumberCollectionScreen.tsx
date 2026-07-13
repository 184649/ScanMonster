/**
 * 番号コレクション画面（§24）。発見番号の価値タグごとに、集めた固有番号の数を表示。
 * キャラ画像を増やさず、発見そのもののコレクション性を強める。
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { numberCollectionSummary } from "../services/discoveryQueries";
import { useMonsterStore } from "../stores/monsterStore";
import { colors } from "../theme";

export const NumberCollectionScreen = () => {
  const records = useMonsterStore((state) => state.discoveryRecords);
  const summary = numberCollectionSummary(records);
  const totalCollected = summary.reduce((total, entry) => total + entry.count, 0);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>発見番号のコレクション</Text>
          <Text style={styles.title}>番号コレクション</Text>
          <Text style={styles.subtitle}>
            価値ある発見番号を集めよう。これまでに集めた価値番号 {totalCollected} 種。
          </Text>
        </View>

        <View style={styles.grid}>
          {summary.map((entry) => (
            <View key={entry.tag} style={styles.cell}>
              <Text style={styles.cellLabel}>{entry.label}</Text>
              <Text style={styles.cellCount}>{entry.count}</Text>
              <Text style={styles.cellUnit}>種 集めた</Text>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>
            番号価値は、キャラクター別の公式発見番号（No.007・No.777・No.1000 など）に付きます。
            同じ価値の番号を別のキャラクターで見つけると、コレクションが増えます。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 18, gap: 14, paddingBottom: 34 },
  header: { gap: 6 },
  kicker: { color: colors.success, fontSize: 12, fontWeight: "900" },
  title: { color: colors.navy, fontSize: 30, fontWeight: "900" },
  subtitle: { color: colors.textSlate, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  cell: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 2
  },
  cellLabel: { color: colors.textBody, fontSize: 14, fontWeight: "900" },
  cellCount: { color: colors.primary, fontSize: 30, fontWeight: "900" },
  cellUnit: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  note: {
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#EEF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  noteText: { color: "#31506F", fontSize: 13, lineHeight: 20, fontWeight: "700" }
});
