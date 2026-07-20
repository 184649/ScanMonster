import { StyleSheet, Text, View } from "react-native";

import type { DexClass } from "../../data/characterCatalog.generated";
import {
  dexClassLabel,
  dexClassNote,
  getPublishedProfile,
  getSpeciesProfile,
  profileFieldsFor
} from "../../data/speciesProfiles";
import { fictionDisclaimerOf } from "../../types/speciesProfile";
import { colors, radius, spacing } from "../../theme";

type Props = {
  /** キャラID（character_master.json と共通の永久不変ID）。 */
  id: string;
  dexClass: DexClass;
};

/**
 * 図鑑プロフィール（科学情報）セクション。
 *
 *  - 実在生物（NORMAL/RARE/LEGEND）と空想生物（SECRET）で見出しと但し書きを変え、混同させない。
 *  - reviewStatus=confirmed かつ出典1件以上でなければ本文を出さない（未確認情報を確定情報として公開しない）。
 *  - 未調査の生きものは「準備中」とだけ表示する。推測で埋めた文章は出さない。
 */
export const SpeciesProfileSection = ({ id, dexClass }: Props) => {
  const published = getPublishedProfile(id, dexClass);
  const raw = getSpeciesProfile(id);
  const isFictional = dexClass === "SECRET";

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{isFictional ? "創作図鑑" : "図鑑情報"}</Text>
        <Text style={[styles.classBadge, isFictional && styles.classBadgeFiction]}>{dexClassLabel(dexClass)}</Text>
      </View>
      <Text style={styles.classNote}>{dexClassNote(dexClass)}</Text>

      {published ? (
        <>
          {profileFieldsFor(dexClass).map((field) => {
            const value = published[field.key];
            if (typeof value !== "string" || value.trim().length === 0) return null;
            return (
              <View key={String(field.key)} style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <Text style={styles.fieldValue}>{value}</Text>
              </View>
            );
          })}

          {isFictional ? <Text style={styles.disclaimer}>{fictionDisclaimerOf(published)}</Text> : null}

          {published.sources.length > 0 ? (
            <View style={styles.sourceBox}>
              <Text style={styles.sourceTitle}>出典</Text>
              {published.sources.map((s) => (
                <Text key={s.url} style={styles.sourceLine}>
                  {s.title}（確認日 {s.checkedAt}）
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <>
          <Text style={styles.pending}>
            {raw
              ? "この生きものの図鑑情報は監修中です。確認が済みしだい公開します。"
              : "この生きものの図鑑情報は準備中です。"}
          </Text>
          {isFictional ? <Text style={styles.disclaimer}>{fictionDisclaimerOf(raw)}</Text> : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.xs
  },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  classBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    overflow: "hidden"
  },
  classBadgeFiction: { color: colors.textSlate, backgroundColor: colors.surfaceMuted },
  classNote: { fontSize: 12, color: colors.textSlate, marginBottom: spacing.xs },
  fieldRow: { marginTop: spacing.sm },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.textSlate },
  fieldValue: { fontSize: 14, color: colors.ink, lineHeight: 21, marginTop: 2 },
  disclaimer: {
    fontSize: 12,
    color: colors.textSlate,
    lineHeight: 18,
    marginTop: spacing.md,
    fontStyle: "italic"
  },
  sourceBox: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  sourceTitle: { fontSize: 12, fontWeight: "700", color: colors.textSlate },
  sourceLine: { fontSize: 11, color: colors.textSlate, lineHeight: 17, marginTop: 2 },
  pending: { fontSize: 13, color: colors.textSlate, lineHeight: 20, marginTop: spacing.xs }
});
