/**
 * 法務文書ビューア（利用規約・プライバシーポリシー）。Phase 7–8。
 * バンドル済みテキスト（src/data/legalText.ts）を表示する。
 */
import { ScrollView, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";

import { LEGAL_BODY, LEGAL_TITLES, LEGAL_UPDATED, type LegalDoc } from "../data/legalText";
import type { RootStackParamList } from "../types/navigation";
import { colors } from "../theme";

export const LegalScreen = () => {
  const route = useRoute<any>();
  const doc = ((route.params as RootStackParamList["Legal"] | undefined)?.doc ?? "terms") as LegalDoc;

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{LEGAL_TITLES[doc]}</Text>
        <Text style={styles.updated}>最終改定日: {LEGAL_UPDATED}</Text>
        <Text style={styles.body}>{LEGAL_BODY[doc]}</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 18, paddingBottom: 40, gap: 8 },
  title: { color: colors.navy, fontSize: 22, fontWeight: "900" },
  updated: { color: colors.textFaint, fontSize: 12, fontWeight: "800" },
  body: { color: colors.textBody, fontSize: 13, lineHeight: 21, fontWeight: "600", marginTop: 6 }
});
