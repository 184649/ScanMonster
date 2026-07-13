/**
 * フレンド（タブ）。フレンドワールドのハブ：自分のQR表示・QR読み込み・フレンド効果。
 * フレンドキャラはフレンドワールド専用の空想生物（つながり等のテーマにしない）。
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { DynamicFriendQr } from "../components/DynamicFriendQr";
import { FriendEffectCard } from "../components/FriendEffectCard";
import { PrimaryButton } from "../components/PrimaryButton";
import { isServerMode } from "../config/apiConfig";
import { colors } from "../theme";

export const FriendScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>フレンド</Text>

        <View style={styles.introRow}>
          <Text style={styles.worldEmoji}>🌐</Text>
          <Text style={styles.worldTitle}>フレンドワールド</Text>
        </View>
        <Text style={styles.intro}>フレンドQRを読み込むと、フレンドワールドの空想生物と出会えます。</Text>

        <View style={styles.qrCard}>
          <View style={styles.qrLeft}>
            <Text style={styles.qrTitle}>あなたのQRコード</Text>
            <Text style={styles.qrText}>友だちに読み取ってもらうと、フレンドワールドが開きます。</Text>
          </View>
          <View style={styles.qrWrap}>
            {isServerMode ? (
              <DynamicFriendQr size={120} />
            ) : (
              <Text style={styles.qrOffline}>サーバー未接続</Text>
            )}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <View style={styles.btnHalf}>
            <PrimaryButton label="自分のQRを表示" variant="secondary" onPress={() => navigation.navigate("FriendQRCode")} />
          </View>
          <View style={styles.btnHalf}>
            <PrimaryButton label="QRを読み込む" onPress={() => navigation.navigate("FriendQRScanServer")} />
          </View>
        </View>

        <FriendEffectCard />

        <Text style={styles.sectionTitle}>最近のフレンド発見</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>まだフレンド発見がありません。フレンドQRを読み込んでみましょう。</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, gap: 12, paddingBottom: 34 },
  title: { color: colors.navy, fontSize: 24, fontWeight: "900", textAlign: "center", paddingVertical: 6 },
  introRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  worldEmoji: { fontSize: 22 },
  worldTitle: { color: colors.navy, fontSize: 20, fontWeight: "900" },
  intro: { color: colors.textSlate, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  qrCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderFaint
  },
  qrLeft: { flex: 1, gap: 6, minWidth: 0 },
  qrTitle: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  qrText: { color: colors.textMuted, fontSize: 12, lineHeight: 18, fontWeight: "700" },
  qrWrap: { padding: 8, borderRadius: 12, backgroundColor: "#FFFFFF" },
  qrOffline: { color: "#B45309", fontSize: 12, fontWeight: "800", width: 120, textAlign: "center" },
  buttonRow: { flexDirection: "row", gap: 10 },
  btnHalf: { flex: 1 },
  sectionTitle: { color: colors.navy, fontSize: 16, fontWeight: "900", marginTop: 4 },
  emptyCard: { borderRadius: 12, padding: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.borderFaint },
  emptyText: { color: colors.textMuted, fontSize: 13, fontWeight: "700", textAlign: "center", lineHeight: 19 }
});
