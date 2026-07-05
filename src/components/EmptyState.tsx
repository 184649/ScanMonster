import type { ComponentType } from "react";
import { StyleSheet, Text, View } from "react-native";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type EmptyStateProps = {
  title: string;
  message: string;
  icon?: ComponentType<IconProps>;
};

export const EmptyState = ({ title, message, icon: Icon }: EmptyStateProps) => {
  return (
    <View style={styles.container}>
      {Icon ? (
        <View style={styles.iconBox}>
          <Icon color="#2563EB" size={30} strokeWidth={2.2} />
        </View>
      ) : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10
  },
  iconBox: {
    width: 58,
    height: 58,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF"
  },
  title: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900",
    textAlign: "center"
  },
  message: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center"
  }
});
