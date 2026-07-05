import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { APP_INFO } from "../constants/appInfo";
import { PrimaryButton } from "../components/PrimaryButton";
import { MonsterAvatar } from "../components/MonsterAvatar";
import { isServerMode } from "../config/apiConfig";
import { useAuthStore } from "../stores/authStore";
import { useProfileStore } from "../stores/profileStore";

const MAX_NAME_LENGTH = 16;

/**
 * 初回起動時に表示するログイン（開始）画面。
 * バックエンド無しのローカルMVPのため、ここでは端末内プロフィールを作成するだけ。
 */
export const LoginScreen = () => {
  const completeLogin = useProfileStore((state) => state.completeLogin);
  const login = useAuthStore((state) => state.login);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = () => {
    if (submitting) return;
    setSubmitting(true);
    setLoginError(null);
    void (async () => {
      try {
        const res = await login(email, password);
        if (res.ok) {
          await completeLogin();
        } else {
          setLoginError(res.message);
        }
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const handleStart = (displayName?: string) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    void (async () => {
      try {
        await completeLogin(displayName);
      } finally {
        setSubmitting(false);
      }
    })();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <MonsterAvatar familyId="fox" size={96} showRarity={false} showElementFrame={false} />
            <Text style={styles.logo}>
              WORLD<Text style={styles.logoGreen}>AWN</Text>
            </Text>
            <Text style={styles.tagline}>{APP_INFO.tagline}</Text>
            <Text style={styles.subTagline}>{APP_INFO.subTagline}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>はじめまして！</Text>
            <Text style={styles.cardBody}>
              マイページや共有カードに表示する名前を決めましょう。あとでマイページから変更できます。
            </Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(text) => setName(text.slice(0, MAX_NAME_LENGTH))}
              placeholder="トレーナー名（任意）"
              placeholderTextColor="#94A3B8"
              maxLength={MAX_NAME_LENGTH}
              returnKeyType="done"
              onSubmitEditing={() => handleStart(name)}
            />
            <Text style={styles.counter}>{name.length} / {MAX_NAME_LENGTH}</Text>

            <PrimaryButton
              label={name.trim().length > 0 ? `${name.trim()} ではじめる` : "はじめる"}
              loading={submitting}
              onPress={() => handleStart(name)}
            />
            <PrimaryButton label="名前は後で決める" variant="ghost" disabled={submitting} onPress={() => handleStart(undefined)} />
          </View>

          {isServerMode ? (
            <View style={styles.card}>
              {showLogin ? (
                <>
                  <Text style={styles.cardTitle}>ログインしてはじめる</Text>
                  <Text style={styles.cardBody}>以前アカウント連携した方は、ログインで発見記録を引き継げます。</Text>
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
                    placeholder="パスワード"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                  />
                  {loginError ? <Text style={styles.error}>{loginError}</Text> : null}
                  <PrimaryButton label="ログイン" loading={submitting} onPress={handleLogin} />
                  <PrimaryButton label="やめる" variant="ghost" onPress={() => setShowLogin(false)} />
                </>
              ) : (
                <PrimaryButton label="アカウントをお持ちの方はログイン" variant="secondary" onPress={() => setShowLogin(true)} />
              )}
            </View>
          ) : null}

          <Text style={styles.notice}>
            {isServerMode
              ? "ゲストではじめられます。あとから設定＞アカウントで連携すれば、端末変更でも引き継げます。"
              : "データはこの端末内に保存されます（現在サーバー未接続）。"}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFF"
  },
  flex: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    gap: 22
  },
  hero: {
    alignItems: "center",
    gap: 8
  },
  logo: {
    color: "#071B46",
    fontSize: 44,
    fontWeight: "900",
    marginTop: 6
  },
  logoGreen: {
    color: "#35AD4D"
  },
  tagline: {
    color: "#0F172A",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  subTagline: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  card: {
    gap: 12,
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  cardTitle: {
    color: "#071B46",
    fontSize: 20,
    fontWeight: "900"
  },
  cardBody: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  input: {
    height: 52,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  counter: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "right",
    marginTop: -4
  },
  notice: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    textAlign: "center"
  },
  error: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "800"
  }
});
