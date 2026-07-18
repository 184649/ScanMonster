/**
 * フレンドQR結果画面（段2 §11）。フレンドQRで出会ったキャラ（正式な発見）を表示。
 * 新規フレンドは「まだ見ぬキャラ」、既存フレンドは「交流で発見」。具体的な確率は出さない（Lv とメッセージのみ）。
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import type { FriendQrScanResult } from "../services/apiClient";
import { resolveCharacterDisplayName } from "../services/characterPresentationResolver";
import { goBackOrHome } from "../utils/navigation";
import { colors } from "../theme";

export const FriendQRResultScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const result = (route.params as { result?: FriendQrScanResult } | undefined)?.result;

  // 同日2回目（duplicate）は発見なしの案内のみ。
  if (!result || result.status === "duplicate") {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>フレンド交流</Text>
            </View>
            <Text style={styles.name}>今日はもう交流済みです</Text>
            <Text style={styles.sub}>{result?.message ?? "このフレンドとはまた明日読み合えます。"}</Text>
          </View>
          <View style={styles.actions}>
            <PrimaryButton label="続けて読み取る" onPress={() => navigation.navigate("FriendQRScanServer")} />
            <PrimaryButton label="ホームへ" variant="ghost" onPress={() => goBackOrHome(navigation)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const record = result.discoveryRecord;
  const isNew = result.isNewFriend;
  const characterName = resolveCharacterDisplayName(record.characterId, record.characterName);

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{isNew ? "新しいフレンドと出会い" : "フレンドと再会"}</Text>
          </View>
          <MonsterAvatar imageKey={record.characterId} size={180} showRarity={false} showElementFrame={false} />
          <Text style={styles.name}>{characterName}</Text>
          <Text style={styles.no}>No.{String(record.characterDiscoveryNo).padStart(3, "0")}</Text>
          <Text style={styles.sub}>
            {isNew ? "新しい出会いが、まだ見ぬキャラを呼び寄せました" : "交流が、新しい発見の気配を高めています"}
          </Text>
        </View>

        <View style={styles.effectCard}>
          <Text style={styles.effectTitle}>フレンド効果 Lv.{result.effectLevel}</Text>
          <Text style={styles.effectText}>{result.message}</Text>
          {isNew ? <Text style={styles.newTag}>新しいフレンド！</Text> : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="スキャンする" onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })} />
          <PrimaryButton label="続けて読み取る" variant="secondary" onPress={() => navigation.navigate("FriendQRScanServer")} />
          <PrimaryButton label="ホームへ" variant="ghost" onPress={() => goBackOrHome(navigation)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 18, gap: 16, paddingBottom: 34 },
  hero: { alignItems: "center", gap: 10 },
  badge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#FCE7F3" },
  badgeText: { color: "#BE185D", fontSize: 13, fontWeight: "900" },
  name: { color: colors.ink, fontSize: 24, fontWeight: "900", textAlign: "center" },
  no: { color: colors.textFaint, fontSize: 14, fontWeight: "900", textAlign: "center" },
  sub: { color: "#DB2777", fontSize: 14, fontWeight: "800", textAlign: "center" },
  effectCard: {
    gap: 6,
    alignItems: "center",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FDBA74"
  },
  effectTitle: { color: "#C2410C", fontSize: 18, fontWeight: "900" },
  effectText: { color: "#7C2D12", fontSize: 14, fontWeight: "700", textAlign: "center", lineHeight: 20 },
  newTag: {
    color: colors.successDark,
    backgroundColor: colors.successSoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden"
  },
  actions: { gap: 10 }
});
