/**
 * 発見ログ画面（§27/§31.6）。全発見証明を時系列で表示。生コード値・商品名・位置は出さない。
 */
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { DiscoveryCertificateCard } from "../components/discovery/DiscoveryCertificateCard";
import { useMonsterStore } from "../stores/monsterStore";
import { colors } from "../theme";

export const DiscoveryLogScreen = () => {
  const navigation = useNavigation<any>();
  const records = useMonsterStore((state) => state.discoveryRecords);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>すべての発見証明</Text>
          <Text style={styles.title}>発見ログ</Text>
          <Text style={styles.subtitle}>発見回数 {records.length} 件。新しい順に表示します。</Text>
        </View>

        {records.length === 0 ? (
          <Text style={styles.empty}>まだ発見証明がありません。コードをスキャンして発見しましょう。</Text>
        ) : (
          records.map((record) => (
            <Pressable
              key={record.id}
              onPress={() => navigation.navigate("MonsterDetail", { catalogId: record.characterId })}
            >
              <DiscoveryCertificateCard record={record} compact />
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 18, gap: 10, paddingBottom: 34 },
  header: { gap: 6, marginBottom: 4 },
  kicker: { color: colors.success, fontSize: 12, fontWeight: "900" },
  title: { color: colors.navy, fontSize: 30, fontWeight: "900" },
  subtitle: { color: colors.textSlate, fontSize: 14, fontWeight: "700" },
  empty: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
    padding: 24
  }
});
