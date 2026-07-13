import { StyleSheet, Text, View } from "react-native";

import { colors, radius } from "../theme";

type TagChipProps = {
  label: string;
  color?: string;
};

export const TagChip = ({ label, color = colors.primarySoft }: TagChipProps) => {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  text: {
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700"
  }
});
