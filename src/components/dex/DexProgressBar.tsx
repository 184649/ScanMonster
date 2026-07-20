import { StyleSheet, Text, View } from "react-native";

import { dexProgressMessage, type DexProgress } from "../../services/dexPresentation.core";
import { colors, radius, spacing } from "../../theme";

type Props = {
  progress: DexProgress;
  /** 「あと○種」の一言を出すか。 */
  showMessage?: boolean;
};

/**
 * 図鑑の完成率を可視化する。
 *
 * 「あと何種で完成か」を常に見せて、埋めたくなる状態をつくる。
 * 完成時だけ色を変えて達成感を出す（99%までは同じ色にして、100%の特別さを保つ）。
 */
export const DexProgressBar = ({ progress, showMessage = true }: Props) => {
  const { discovered, total, percent, isComplete } = progress;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.count}>
          <Text style={[styles.countStrong, isComplete && styles.countComplete]}>{discovered}</Text>
          <Text style={styles.countTotal}> / {total}</Text>
        </Text>
        <Text style={[styles.percent, isComplete && styles.percentComplete]}>{percent}%</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${percent}%` },
            isComplete && styles.fillComplete
          ]}
        />
      </View>

      {showMessage ? (
        <Text style={[styles.message, isComplete && styles.messageComplete]}>{dexProgressMessage(progress)}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  count: { fontSize: 13, color: colors.textSlate, fontWeight: "800" },
  countStrong: { fontSize: 20, color: colors.ink, fontWeight: "900" },
  countComplete: { color: colors.success },
  countTotal: { fontSize: 13, color: colors.textFaint, fontWeight: "800" },
  percent: { fontSize: 15, fontWeight: "900", color: colors.textSlate },
  percentComplete: { color: colors.success },
  track: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.borderFaint,
    overflow: "hidden"
  },
  fill: { height: "100%", borderRadius: radius.pill, backgroundColor: colors.primary },
  fillComplete: { backgroundColor: colors.success },
  message: { fontSize: 12, color: colors.textSlate, fontWeight: "700" },
  messageComplete: { color: colors.success, fontWeight: "900" }
});
