import type { ComponentType } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { playSound } from "../services/soundService";
import type { SoundId } from "../types/sound";

type IconProps = {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ComponentType<IconProps>;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  loading?: boolean;
  /** 押下時に鳴らすSE。既定は "tap"。専用SEを別途鳴らす箇所は "none" で二重再生を防ぐ。 */
  soundId?: SoundId | "none";
};

export const PrimaryButton = ({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled = false,
  loading = false,
  soundId = "tap"
}: PrimaryButtonProps) => {
  const isPrimary = variant === "primary";
  const isSecondary = variant === "secondary";
  const contentColor = isPrimary ? "#FFFFFF" : isSecondary ? "#0F3D70" : "#1E40AF";

  const handlePress = () => {
    if (soundId !== "none") {
      playSound(soundId);
    }
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === "ghost" && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={contentColor} />
        ) : (
          <>
            {Icon ? <Icon color={contentColor} size={20} strokeWidth={2.4} /> : null}
            <Text style={[styles.label, { color: contentColor }]}>{label}</Text>
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  primary: {
    backgroundColor: "#1D4ED8"
  },
  secondary: {
    backgroundColor: "#FACC15"
  },
  ghost: {
    backgroundColor: "#EAF2FF"
  },
  disabled: {
    opacity: 0.55
  },
  pressed: {
    transform: [{ scale: 0.98 }]
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  label: {
    fontSize: 16,
    fontWeight: "800"
  }
});
