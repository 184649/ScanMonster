import { Heart } from "./icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { getElementMeta, SEASON_LABELS, TIME_SLOT_LABELS } from "../data/elements";
import { getFamilyById } from "../data/monsterFamilies";
import type { UserMonster } from "../types/monster";
import { formatDateTime } from "../utils/dateUtils";
import { MonsterAvatar } from "./MonsterAvatar";
import { TagChip } from "./TagChip";

type MonsterCardProps = {
  monster: UserMonster;
  onPress: () => void;
  onToggleFavorite?: () => void;
  compact?: boolean;
  sameSourceCount?: number;
};

export const MonsterCard = ({
  monster,
  onPress,
  onToggleFavorite,
  compact = false,
  sameSourceCount
}: MonsterCardProps) => {
  const family = getFamilyById(monster.familyId);
  const primary = getElementMeta(monster.dna.primaryElement);
  const secondary = monster.dna.secondaryElement ? getElementMeta(monster.dna.secondaryElement) : undefined;
  const displayName = monster.nickname || monster.displayName;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <MonsterAvatar monster={monster} size={86} showRarity={false} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.nameBlock}>
            <Text numberOfLines={1} style={styles.name}>
              {displayName}
            </Text>
            <Text numberOfLines={1} style={styles.family}>
              {family.name} / {monster.dna.individualVariantName ?? monster.dna.contextVariant.variantName}
            </Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onToggleFavorite} hitSlop={12} style={styles.favoriteButton}>
            <Heart
              color={monster.favorite ? "#DC2626" : "#94A3B8"}
              fill={monster.favorite ? "#DC2626" : "transparent"}
              size={20}
              strokeWidth={2.4}
            />
          </Pressable>
        </View>
        <View style={styles.metaRow}>
          <TagChip label={`★${monster.dna.rarity}`} color="#FEF3C7" />
          {monster.dna.individualVariantName ? <TagChip label={monster.dna.individualVariantName} color="#F1F5F9" /> : null}
          <TagChip label={primary.label} color={primary.softColor} />
          {secondary ? <TagChip label={secondary.label} color={secondary.softColor} /> : null}
        </View>
        {!compact ? (
          <View style={styles.detailRow}>
            <Text style={styles.detailText}>{monster.dna.contextVariant.regionName}</Text>
            <Text style={styles.detailText}>{SEASON_LABELS[monster.dna.contextVariant.season]}</Text>
            <Text style={styles.detailText}>{TIME_SLOT_LABELS[monster.dna.contextVariant.timeSlot]}</Text>
            <Text style={styles.detailText}>{formatDateTime(monster.obtainedAt)}</Text>
          </View>
        ) : null}
        {sameSourceCount && sameSourceCount > 1 ? (
          <Text style={styles.sameSource}>同じコード由来: {sameSourceCount}体</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }]
  },
  content: {
    flex: 1,
    gap: 8,
    minWidth: 0
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8
  },
  nameBlock: {
    flex: 1,
    minWidth: 0
  },
  name: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  family: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  favoriteButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  detailText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700"
  },
  sameSource: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "800"
  }
});
