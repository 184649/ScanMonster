/**
 * セクション見出し＋カード枠の共通コンポーネント。白カード・角丸・軽い影・広めの余白。
 */
import type { ReactNode } from "react";
import { StyleSheet, Text, View, type ViewStyle } from "react-native";

type Props = {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  /** カード枠を付けない（見出しだけ or 自前カード）。 */
  bare?: boolean;
  style?: ViewStyle;
};

export const SectionCard = ({ title, right, children, bare = false, style }: Props) => (
  <View style={style}>
    {title || right ? (
      <View style={styles.header}>
        {title ? <Text style={styles.title}>{title}</Text> : <View />}
        {right}
      </View>
    ) : null}
    {bare ? children : <View style={styles.card}>{children}</View>}
  </View>
);

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  title: { color: "#94A3B8", fontSize: 13, fontWeight: "900" },
  card: {
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1
  }
});
