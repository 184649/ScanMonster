/**
 * キャラクター詳細の発見記録セクション（§20/§21）。
 * 記録サマリ → 代表発見証明 → （キャラメモ等のスロット）→ 取得済み発見証明（折りたたみ）。
 */
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CHARACTER_TITLE_LABELS, DIFFICULTY_COLORS } from "../../data/discoveryLabels";
import { useMonsterStore } from "../../stores/monsterStore";
import type { DifficultyRank, DiscoveryRecord } from "../../types/discoveryRecord";
import { formatFullDateTime } from "../../utils/dateUtils";
import { DiscoveryCertificateCard } from "./DiscoveryCertificateCard";
import { colors } from "../../theme";

/** 常に表示する特別な発見証明か（§20.1）。 */
const isSpecialCertificate = (record: DiscoveryRecord): boolean =>
  record.isNewForUser ||
  record.strongestProof ||
  record.rarity === "rare" ||
  record.rarity === "legendary" ||
  (record.primaryNumberBadge?.valueRank ?? "normal") !== "normal" ||
  record.grantedCharacterTitles.some((title) => title.startsWith("reunion"));

type Props = {
  characterId: string;
  fallbackFirstDiscoveredAt?: string;
  fallbackLastDiscoveredAt?: string;
  fallbackDiscoveryCount?: number;
  /** 代表発見証明の直後に差し込む要素（キャラメモ＋実在モチーフ参考値など）。 */
  belowRepresentative?: ReactNode;
};

export const CharacterRecordSection = ({
  characterId,
  fallbackFirstDiscoveredAt,
  fallbackLastDiscoveredAt,
  fallbackDiscoveryCount,
  belowRepresentative
}: Props) => {
  const [showAllCommon, setShowAllCommon] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  // zustand v5 は毎回新しい参照を返すセレクタで無限ループになるため、生配列を選んで useMemo で導出する。
  const characterRecords = useMonsterStore((state) => state.characterRecords);
  const discoveryRecords = useMonsterStore((state) => state.discoveryRecords);
  const record = useMemo(
    () => characterRecords.find((r) => r.characterId === characterId),
    [characterRecords, characterId]
  );
  const certificates = useMemo(
    () => discoveryRecords.filter((r) => r.characterId === characterId),
    [discoveryRecords, characterId]
  );

  const representative =
    (record?.representativeDiscoveryId
      ? certificates.find((c) => c.id === record.representativeDiscoveryId)
      : undefined) ?? certificates[0];

  const others = certificates.filter((c) => c.id !== representative?.id);
  const specials = others.filter(isSpecialCertificate);
  const commons = others.filter((c) => !isSpecialCertificate(c));

  const discoveryCount = record?.discoveryCount ?? fallbackDiscoveryCount ?? 1;
  const firstAt = record?.firstDiscoveredAt ?? fallbackFirstDiscoveredAt;
  const lastAt = record?.lastDiscoveredAt ?? fallbackLastDiscoveredAt;
  const bestRank: DifficultyRank | undefined = record?.bestDifficultyRank ?? representative?.difficultyRank;
  const bestDiff = bestRank ? DIFFICULTY_COLORS[bestRank] : undefined;
  const titles = record?.titles ?? [];

  return (
    <>
      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>発見記録</Text>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>発見回数</Text>
            <Text style={styles.statValue}>{discoveryCount}回</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>最高発見難度</Text>
            {bestDiff && bestRank ? (
              <View style={[styles.diffBadge, { backgroundColor: bestDiff.bg }]}>
                <Text style={[styles.diffText, { color: bestDiff.fg }]}>{bestRank}</Text>
              </View>
            ) : (
              <Text style={styles.statValue}>-</Text>
            )}
          </View>
        </View>
        <View style={styles.dateRow}>
          {firstAt ? (
            <Text style={styles.dateText}>初発見 {formatFullDateTime(firstAt)}</Text>
          ) : null}
          {lastAt ? (
            <Text style={styles.dateText}>最終発見 {formatFullDateTime(lastAt)}</Text>
          ) : null}
        </View>
        {titles.length > 0 ? (
          <View style={styles.titleRow}>
            {titles.map((title) => (
              <Text key={title} style={[styles.titleChip, title === "strongest_proof" && styles.titleChipStrongest]}>
                {CHARACTER_TITLE_LABELS[title]}
              </Text>
            ))}
          </View>
        ) : null}
      </View>

      {representative ? (
        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>代表発見証明</Text>
          <DiscoveryCertificateCard record={representative} highlighted discoveryCount={discoveryCount} />
        </View>
      ) : null}

      {/* 取得済み発見証明一覧：代表証明の直下に折りたたみ可能な一覧として配置。 */}
      {certificates.length > 0 ? (
        <View style={styles.panel}>
          <Pressable style={styles.listHeader} onPress={() => setListOpen((v) => !v)}>
            <Text style={styles.sectionTitle}>取得済み発見証明（{certificates.length}件）</Text>
            <Text style={styles.foldToggle}>{listOpen ? "閉じる ▲" : "開く ▼"}</Text>
          </Pressable>
          {listOpen ? (
            <>
              {specials.map((c) => (
                <DiscoveryCertificateCard key={c.id} record={c} compact />
              ))}
              {commons.length > 0 ? (
                showAllCommon ? (
                  commons.map((c) => <DiscoveryCertificateCard key={c.id} record={c} compact />)
                ) : (
                  <Pressable style={styles.foldButton} onPress={() => setShowAllCommon(true)}>
                    <Text style={styles.foldText}>通常再発見 {commons.length}件・すべて見る</Text>
                  </Pressable>
                )
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {belowRepresentative}
    </>
  );
};

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionTitle: { color: colors.navy, fontSize: 18, fontWeight: "900" },
  statRow: { flexDirection: "row", gap: 12 },
  stat: {
    flex: 1,
    gap: 4,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderFaint
  },
  statLabel: { color: colors.textMuted, fontSize: 12, fontWeight: "800" },
  statValue: { color: colors.navy, fontSize: 18, fontWeight: "900" },
  diffBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  diffText: { fontSize: 16, fontWeight: "900" },
  dateRow: { gap: 2 },
  dateText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  titleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  titleChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "900",
    backgroundColor: colors.primarySoft,
    color: colors.primaryInk,
    overflow: "hidden"
  },
  titleChipStrongest: { backgroundColor: "#FDE68A", color: colors.accentGoldInk },
  foldButton: { borderRadius: 8, paddingVertical: 12, alignItems: "center", backgroundColor: colors.primarySoft },
  foldText: { color: colors.primaryInk, fontSize: 14, fontWeight: "900" },
  listHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  foldToggle: { color: colors.primaryInk, fontSize: 13, fontWeight: "900" }
});
