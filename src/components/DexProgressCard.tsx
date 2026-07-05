import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type DexProgressCardProps = {
  label: string;
  value: string;
  accent?: string;
  icon?: ComponentType<IconProps>;
};

export const DexProgressCard = ({ label, value, accent = "#2563EB", icon: Icon }: DexProgressCardProps) => {
  return (
    <View style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
        {Icon ? <Icon color={accent} size={22} strokeWidth={2.4} /> : null}
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 144,
    borderRadius: 8,
    padding: 14,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  value: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900"
  }
});
