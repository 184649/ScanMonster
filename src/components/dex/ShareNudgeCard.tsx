import { Share, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "../PrimaryButton";
import { Sparkles } from "../icons";
import { colors, radius, spacing } from "../../theme";

type Props = {
  title: string;
  /** 共有する本文。undefined のときはカード自体を出さない（発見0件など）。 */
  message: string | undefined;
  /** ボタン文言。 */
  actionLabel: string;
  /** レア以上を含むときに強調表示する。 */
  emphasized?: boolean;
};

/**
 * 「今日の発見」「今週のコレクション」などの共有導線。
 *
 * 共有するものが無いときは何も表示しない（空のカードを出して押させない）。
 * 本文は shareText.core が生成し、機微情報を含まない。
 */
export const ShareNudgeCard = ({ title, message, actionLabel, emphasized = false }: Props) => {
  if (!message) return null;

  return (
    <View style={[styles.card, emphasized && styles.cardEmphasized]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.preview} numberOfLines={4}>
        {message}
      </Text>
      <PrimaryButton
        label={actionLabel}
        icon={Sparkles}
        variant={emphasized ? "primary" : "secondary"}
        onPress={() => void Share.share({ message })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm
  },
  cardEmphasized: { borderColor: colors.gold, borderWidth: 2 },
  title: { fontSize: 14, fontWeight: "900", color: colors.ink },
  preview: {
    fontSize: 12,
    color: colors.textSlate,
    lineHeight: 18,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm
  }
});
