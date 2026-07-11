/**
 * 発見カレンダー画面（§26/§31.7）。日付ごとの「一番発見」を表示し、
 * レア発見・最強の証・番号価値が出た日は特別表示にする。
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { DiscoveryCertificateCard } from "../components/discovery/DiscoveryCertificateCard";
import { groupDiscoveriesByDate } from "../services/discoveryQueries";
import { useMonsterStore } from "../stores/monsterStore";

export const DiscoveryCalendarScreen = () => {
  const navigation = useNavigation<any>();
  const records = useMonsterStore((state) => state.discoveryRecords);
  const days = groupDiscoveriesByDate(records);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>毎日の発見</Text>
          <Text style={styles.title}>発見カレンダー</Text>
          <Text style={styles.subtitle}>その日の一番の発見を記録します。{days.length} 日分。</Text>
        </View>

        {days.length === 0 ? (
          <Text style={styles.empty}>まだ記録がありません。今日の一番発見をつくりましょう。</Text>
        ) : (
          days.map((day) => (
            <View key={day.date} style={styles.dayBlock}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayDate}>{day.date}</Text>
                <View style={styles.markers}>
                  {day.hasStrongestProof ? <Text style={[styles.marker, styles.markerGold]}>最強の証</Text> : null}
                  {day.hasRare ? <Text style={[styles.marker, styles.markerRare]}>レア</Text> : null}
                  {day.hasNumberValue ? <Text style={[styles.marker, styles.markerNumber]}>番号価値</Text> : null}
                  <Text style={styles.dayCount}>発見{day.count}件</Text>
                </View>
              </View>
              <Pressable onPress={() => navigation.navigate("MonsterDetail", { catalogId: day.top.characterId })}>
                <DiscoveryCertificateCard record={day.top} compact highlighted={day.hasStrongestProof} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FAFF" },
  content: { padding: 18, gap: 14, paddingBottom: 34 },
  header: { gap: 6 },
  kicker: { color: "#2FA84F", fontSize: 12, fontWeight: "900" },
  title: { color: "#071B46", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#52627A", fontSize: 14, fontWeight: "700" },
  empty: { color: "#64748B", fontSize: 14, fontWeight: "700", textAlign: "center", padding: 24 },
  dayBlock: { gap: 8 },
  dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  dayDate: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  markers: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  marker: {
    fontSize: 11,
    fontWeight: "900",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    overflow: "hidden"
  },
  markerGold: { backgroundColor: "#FDE68A", color: "#92400E" },
  markerRare: { backgroundColor: "#EDE9FE", color: "#6D28D9" },
  markerNumber: { backgroundColor: "#DBEAFE", color: "#1D4ED8" },
  dayCount: { color: "#64748B", fontSize: 12, fontWeight: "800" }
});
