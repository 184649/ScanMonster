import { StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../PrimaryButton";

type ComingSoonProps = {
  title?: string;
  message?: string;
  onClose?: () => void;
  onHome?: () => void;
};

export const ComingSoon = ({
  title = "近日公開",
  message = "この機能は今後のアップデートで追加予定です。",
  onClose,
  onHome
}: ComingSoonProps) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onHome ? <PrimaryButton label="ホームへ戻る" onPress={onHome} /> : null}
      {onClose ? <PrimaryButton label="閉じる" variant="ghost" onPress={onClose} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  title: {
    color: "#071B46",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    color: "#52627A",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    textAlign: "center"
  }
});
