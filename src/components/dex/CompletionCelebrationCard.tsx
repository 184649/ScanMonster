import { Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";

import { MonsterAvatar } from "../MonsterAvatar";
import { PrimaryButton } from "../PrimaryButton";
import { Sparkles } from "../icons";
import type { CompletionCelebration } from "../../services/dexPresentation.core";
import { colors, radius, spacing } from "../../theme";

type Props = {
  visible: boolean;
  celebration: CompletionCelebration | undefined;
  /** 記念カードに並べる代表生物のカタログID（ワールド完成時など）。 */
  representativeIds?: string[];
  /** 共有する本文。undefined なら共有ボタンを出さない。 */
  shareMessage?: string;
  onClose: () => void;
};

/**
 * 完成演出（ワールド完成 / 分類完成 / 初回コンプリート / 図鑑100%）。
 *
 * 通常の発見より**大きい演出**にする。ワールド完成では代表生物のイラストを並べた記念カードを出す。
 * ただしリアルイラストの上品さを壊さないよう、装飾は枠と余白で作り、
 * イラストの上へエフェクトを重ねない。
 */
export const CompletionCelebrationCard = ({
  visible,
  celebration,
  representativeIds = [],
  shareMessage,
  onClose
}: Props) => {
  if (!celebration) return null;

  const gallery = celebration.showsRepresentativeGallery ? representativeIds.slice(0, 8) : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <Text style={styles.kicker}>COMPLETE</Text>
          <Text style={styles.title}>{celebration.title}</Text>
          <Text style={styles.subtitle}>{celebration.subtitle}</Text>

          {gallery.length > 0 ? (
            <ScrollView
              horizontal={gallery.length > 4}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gallery}
            >
              {gallery.map((id) => (
                <View key={id} style={styles.galleryItem}>
                  <MonsterAvatar imageKey={id} size={64} thumb showRarity={false} showElementFrame={false} />
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            {celebration.offersShare && shareMessage ? (
              <PrimaryButton
                label="この達成を共有する"
                icon={Sparkles}
                onPress={() => void Share.share({ message: shareMessage })}
              />
            ) : null}
            <PrimaryButton label="閉じる" variant="secondary" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(7, 27, 70, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center"
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    color: colors.gold
  },
  title: { fontSize: 20, fontWeight: "900", color: colors.navy, textAlign: "center" },
  subtitle: { fontSize: 13, color: colors.textSlate, textAlign: "center", lineHeight: 20 },
  gallery: { gap: spacing.sm, paddingVertical: spacing.sm, alignItems: "center" },
  galleryItem: {
    backgroundColor: colors.borderFaint,
    borderRadius: radius.md,
    padding: 4
  },
  actions: { width: "100%", gap: spacing.sm, marginTop: spacing.sm }
});
