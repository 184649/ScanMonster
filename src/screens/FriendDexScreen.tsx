import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { Camera, Sparkles } from "../components/icons";
import { PrimaryButton } from "../components/PrimaryButton";
import { useProfileStore } from "../stores/profileStore";
import { formatFriendCode } from "../utils/friendCode";
import { formatDateTime } from "../utils/dateUtils";
import { colors } from "../theme";

/**
 * フレンド図鑑：フレンドQRでつながった相手ごとに1枠。
 * 通常図鑑・レア図鑑とは完全に分離し、完成率にも影響しない。
 * フレンドQR限定キャラは検討中のため、現状はすべて pending（キャラ名・画像は固定しない）。
 */
export const FriendDexScreen = () => {
  const navigation = useNavigation<any>();
  const profile = useProfileStore((state) => state.profile);
  const friends = profile?.friends ?? [];

  // キャラ未実装のため、現状の発見済みは常に0。
  const discoveredCount = 0;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>特別な記録</Text>
          <Text style={styles.title}>フレンド図鑑</Text>
          <Text style={styles.subtitle}>友達とのつながりから見つかる、特別な記録です。</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>つながった友達</Text>
            <Text style={styles.statValue}>{friends.length}人</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>発見済み</Text>
            <Text style={styles.statValue}>{discoveredCount} / {friends.length}</Text>
          </View>
        </View>

        {friends.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>まだつながりがありません</Text>
            <Text style={styles.emptyText}>
              フレンドQRを読み取ると、ここに友達とのつながりが記録されます。{"\n"}
              フレンドQR限定のいきものは今後追加予定です。
            </Text>
            <PrimaryButton label="フレンドQRを読み取る" icon={Camera} onPress={() => navigation.navigate("FriendQrScan")} />
            <PrimaryButton label="友達を招待・フレンド" icon={Sparkles} variant="ghost" onPress={() => navigation.navigate("FriendInvite")} />
          </View>
        ) : (
          friends.map((friend) => {
            const name = friend.displayName?.trim() || "フレンド";
            return (
              <View key={friend.friendCode} style={styles.entryCard}>
                <View style={styles.entryAvatar}>
                  <Text style={styles.entryAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>
                </View>
                <View style={styles.entryBody}>
                  <Text style={styles.entryTitle}>{name}さんとのつながり</Text>
                  <Text style={styles.entryText}>
                    フレンドQRを読み取りました。{"\n"}特別ないきものは今後追加予定です。
                  </Text>
                  <View style={styles.entryMetaRow}>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>未実装（今後追加）</Text>
                    </View>
                    <Text style={styles.entryMeta}>{formatFriendCode(friend.friendCode)}・{formatDateTime(friend.addedAt)}</Text>
                  </View>
                </View>
              </View>
            );
          })
        )}

        <Text style={styles.footnote}>
          フレンド図鑑は通常図鑑・レア図鑑とは分かれており、通常図鑑の完成率には影響しません。表示するのはニックネームのみで、本名やメールアドレスは扱いません。
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.screenBg
  },
  content: {
    padding: 18,
    gap: 14,
    paddingBottom: 36
  },
  header: {
    gap: 6
  },
  kicker: {
    color: "#7C3AED",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "900"
  },
  subtitle: {
    color: "#5B6A83",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  statCard: {
    flexDirection: "row",
    gap: 12
  },
  statBox: {
    flex: 1,
    gap: 4,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE"
  },
  statLabel: {
    color: "#6D28D9",
    fontSize: 12,
    fontWeight: "900"
  },
  statValue: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: "900"
  },
  emptyCard: {
    gap: 12,
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  emptyTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "700"
  },
  entryCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  entryAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDE9FE"
  },
  entryAvatarText: {
    color: "#6D28D9",
    fontSize: 18,
    fontWeight: "900"
  },
  entryBody: {
    flex: 1,
    gap: 6,
    minWidth: 0
  },
  entryTitle: {
    color: colors.navy,
    fontSize: 16,
    fontWeight: "900"
  },
  entryText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },
  entryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap"
  },
  pendingBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.borderFaint
  },
  pendingText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900"
  },
  entryMeta: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: "800"
  },
  footnote: {
    color: colors.textFaint,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  }
});
