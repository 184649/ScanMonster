import { useCallback, useRef, useState } from "react";
import { CameraView, useCameraPermissions } from "expo-camera";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { FRIEND_INVITE_DP } from "../constants/friends";
import { Camera, ShieldCheck } from "../components/icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { DP_ABBR } from "../data/economy";
import { useProfileStore } from "../stores/profileStore";
import { formatFriendCode, parseFriendPayload } from "../utils/friendCode";
import { colors } from "../theme";

type ScanState = "scanning" | "processing" | "done";

// このカメラはフレンドQR専用。商品バーコード・モンスター発見の処理には一切関与しない。
const friendScannerSettings = { barcodeTypes: ["qr"] };

export const FriendQrScanScreen = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const addFriend = useProfileStore((state) => state.addFriend);

  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const processingRef = useRef(false);

  const reset = useCallback(() => {
    setScanState("scanning");
    setMessage(null);
    setIsError(false);
    processingRef.current = false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      reset();
    }, [reset])
  );

  const handleScanned = ({ data }: { data: string }) => {
    if (scanState !== "scanning" || processingRef.current) {
      return;
    }

    const code = parseFriendPayload(data ?? "");

    if (!code) {
      // フレンドQR以外（商品QR等）は無視して、案内だけ出す。
      setIsError(true);
      setMessage("これはフレンドQRではありません。相手のマイページに表示される招待QRを読み取ってください。");
      return;
    }

    processingRef.current = true;
    setScanState("processing");
    setMessage(null);

    void (async () => {
      try {
        const result = await addFriend(code, "qr");
        setIsError(!result.ok);
        setMessage(
          result.ok && result.dpEarned <= 0
            ? `${result.message}（${formatFriendCode(code)}）`
            : result.message
        );
        setScanState("done");
      } catch {
        setIsError(true);
        setMessage("フレンドの追加に失敗しました。もう一度お試しください。");
        setScanState("scanning");
        processingRef.current = false;
      }
    })();
  };

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>フレンドQR</Text>
          <Text style={styles.title}>フレンドQRを読み取る</Text>
          <Text style={styles.message}>相手のマイページ・招待画面のQRをカメラ枠に写してください。</Text>
        </View>

        <View style={styles.cameraFrame}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={friendScannerSettings as any}
            onBarcodeScanned={scanState === "scanning" ? handleScanned : undefined}
          />
          <View style={styles.overlay}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{scanState === "processing" ? "追加中" : scanState === "done" ? "完了" : "読み取り中"}</Text>
          </View>
        </View>

        {message ? <Text style={[styles.result, isError ? styles.resultError : styles.resultOk]}>{message}</Text> : null}

        {scanState === "done" ? (
          <View style={styles.actions}>
            <PrimaryButton label="マイページに戻る" onPress={() => navigation.goBack()} />
            <PrimaryButton label="続けて読み取る" variant="ghost" onPress={reset} />
          </View>
        ) : null}

        <View style={styles.hintCard}>
          <Text style={styles.hintText}>
            フレンドを追加すると、招待ボーナスとして +{FRIEND_INVITE_DP} {DP_ABBR}（同じ相手は1回のみ）。{"\n"}
            付与されるのは{DP_ABBR}のみで、限定キャラや特別なQR・図鑑は付きません。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const corner = {
  position: "absolute" as const,
  width: 40,
  height: 40,
  borderColor: colors.success
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBg
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 34
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14
  },
  header: {
    gap: 6
  },
  kicker: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 26,
    fontWeight: "900"
  },
  message: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21
  },
  cameraFrame: {
    height: 340,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: colors.ink,
    borderWidth: 2,
    borderColor: "#DBEAFE"
  },
  camera: {
    flex: 1
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  cornerTL: { ...corner, left: 24, top: 24, borderTopWidth: 5, borderLeftWidth: 5 },
  cornerTR: { ...corner, right: 24, top: 24, borderTopWidth: 5, borderRightWidth: 5 },
  cornerBL: { ...corner, left: 24, bottom: 24, borderBottomWidth: 5, borderLeftWidth: 5 },
  cornerBR: { ...corner, right: 24, bottom: 24, borderBottomWidth: 5, borderRightWidth: 5 },
  statusPill: {
    position: "absolute",
    top: 16,
    alignSelf: "center",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(15, 23, 42, 0.78)"
  },
  statusText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  result: {
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "800",
    textAlign: "center"
  },
  resultOk: {
    color: colors.successDark,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  resultError: {
    color: "#B91C1C",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA"
  },
  actions: {
    gap: 10
  },
  hintCard: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  hintText: {
    color: colors.textSlate,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  }
});
