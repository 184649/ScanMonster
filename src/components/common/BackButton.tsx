import { Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { goBackOrHome, type SafeNavigation } from "../../utils/navigation";

type BackButtonProps = {
  navigation?: SafeNavigation;
  label?: string;
};

export const BackButton = ({ navigation, label = "戻る" }: BackButtonProps) => {
  const hookNavigation = useNavigation<any>();
  const resolvedNavigation = navigation ?? hookNavigation;

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => goBackOrHome(resolvedNavigation)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <View style={styles.pill}>
        <Text style={styles.chevron}>‹</Text>
        <Text style={styles.text}>{label}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    justifyContent: "center",
    paddingLeft: 4
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#EEF2F7"
  },
  pressed: {
    opacity: 0.65
  },
  chevron: {
    color: "#071B46",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: -1
  },
  text: {
    color: "#071B46",
    fontSize: 14,
    fontWeight: "900"
  }
});
