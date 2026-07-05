/**
 * 自分のフレンドQRを表示（Phase 2・動的QR）。相手がこれを読み込むと発見＋フレンド効果上昇。
 * QRは userId を直載せせず、サーバー発行の短期トークンを運ぶ。表示中は自動更新される。
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { DynamicFriendQr } from "../components/DynamicFriendQr";
import { PrimaryButton } from "../components/PrimaryButton";
import { isServerMode } from "../config/apiConfig";

export const FriendQRCodeScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>フレンドワールド</Text>
          <Text style={styles.title}>あなたのフレンドQR</Text>
          <Text style={styles.subtitle}>相手にこのQRを読み取ってもらうと、フレンドワールドのキャラに出会えます。</Text>
        </View>

        {isServerMode ? (
          <View style={styles.qrCard}>
            <View style={styles.qrWrap}>
              <DynamicFriendQr size={220} />
            </View>
            <Text style={styles.hint}>このQRは数十秒ごとに自動更新されます。スクリーンショットは時間が経つと使えません。</Text>
          </View>
        ) : (
          <View style={[styles.qrCard, styles.notice]}>
            <Text style={styles.noticeText}>フレンドQRはサーバー接続が必要です（EXPO_PUBLIC_API_BASE_URL 未設定）。</Text>
          </View>
        )}

        <View style={styles.actions}>
          <PrimaryButton label="フレンドQRを読み取る" onPress={() => navigation.navigate("FriendQRScanServer")} />
          <PrimaryButton label="戻る" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FAFF" },
  content: { padding: 18, gap: 16, paddingBottom: 34, alignItems: "stretch" },
  header: { gap: 6 },
  kicker: { color: "#DB2777", fontSize: 12, fontWeight: "900" },
  title: { color: "#071B46", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#52627A", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  qrCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  qrWrap: { padding: 12, borderRadius: 12, backgroundColor: "#FFFFFF" },
  hint: { color: "#64748B", fontSize: 12, fontWeight: "800" },
  notice: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  noticeText: { color: "#92400E", fontSize: 13, fontWeight: "800", textAlign: "center" },
  actions: { gap: 10 }
});
