/**
 * 動的フレンドQR（Phase 2）。サーバー発行の短期トークンを表示し、期限前に自動更新する。
 * スクリーンショットを送っても約60秒で無効になる。表示中は本人操作なしで更新され続ける。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { postFriendQrToken } from "../services/apiClient";
import { buildFriendQrPayload } from "../utils/friendQrPayload";

export const DynamicFriendQr = ({ size = 220 }: { size?: number }) => {
  const [payload, setPayload] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { token, expiresInSeconds } = await postFriendQrToken();
      setPayload(buildFriendQrPayload(token));
      setError(false);
      const nextMs = Math.max(10, (expiresInSeconds ?? 60) - 10) * 1000; // 期限の少し前に更新
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void refresh(), nextMs);
    } catch {
      setError(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void refresh(), 8000); // 失敗時リトライ
    }
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [refresh]);

  if (error && !payload) {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <Text style={styles.err}>QRを取得できませんでした。{"\n"}通信環境をご確認ください。</Text>
      </View>
    );
  }
  if (!payload) {
    return (
      <View style={[styles.box, { width: size, height: size }]}>
        <ActivityIndicator color="#2563EB" />
      </View>
    );
  }
  return <QRCode value={payload} size={size} backgroundColor="#FFFFFF" color="#0F172A" />;
};

const styles = StyleSheet.create({
  box: { alignItems: "center", justifyContent: "center", padding: 16 },
  err: { color: "#B91C1C", fontSize: 13, fontWeight: "800", textAlign: "center", lineHeight: 19 }
});
