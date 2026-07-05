import { useCallback, useMemo, useRef, useState } from "react";
import { CameraView, scanFromURLAsync, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Camera, MapPin, ShieldCheck } from "../components/icons";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { FEATURE_FLAGS } from "../constants/featureFlags";
import { normalizeScanResult, type NormalizedScanResult } from "../services/scannerService";
import { useMonsterStore } from "../stores/monsterStore";
import { useSettingsStore } from "../stores/settingsStore";
import type { DetectedCode, DiscoveryResult, DiscoveryResultRef } from "../types/discovery";

type ScanEvent = {
  data: string;
  type: string;
};

type ScanState = "scanning" | "processing";

type DetectedItem = {
  id: string;
  scanSource: "barcode" | "qr";
  codeType: string;
  normalizedValue: string;
};

// 受け取り種別は feature flag で制御。ENABLE_BARCODE_SCAN / ENABLE_QR_SCAN を false にすると各々無効化。
const cameraBarcodeTypes = FEATURE_FLAGS.ENABLE_BARCODE_SCAN
  ? ["ean13", "ean8", "upc_a", "upc_e", "code39", "code128"]
  : [];
const cameraScanTypes = FEATURE_FLAGS.ENABLE_QR_SCAN ? [...cameraBarcodeTypes, "qr"] : cameraBarcodeTypes;
const barcodeScannerSettings = { barcodeTypes: cameraScanTypes };

const keyOf = (item: { scanSource: string; codeType: string; normalizedValue: string }): string =>
  `${item.scanSource}:${item.codeType}:${item.normalizedValue}`;

const toDetectedItem = (result: NormalizedScanResult): DetectedItem | null => {
  if (!result.isValid || result.sourceType === "unknown") {
    return null;
  }

  if (!FEATURE_FLAGS.ENABLE_QR_SCAN && result.sourceType === "qr") {
    return null;
  }

  return {
    id: `code_${result.sourceType}_${result.barcodeType}_${result.normalizedData.length}_${Math.random().toString(36).slice(2, 8)}`,
    scanSource: result.sourceType,
    codeType: result.barcodeType,
    normalizedValue: result.normalizedData
  };
};

export const ScanScreen = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("scanning");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{ codeType: string; scanSource: string; masked: string; valid: string; note: string }>({
    codeType: "-",
    scanSource: "-",
    masked: "-",
    valid: "-",
    note: "待機中"
  });
  const lastSeenRef = useRef<Record<string, number>>({});
  // 発見処理の多重実行ガード（setStateの反映待ちの隙間対策）。
  const processingRef = useRef(false);
  const settings = useSettingsStore((state) => state.settings);
  const processDetectedCodes = useMonsterStore((state) => state.processDetectedCodes);
  const selectedRegionKey = settings.selectedRegionKey ?? "unknown";
  // feature flag が true なら、設定値に関係なくデバッグ表示を強制ON（開発用フラグを効かせる）。
  const scanDebugEnabled = FEATURE_FLAGS.SHOW_SCAN_DEBUG || settings.showScanDebug === true;

  const cooldownMs = useMemo(() => Math.max(settings.scannerCooldownMs || 2000, 1500), [settings.scannerCooldownMs]);

  const resetScan = useCallback(() => {
    setScanState("scanning");
    setError(null);
    setInfo(null);
    lastSeenRef.current = {};
    processingRef.current = false;
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetScan();
    }, [resetScan])
  );

  // コード検出後、ユーザー操作を挟まず自動で発見処理を実行する。
  const autoDiscover = useCallback(
    async (items: DetectedItem[]) => {
      if (processingRef.current || scanState === "processing") {
        return;
      }
      if (!selectedRegionKey) {
        navigation.navigate("RegionSettings");
        return;
      }

      // 同一バッチ内の重複コードを除外。
      const seen = new Set<string>();
      const unique = items.filter((item) => {
        const key = keyOf(item);
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
      if (unique.length === 0) {
        return;
      }

      processingRef.current = true;
      setScanState("processing");
      setError(null);
      setInfo(null);

      try {
        const codes: DetectedCode[] = unique.map((item) => ({
          id: item.id,
          scanSource: item.scanSource,
          codeType: item.codeType,
          normalizedValue: item.normalizedValue
        }));

        const results: DiscoveryResult[] = await processDetectedCodes(codes, selectedRegionKey);

        // 新規発見（first / new）のみ結果画面へ。発見済みブロック（duplicate）は進めない。
        const newRefs: DiscoveryResultRef[] = [];
        let blockedCount = 0;
        for (const result of results) {
          if (result.kind === "duplicate") {
            blockedCount += 1;
            continue;
          }
          newRefs.push({
            id: result.id,
            kind: result.kind,
            scanSource: result.scanSource,
            monsterId: result.monster.id,
            dpEarned: result.dpEarned,
            dpBalanceAfter: result.dpBalanceAfter,
            dpBreakdown: result.dpBreakdown
          });
        }

        if (newRefs.length > 0) {
          // 画面遷移。戻ってきたら useFocusEffect でスキャンを再開する。
          navigation.navigate("SummonResult", { results: newRefs });
          return;
        }

        if (blockedCount > 0) {
          setInfo("このコードは今日は発見済みです\nまた明日スキャンしてみましょう");
        } else {
          setError("発見処理に失敗しました。もう一度読み取ってください。");
        }
        setScanState("scanning");
      } catch {
        setError("発見処理に失敗しました。もう一度読み取ってください。");
        setScanState("scanning");
      } finally {
        processingRef.current = false;
      }
    },
    [navigation, processDetectedCodes, scanState, selectedRegionKey]
  );

  const handleBarcodeScanned = ({ data, type }: ScanEvent) => {
    if (scanState !== "scanning" || processingRef.current) {
      return;
    }

    const result = normalizeScanResult(data ?? "", type ?? "unknown");

    // デバッグ表示用（生値は保存せずマスク値のみ）。
    setDebugInfo({
      codeType: result.barcodeType,
      scanSource: result.sourceType,
      masked: result.maskedData || "-",
      valid: result.isValid ? "valid" : result.ignoredReason ?? "invalid",
      note: `検出 ${new Date().toLocaleTimeString("ja-JP")}`
    });

    // 3秒以内の同一コードはカメラの重複検出として無視（1日1回のゲームルールとは別管理）。
    const key = keyOf({ scanSource: result.sourceType, codeType: result.barcodeType, normalizedValue: result.normalizedData });
    const now = Date.now();
    if (lastSeenRef.current[key] && now - lastSeenRef.current[key]! < cooldownMs) {
      return;
    }
    lastSeenRef.current[key] = now;

    if (!FEATURE_FLAGS.ENABLE_QR_SCAN && result.sourceType === "qr") {
      return;
    }

    const item = toDetectedItem(result);
    if (!item) {
      return;
    }

    // 検出したら自動で発見処理へ（発見ボタンは廃止）。
    void autoDiscover([item]);
  };

  const handlePickImage = async () => {
    if (processingRef.current) {
      return;
    }
    setError(null);
    setInfo(null);

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        setError("写真ライブラリへのアクセスが許可されていません。設定から許可してください。");
        return;
      }

      const picked = await ImagePicker.launchImageLibraryAsync({ quality: 1 });
      if (picked.canceled || !picked.assets?.[0]) {
        return;
      }

      const uri = picked.assets[0].uri;
      const found = await scanFromURLAsync(uri, cameraScanTypes as any);

      if (!found || found.length === 0) {
        setError("画像内にバーコードやQRコードが見つかりませんでした。別の画像をお試しください。");
        return;
      }

      // 画像内の複数コードもボタンなしで自動処理する。
      const items = found
        .map((code) => toDetectedItem(normalizeScanResult(code.data ?? "", code.type ?? "unknown")))
        .filter((item): item is DetectedItem => item !== null);

      if (items.length === 0) {
        setError("画像内のコードは読み取れませんでした（対応していない形式の可能性があります）。");
        return;
      }

      await autoDiscover(items);
    } catch {
      setError("画像の読み取りに失敗しました。もう一度お試しください。");
    }
  };

  if (!selectedRegionKey) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <MapPin color="#1D4ED8" size={42} strokeWidth={2.3} />
          <Text style={styles.title}>地域設定が必要です</Text>
          <Text style={styles.message}>時間帯・季節・地域で個体差を作るため、まず地方を選択してください。</Text>
          <PrimaryButton label="地域を設定" icon={MapPin} onPress={() => navigation.navigate("RegionSettings")} />
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <ActivityIndicator color="#2563EB" />
          <Text style={styles.message}>カメラ権限を確認しています。</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Camera color="#1D4ED8" size={42} strokeWidth={2.3} />
          <Text style={styles.title}>カメラを使います</Text>
          <Text style={styles.message}>バーコードやQRコードを読み取るため、カメラ権限を許可してください。</Text>
          <PrimaryButton label="カメラ権限を許可" icon={ShieldCheck} onPress={() => void requestPermission()} />
          {FEATURE_FLAGS.ENABLE_PHOTO_IMPORT ? (
            <PrimaryButton label="写真から読み込む" variant="secondary" onPress={() => void handlePickImage()} />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const cameraActive = scanState === "scanning";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>バーコードやQRコードを読み取ると、新しい生き物が目覚めます。</Text>
          <Text style={styles.title}>コードをスキャン</Text>
          <Text style={styles.message}>コードをカメラに写すと、自動でいきものを発見します。</Text>
        </View>

        <View style={styles.cameraFrame}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={barcodeScannerSettings as any}
            onBarcodeScanned={cameraActive ? handleBarcodeScanned : undefined}
          />
          <View style={styles.scanOverlay}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{scanState === "processing" ? "発見処理中" : "スキャン中"}</Text>
          </View>
          {scanState === "processing" ? (
            <View style={styles.analyzing}>
              <ActivityIndicator color="#FFFFFF" />
              <Text style={styles.analyzingText}>生き物が目覚めています...</Text>
            </View>
          ) : null}
        </View>

        {info ? <Text style={styles.infoText}>{info}</Text> : null}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {FEATURE_FLAGS.ENABLE_PHOTO_IMPORT ? (
          <PrimaryButton
            label="写真から読み込む"
            icon={Camera}
            variant="secondary"
            disabled={scanState === "processing"}
            onPress={() => void handlePickImage()}
          />
        ) : null}

        <View style={styles.hintCard}>
          <Text style={styles.hintText}>
            商品のバーコードやQRコードをカメラ枠に写すと、自動で発見が始まります。{"\n"}
            同じコードは1日1回まで。今日発見済みのコードは、また明日お試しください。
          </Text>
        </View>

        {scanDebugEnabled ? (
          <View style={styles.debugCard}>
            <Text style={styles.debugTitle}>SCAN DEBUG（SHOW_SCAN_DEBUG）</Text>
            <Text style={styles.debugLine}>state: {scanState}</Text>
            <Text style={styles.debugLine}>lastCodeType: {debugInfo.codeType}</Text>
            <Text style={styles.debugLine}>scanSource: {debugInfo.scanSource}</Text>
            <Text style={styles.debugLine}>masked: {debugInfo.masked}</Text>
            <Text style={styles.debugLine}>validation: {debugInfo.valid}</Text>
            <Text style={styles.debugLine}>region: {selectedRegionKey}</Text>
            <Text style={styles.debugLine}>note: {debugInfo.note}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const cornerBase = {
  position: "absolute" as const,
  width: 44,
  height: 44,
  borderColor: "#FACC15"
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFF"
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 34
  },
  centerContent: {
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
    color: "#2FA84F",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  cameraFrame: {
    height: 360,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#0F172A",
    borderWidth: 2,
    borderColor: "#DBEAFE"
  },
  camera: {
    flex: 1
  },
  scanOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  },
  cornerTopLeft: { ...cornerBase, left: 24, top: 24, borderTopWidth: 5, borderLeftWidth: 5 },
  cornerTopRight: { ...cornerBase, right: 24, top: 24, borderTopWidth: 5, borderRightWidth: 5 },
  cornerBottomLeft: { ...cornerBase, left: 24, bottom: 24, borderBottomWidth: 5, borderLeftWidth: 5 },
  cornerBottomRight: { ...cornerBase, right: 24, bottom: 24, borderBottomWidth: 5, borderRightWidth: 5 },
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
  analyzing: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 28,
    borderRadius: 8,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(15, 23, 42, 0.78)"
  },
  analyzingText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  },
  infoText: {
    color: "#166534",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "800",
    textAlign: "center"
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  hintCard: {
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  hintText: {
    color: "#52627A",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center"
  },
  debugCard: {
    borderRadius: 8,
    padding: 12,
    gap: 3,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155"
  },
  debugTitle: {
    color: "#FACC15",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 4
  },
  debugLine: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700"
  }
});
