/**
 * 要望掲示板（§機能改善/要望投稿・リアクション・一覧）。
 * 投稿・人気/新着の一覧・リアクション（トグル）。サーバー接続が前提。
 */
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { isServerMode } from "../config/apiConfig";
import { getFeatureRequests, postFeatureRequest, postReaction, type FeatureRequestItem } from "../services/apiClient";
import { getActiveServerUserId } from "../services/activeUser";
import { playSound } from "../services/soundService";
import { useMonsterStore } from "../stores/monsterStore";
import { colors } from "../theme";

export const FeatureBoardScreen = () => {
  const userSalt = useMonsterStore((s) => s.userSalt);
  const [items, setItems] = useState<FeatureRequestItem[]>([]);
  const [sort, setSort] = useState<"top" | "new">("top");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const userId = () => getActiveServerUserId(userSalt);

  const load = useCallback(
    async (nextSort: "top" | "new") => {
      if (!isServerMode) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getFeatureRequests(userId(), nextSort);
        setItems(res.requests);
      } catch {
        setError("読み込みに失敗しました。通信状況を確認してください。");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useFocusEffect(
    useCallback(() => {
      void load(sort);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sort])
  );

  const submit = () => {
    if (submitting) return;
    if (title.trim().length < 3) {
      setError("タイトルは3文字以上で入力してください。");
      return;
    }
    setSubmitting(true);
    void (async () => {
      try {
        await postFeatureRequest(userId(), { title: title.trim(), body: body.trim() });
        setTitle("");
        setBody("");
        playSound("tap");
        await load(sort);
      } catch {
        setError("投稿に失敗しました。");
      } finally {
        setSubmitting(false);
      }
    })();
  };

  const react = (item: FeatureRequestItem) => {
    // 楽観更新。
    setItems((prev) =>
      prev.map((r) =>
        r.id === item.id
          ? { ...r, reactedByMe: !r.reactedByMe, reactionCount: r.reactionCount + (r.reactedByMe ? -1 : 1) }
          : r
      )
    );
    playSound("favorite");
    void (async () => {
      try {
        const res = await postReaction(userId(), item.id);
        setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, reactedByMe: res.reacted, reactionCount: res.count } : r)));
      } catch {
        await load(sort);
      }
    })();
  };

  if (!isServerMode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
        <View style={styles.center}>
          <Text style={styles.title}>要望掲示板</Text>
          <Text style={styles.notice}>掲示板はサーバー接続が必要です（EXPO_PUBLIC_API_BASE_URL 未設定）。</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.kicker}>みんなで作る WORLDAWN</Text>
          <Text style={styles.title}>要望掲示板</Text>
          <Text style={styles.subtitle}>ほしい機能・改善アイデアを投稿し、共感したものにリアクションできます。</Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>要望を投稿</Text>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="タイトル（例：ダークモードが欲しい）" placeholderTextColor={colors.textFaint} maxLength={120} />
          <TextInput style={[styles.input, styles.inputMulti]} value={body} onChangeText={setBody} placeholder="詳しい説明（任意）" placeholderTextColor={colors.textFaint} multiline maxLength={2000} />
          <PrimaryButton label="投稿する" loading={submitting} onPress={submit} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.sortRow}>
          <Pressable onPress={() => setSort("top")} style={[styles.sortBtn, sort === "top" && styles.sortActive]}>
            <Text style={[styles.sortText, sort === "top" && styles.sortTextActive]}>人気</Text>
          </Pressable>
          <Pressable onPress={() => setSort("new")} style={[styles.sortBtn, sort === "new" && styles.sortActive]}>
            <Text style={[styles.sortText, sort === "new" && styles.sortTextActive]}>新着</Text>
          </Pressable>
        </View>

        {loading ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} /> : null}
        {!loading && items.length === 0 ? <Text style={styles.empty}>まだ投稿がありません。最初の要望を投稿しましょう。</Text> : null}

        {items.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              {item.body ? <Text style={styles.cardText}>{item.body}</Text> : null}
              <Text style={styles.cardMeta}>{item.mine ? "自分の投稿" : ""}</Text>
            </View>
            <Pressable onPress={() => react(item)} style={[styles.reactBtn, item.reactedByMe && styles.reactActive]}>
              <Text style={[styles.reactIcon, item.reactedByMe && styles.reactIconActive]}>▲</Text>
              <Text style={[styles.reactCount, item.reactedByMe && styles.reactIconActive]}>{item.reactionCount}</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  header: { gap: 6 },
  kicker: { color: colors.success, fontSize: 12, fontWeight: "900" },
  title: { color: colors.navy, fontSize: 30, fontWeight: "900" },
  subtitle: { color: colors.textSlate, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  notice: { color: colors.accentGoldInk, fontSize: 14, fontWeight: "800", textAlign: "center" },
  panel: { gap: 10, borderRadius: 12, padding: 16, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.navy, fontSize: 17, fontWeight: "900" },
  input: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: "700",
    color: colors.ink,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: "#CBD5E1"
  },
  inputMulti: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#B91C1C", fontSize: 13, fontWeight: "800", textAlign: "center" },
  sortRow: { flexDirection: "row", gap: 8 },
  sortBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: colors.primarySoft },
  sortActive: { backgroundColor: colors.primary },
  sortText: { color: colors.primaryInk, fontSize: 13, fontWeight: "900" },
  sortTextActive: { color: "#FFFFFF" },
  empty: { color: colors.textMuted, fontSize: 14, fontWeight: "700", textAlign: "center", padding: 20 },
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center"
  },
  cardBody: { flex: 1, gap: 3, minWidth: 0 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: "900" },
  cardText: { color: colors.textBody, fontSize: 13, fontWeight: "700", lineHeight: 19 },
  cardMeta: { color: colors.textFaint, fontSize: 11, fontWeight: "800" },
  reactBtn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    borderRadius: 10,
    paddingVertical: 8,
    backgroundColor: colors.borderFaint,
    borderWidth: 1,
    borderColor: colors.border
  },
  reactActive: { backgroundColor: colors.successSoft, borderColor: "#86EFAC" },
  reactIcon: { color: colors.textMuted, fontSize: 14, fontWeight: "900" },
  reactIconActive: { color: colors.successDark },
  reactCount: { color: colors.textBody, fontSize: 15, fontWeight: "900" }
});
