import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

import { SCAN_CATEGORY_EMOJI, SCAN_CATEGORY_LABELS, SCAN_CATEGORY_ORDER } from "../data/economy";
import type { ScanCategory } from "../types/category";
import { colors } from "../theme";

type CategoryPickerProps = {
  value: ScanCategory;
  onSelect: (category: ScanCategory) => void;
  /** qr を選択肢から除くか（バーコード発見の変更時など）。既定は全表示。 */
  hideQr?: boolean;
};

/** 発見カテゴリを選ぶ横スクロールのチップ列。 */
export const CategoryPicker = ({ value, onSelect, hideQr = false }: CategoryPickerProps) => {
  const categories = hideQr ? SCAN_CATEGORY_ORDER.filter((category) => category !== "qr") : SCAN_CATEGORY_ORDER;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {categories.map((category) => {
        const selected = category === value;
        return (
          <Pressable
            key={category}
            accessibilityRole="button"
            onPress={() => onSelect(category)}
            style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
          >
            <Text style={styles.emoji}>{SCAN_CATEGORY_EMOJI[category]}</Text>
            <Text style={[styles.label, selected && styles.labelSelected]}>{SCAN_CATEGORY_LABELS[category]}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 12
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.borderFaint,
    borderWidth: 1.4,
    borderColor: colors.border
  },
  chipSelected: {
    backgroundColor: "#EAF7ED",
    borderColor: colors.success
  },
  pressed: {
    opacity: 0.7
  },
  emoji: {
    fontSize: 16
  },
  label: {
    color: colors.textBody,
    fontSize: 13,
    fontWeight: "800"
  },
  labelSelected: {
    color: colors.successDark,
    fontWeight: "900"
  }
});
