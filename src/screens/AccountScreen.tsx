/**
 * アカウント連携・データ引継ぎ画面（§ログイン/連携/引継ぎ）。
 * データは userId をキーにサーバー保存。連携でメール＋パスワードに紐づけ、
 * ログイン/引継ぎコードで別端末に引き継ぐ。
 */
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import { isServerMode } from "../config/apiConfig";
import { useAuthStore } from "../stores/authStore";

export const AccountScreen = () => {
  const account = useAuthStore((s) => s.account);
  const busy = useAuthStore((s) => s.busy);
  const register = useAuthStore((s) => s.register);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const createTransferCode = useAuthStore((s) => s.createTransferCode);
  const redeemTransfer = useAuthStore((s) => s.redeemTransfer);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; message: string; code?: string }>, after?: () => void) =>
    void (async () => {
      const res = await fn();
      setMessage(res.message);
      if (res.ok) after?.();
    })();

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>データの引継ぎ・連携</Text>
          <Text style={styles.title}>アカウント</Text>
          <Text style={styles.subtitle}>
            発見記録・公式発見番号・図鑑は大切なデータです。連携しておくと、端末変更やアプリ削除でも引き継げます。
          </Text>
        </View>

        {!isServerMode ? (
          <View style={[styles.panel, styles.notice]}>
            <Text style={styles.noticeText}>
              現在ローカルモードです（接続先未設定）。連携・引継ぎにはサーバー接続（EXPO_PUBLIC_API_BASE_URL）が必要です。
            </Text>
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>現在の状態</Text>
          {account?.linked ? (
            <>
              <Text style={styles.statusOk}>連携済み：{account.email}</Text>
              <Text style={styles.body}>この端末のデータはアカウントに紐づいています。別端末ではログインで引き継げます。</Text>
              <PrimaryButton
                label="ログアウト"
                variant="ghost"
                onPress={() =>
                  Alert.alert("ログアウトしますか？", "この端末はゲスト状態に戻ります（ローカルデータは残ります）。", [
                    { text: "キャンセル", style: "cancel" },
                    { text: "ログアウト", style: "destructive", onPress: () => void logout().then(() => setMessage("ログアウトしました。")) }
                  ])
                }
              />
            </>
          ) : account ? (
            <Text style={styles.statusOk}>引継ぎ済み（コード）：{account.userId.slice(0, 8)}…</Text>
          ) : (
            <Text style={styles.body}>ゲストとしてプレイ中です。まだ連携していません。</Text>
          )}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        {isServerMode && !account?.linked ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>メールで連携 / ログイン</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="メールアドレス"
              placeholderTextColor="#94A3B8"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="パスワード（6文字以上）"
              placeholderTextColor="#94A3B8"
              secureTextEntry
            />
            <PrimaryButton
              label="このデータをアカウントに連携する"
              loading={busy}
              onPress={() => run(() => register(email, password))}
            />
            <PrimaryButton
              label="ログインして引き継ぐ"
              variant="secondary"
              loading={busy}
              onPress={() => run(() => login(email, password))}
            />
            <Text style={styles.hint}>連携＝今のデータを保存。ログイン＝別端末で作ったデータを引き継ぎ（この端末の未連携データは表示されなくなります）。</Text>
          </View>
        ) : null}

        {isServerMode ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>引継ぎコード</Text>
            <Text style={styles.body}>アカウントを作らずに端末変更したいときに使えます。今の端末でコードを発行し、新しい端末で入力します。</Text>
            <PrimaryButton
              label="引継ぎコードを発行"
              variant="ghost"
              onPress={() =>
                void (async () => {
                  const res = await createTransferCode();
                  setMessage(res.message);
                  if (res.ok && res.code) setIssuedCode(res.code);
                })()
              }
            />
            {issuedCode ? <Text style={styles.code}>{issuedCode}</Text> : null}
            <View style={styles.divider} />
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="引継ぎコードを入力"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
            />
            <PrimaryButton
              label="このコードで引き継ぐ"
              loading={busy}
              onPress={() => run(() => redeemTransfer(code), () => setCode(""))}
            />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FAFF" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { gap: 6 },
  kicker: { color: "#2FA84F", fontSize: 12, fontWeight: "900" },
  title: { color: "#071B46", fontSize: 30, fontWeight: "900" },
  subtitle: { color: "#52627A", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  panel: {
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  notice: { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" },
  noticeText: { color: "#92400E", fontSize: 13, lineHeight: 19, fontWeight: "800" },
  sectionTitle: { color: "#071B46", fontSize: 17, fontWeight: "900" },
  statusOk: { color: "#166534", fontSize: 15, fontWeight: "900" },
  body: { color: "#334155", fontSize: 13, lineHeight: 20, fontWeight: "700" },
  hint: { color: "#94A3B8", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  message: {
    color: "#1E40AF",
    fontSize: 13,
    fontWeight: "800",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#EAF2FF"
  },
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  code: {
    color: "#1D4ED8",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    textAlign: "center",
    paddingVertical: 6
  },
  divider: { height: 1, backgroundColor: "#EEF2F7", marginVertical: 2 }
});
