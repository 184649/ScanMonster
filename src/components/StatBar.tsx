import { StyleSheet, Text, View, type DimensionValue } from "react-native";

type StatBarProps = {
  label: string;
  value: number;
  max?: number;
  color?: string;
};

export const StatBar = ({ label, value, max = 100, color = "#2563EB" }: StatBarProps) => {
  const width = `${Math.min(100, Math.max(8, (value / max) * 100))}%` as DimensionValue;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width, backgroundColor: color }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  label: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "800"
  },
  value: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "800"
  },
  track: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden"
  },
  fill: {
    height: "100%",
    borderRadius: 999
  }
});
