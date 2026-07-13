/**
 * フレンドQR読み込み（§7）。相手のフレンドQRを読み取り、フレンドキャラ抽選＋フレンド効果を更新する。
 * 通常スキャン（商品バーコード）とは別。読み取り後は結果画面へ。
 * ※ファイル名は既存 FriendQrScanScreen（ローカル招待用）とWindows上で衝突しないよう別名。
 */
import { useCallback, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { Camera, ShieldCheck } from "../components/icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { isServerMode } from "../config/apiConfig";
import { ApiUnavailableError, postFriendQrScan } from "../services/apiClient";
import { hapticReveal } from "../services/hapticsService";
import { playSound } from "../services/soundService";
import { getLocalDateKey } from "../utils/dateUtils";
import { parseFriendQrPayload } from "../utils/friendQrPayload";
import { colors } from "../theme";

const friendScannerSettings = { barcodeTypes: ["qr"] };

export const FriendWorldScanScreen = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const processingRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setScanning(true);
      setError(null);
      processingRef.current = false;
    }, [])
  );

  const handleScanned = ({ data }: { data: string }) => {
    if (!scanning || processingRef.current) return;
    // QRからは owner の user_id ではなく短期トークンを取り出す（owner 解決はサーバー）。
    const qrToken = parseFriendQrPayload(data ?? "");
    if (!qrToken) {
      setError("これはフレンドQRではありません。相手のフレンドQR画面を読み取ってください。");
      return;
    }
    processingRef.current = true;
    setScanning(false);
    setError(null);
    void (async () => {
      try {
        const result = await postFriendQrScan(qrToken, getLocalDateKey(new Date()));
        playSound("discovery_rare");
        hapticReveal("rare");
        navigation.navigate("FriendQRResult", { result });
      } catch (e) {
        if (e instanceof ApiUnavailableError) {
          setError("通信できません。オンライン状態で再度お試しください。");
        } else if (e instanceof Error && e.message.includes("400")) {
          // 期限切れ/自分のQR/改ざん等。相手に新しいQRを表示してもらう。
          setError("このQRは読み取れませんでした。期限切れか、自分のQRの可能性があります。相手に最新のQRを表示してもらってください。");
        } else {
          setError("読み取りに失敗しました。もう一度お試しください。");
        }
        setScanning(true);
        processingRef.current = false;
      }
    })();
  };

  if (!isServerMode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.title}>フレンドQR</Text>
          <Text style={styles.message}>フレンドQRはサーバー接続が必要です（EXPO_PUBLIC_API_BASE_URL 未設定）。</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.message}>カメラ権限を確認しています。</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Camera color={colors.primary} size={42} strokeWidth={2.3} />
          <Text style={styles.title}>カメラを使います</Text>
          <Text style={styles.message}>フレンドQRを読み取るため、カメラ権限を許可してください。</Text>
          <PrimaryButton label="カメラ権限を許可" icon={ShieldCheck} onPress={() => void requestPermission()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>フレンドワールド</Text>
          <Text style={styles.title}>フレンドQRを読み取る</Text>
          <Text style={styles.message}>相手のフレンドQR画面をカメラ枠に写してください。</Text>
        </View>
        <View style={styles.cameraFrame}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={friendScannerSettings as any}
            onBarcodeScanned={scanning ? handleScanned : undefined}
          />
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 18, gap: 14, paddingBottom: 34 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 14 },
  header: { gap: 6 },
  kicker: { color: "#DB2777", fontSize: 12, fontWeight: "900" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "900" },
  message: { color: colors.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" },
  cameraFrame: { height: 340, borderRadius: 8, overflow: "hidden", backgroundColor: colors.ink, borderWidth: 2, borderColor: "#FBCFE8" },
  camera: { flex: 1 },
  error: { color: "#B91C1C", fontSize: 14, fontWeight: "800", textAlign: "center" }
});
