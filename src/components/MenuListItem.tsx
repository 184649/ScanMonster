/**
 * メニュー等の1行アイテム（絵文字アイコン＋ラベル＋サブ＋シェブロン）。
 */
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  emoji: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  /** 準備中（タップ不可・淡色）。 */
  comingSoon?: boolean;
  /** 最終行（下線を出さない）。 */
  last?: boolean;
};

export const MenuListItem = ({ emoji, label, sub, onPress, comingSoon = false, last = false }: Props) => (
  <Pressable
    style={({ pressed }) => [styles.row, !last && styles.divider, pressed && onPress && styles.pressed]}
    onPress={comingSoon ? undefined : onPress}
    disabled={comingSoon || !onPress}
  >
    <Text style={styles.emoji}>{emoji}</Text>
    <View style={styles.body}>
      <Text style={[styles.label, comingSoon && styles.muted]}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
    {comingSoon ? <Text style={styles.badge}>準備中</Text> : onPress ? <Text style={styles.chevron}>›</Text> : null}
  </Pressable>
);

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  pressed: { backgroundColor: "#F8FAFC" },
  emoji: { fontSize: 20, width: 26, textAlign: "center" },
  body: { flex: 1, gap: 2, minWidth: 0 },
  label: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  muted: { color: "#94A3B8" },
  sub: { color: "#64748B", fontSize: 12, fontWeight: "700" },
  chevron: { color: "#CBD5E1", fontSize: 24, fontWeight: "900" },
  badge: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "900",
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: "hidden"
  }
});
