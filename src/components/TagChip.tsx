import { StyleSheet, Text, View } from "react-native";

type TagChipProps = {
  label: string;
  color?: string;
};

export const TagChip = ({ label, color = "#DBEAFE" }: TagChipProps) => {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  text: {
    color: "#16324F",
    fontSize: 12,
    fontWeight: "700"
  }
});
