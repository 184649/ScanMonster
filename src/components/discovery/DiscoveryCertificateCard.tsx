/**
 * 発見証明カード（仕様 §18）。生コード値・sourceHash・商品名・正確な時刻/位置は表示しない。
 * フル表示は「公式発見証明書」風の意匠（濃紺＋金の二重縁・Dメダリオン・番号バナー＋記念シール・項目グリッド・署名）。
 * compact 表示は一覧向けの簡易行。
 */
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { MonsterAvatar } from "../MonsterAvatar";
import { CHARACTER_TITLE_LABELS, DIFFICULTY_COLORS, NUMBER_VALUE_RANK_LABELS } from "../../data/discoveryLabels";
import { WORLD_GROUP_LABELS } from "../../data/worlds";
import { formatDiscoveryNo } from "../../services/numberValue.core";
import type { DiscoveryRecord } from "../../types/discoveryRecord";
import type { WorldGroup } from "../../types/worlds";
import { formatDateTime } from "../../utils/dateUtils";
import { colors } from "../../theme";

const SERIF = Platform.select({ ios: "Georgia", android: "serif", default: "serif" });
const NAVY = "#0B1B3B";
const NAVY_2 = "#132a55";
const GOLD = "#C6A15B";
const GOLD_LIGHT = "#EBD79B";
const GOLD_DEEP = "#9C7B33";
const CREAM = "#F5EEDC";
const INK = "#14213D";

const navyGrad = [NAVY_2, NAVY] as const;

const rarityLabel = (rarity: DiscoveryRecord["rarity"]): string =>
  rarity === "rare"
    ? "レア"
    : rarity === "legendary"
      ? "伝説"
      : rarity === "prefecture"
        ? "地域限定"
        : rarity === "secret"
          ? "特別" // secret はUIで明示しない
          : rarity === "friend"
            ? "フレンド"
            : "通常";

const worldLabel = (worldGroup?: string): string =>
  worldGroup && worldGroup in WORLD_GROUP_LABELS ? WORLD_GROUP_LABELS[worldGroup as WorldGroup] : "";

const WORLD_EN: Record<string, string> = {
  ground: "EARTH WORLD",
  waterside: "WATER WORLD",
  sky: "SKY WORLD",
  bug: "BUG WORLD"
};

type Props = {
  record: DiscoveryRecord;
  /** 一覧用のコンパクト表示。 */
  compact?: boolean;
  /** 代表発見証明として強調する。 */
  highlighted?: boolean;
  /** 発見回数（キャラ記録から。あれば「発見回数」項目を表示）。 */
  discoveryCount?: number;
};

const Field = ({ jp, en, value }: { jp: string; en: string; value: string }) => (
  <View style={styles.cell}>
    <Text style={styles.cellBullet}>◆</Text>
    <View style={styles.cellBody}>
      <Text style={styles.cellLabelJp}>{jp}</Text>
      <Text style={styles.cellValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.cellLabelEn}>{en}</Text>
    </View>
  </View>
);

export const DiscoveryCertificateCard = ({ record, compact = false, highlighted = false, discoveryCount }: Props) => {
  const diff = DIFFICULTY_COLORS[record.difficultyRank];
  const badge = record.primaryNumberBadge;
  const world = worldLabel(record.worldGroup);
  const isServerNo = record.numberSource === "server";

  if (compact) {
    return (
      <View style={[styles.compactRow, highlighted && styles.compactHighlighted]}>
        <MonsterAvatar imageKey={record.imageKey} size={52} showRarity={false} thumb />
        <View style={styles.compactBody}>
          <View style={styles.compactTopRow}>
            <View style={[styles.diffBadge, { backgroundColor: diff.bg }]}>
              <Text style={[styles.diffText, { color: diff.fg }]}>{record.difficultyRank}</Text>
            </View>
            <Text style={styles.compactRank}>{record.discoveryRankLabel}</Text>
            {record.strongestProof ? <Text style={styles.proofTag}>最強の証</Text> : null}
          </View>
          <Text style={styles.compactNo}>
            {record.characterName} {formatDiscoveryNo(record.characterDiscoveryNo)}
            {record.numberSource === "local" ? "（暫定）" : ""}
            {badge ? `・${badge.label}` : ""}
          </Text>
          <Text style={styles.compactMeta}>
            {formatDateTime(record.discoveredAt)}・+{record.dpGained}DP
          </Text>
        </View>
      </View>
    );
  }

  // ---- フル：公式発見証明書 ----
  const numberText = `No.${record.characterDiscoveryNo}`; // ゼロ埋めしない
  const dateDot = (record.localDate || record.discoveredAt.slice(0, 10)).replace(/-/g, ".");
  const numberValue = badge ? badge.label : "通常";
  const titleText = record.strongestProof
    ? "最強の証"
    : record.grantedCharacterTitles[0]
      ? CHARACTER_TITLE_LABELS[record.grantedCharacterTitles[0]]
      : "—";
  const worldEn = record.worldGroup ? WORLD_EN[record.worldGroup] ?? "" : "";

  const fields: { jp: string; en: string; value: string }[] = [
    { jp: "種別", en: "TYPE", value: rarityLabel(record.rarity) },
    { jp: "番号価値", en: "NUMBER VALUE", value: numberValue },
    { jp: "ワールド", en: "WORLD", value: world || "—" },
    { jp: "公式発見番号", en: "DISCOVERY NUMBER", value: numberText },
    { jp: "発見日", en: "DISCOVERY DATE", value: dateDot },
    ...(discoveryCount != null ? [{ jp: "発見回数", en: "DISCOVERY COUNT", value: `${discoveryCount}回目` }] : []),
    { jp: "発見難度", en: "RANK", value: record.difficultyRank },
    { jp: "称号", en: "TITLE", value: titleText }
  ];

  return (
    <View style={styles.frameOuter}>
      <View style={styles.frameGold}>
        <View style={styles.panel}>
          {/* メダリオン */}
          <View style={styles.medallionWrap}>
            <LinearGradient colors={navyGrad} style={styles.medallion}>
              <Text style={styles.medallionText}>D</Text>
            </LinearGradient>
          </View>

          <Text style={styles.archive}>WORLDAWN DISCOVERY ARCHIVE</Text>
          <Text style={styles.titleJp}>発見証明書</Text>
          <Text style={styles.titleEn}>OFFICIAL DISCOVERY CERTIFICATE</Text>
          <View style={styles.rule}>
            <View style={styles.ruleLine} />
            <Text style={styles.ruleDiamond}>◆</Text>
            <View style={styles.ruleLine} />
          </View>

          {/* ヒーロー */}
          <View style={styles.hero}>
            <View style={styles.heroHalo} />
            <MonsterAvatar imageKey={record.imageKey} size={92} showRarity={false} showElementFrame={false} />
          </View>

          <Text style={styles.name}>{record.characterName}</Text>
          {world ? <Text style={styles.worldJp}>{world}</Text> : null}
          {worldEn ? <Text style={styles.worldEn}>{worldEn}</Text> : null}

          {/* 番号バナー */}
          <LinearGradient colors={navyGrad} style={styles.banner}>
            <Text style={styles.bannerLabelEn}>CHARACTER DISCOVERY NUMBER</Text>
            <Text style={styles.bannerLabelJp}>世界共通公式発見番号</Text>
            <Text style={styles.bannerNo} adjustsFontSizeToFit numberOfLines={1}>
              {numberText}
            </Text>
            {badge ? (
              <View style={styles.bannerSub}>
                <Text style={styles.bannerSubText}>{badge.label}</Text>
              </View>
            ) : null}
          </LinearGradient>

          {!isServerNo ? <Text style={styles.provisional}>暫定番号（公式番号は通信時に発行）</Text> : null}

          {/* 項目グリッド */}
          <View style={styles.grid}>
            {fields.map((f) => (
              <Field key={f.jp} jp={f.jp} en={f.en} value={f.value} />
            ))}
          </View>

          {/* 署名 */}
          <Text style={styles.attest}>
            上記の通り、WORLDAWN DISCOVERY ARCHIVE に正式に記録されたことを証明します。
          </Text>
          <Text style={styles.sign}>Worldawn Archive</Text>
          <View style={styles.signLine} />
          <Text style={styles.signSub}>WORLDAWN DISCOVERY ARCHIVE ・ CHIEF RECORD KEEPER</Text>

          <View style={styles.officialSeal}>
            <Text style={styles.officialSealText}>OFFICIAL DISCOVERY RECORD</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ===== フル：証明書の枠 =====
  frameOuter: { borderRadius: 16, padding: 5, backgroundColor: NAVY },
  frameGold: { borderRadius: 13, borderWidth: 2, borderColor: GOLD, padding: 4, backgroundColor: NAVY },
  panel: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: GOLD,
    backgroundColor: CREAM,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 10,
    alignItems: "center"
  },
  medallionWrap: { position: "absolute", top: -4, alignSelf: "center", zIndex: 2 },
  medallion: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center"
  },
  medallionText: { color: GOLD_LIGHT, fontFamily: SERIF, fontSize: 20, fontWeight: "900" },
  archive: { color: GOLD_DEEP, fontSize: 8.5, fontWeight: "800", letterSpacing: 2, marginTop: 2 },
  titleJp: { color: INK, fontFamily: SERIF, fontSize: 23, fontWeight: "900", letterSpacing: 4, marginTop: 1 },
  titleEn: { color: "#8A7B52", fontSize: 8, fontWeight: "700", letterSpacing: 2, marginTop: 1 },
  rule: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginBottom: 0 },
  ruleLine: { width: 44, height: 1, backgroundColor: GOLD },
  ruleDiamond: { color: GOLD, fontSize: 9 },
  hero: { marginTop: 2, alignItems: "center", justifyContent: "center" },
  heroHalo: {
    position: "absolute",
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 1,
    borderColor: "rgba(198,161,91,0.45)"
  },
  name: { color: INK, fontFamily: SERIF, fontSize: 20, fontWeight: "900", letterSpacing: 2, marginTop: 3 },
  worldJp: { color: "#6B5B33", fontSize: 12, fontWeight: "800", marginTop: 1 },
  worldEn: { color: "#A0894E", fontSize: 8.5, fontWeight: "700", letterSpacing: 2 },

  banner: {
    alignSelf: "stretch",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: GOLD,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 8,
    alignItems: "center",
    overflow: "hidden"
  },
  bannerLabelEn: { color: GOLD, fontSize: 8, fontWeight: "800", letterSpacing: 2 },
  bannerLabelJp: { color: GOLD_LIGHT, fontSize: 11, fontWeight: "900", letterSpacing: 1, marginTop: 1 },
  bannerNo: { alignSelf: "stretch", color: GOLD_LIGHT, fontFamily: SERIF, fontSize: 30, fontWeight: "900", letterSpacing: 1, textAlign: "center", marginTop: 2 },
  bannerSub: {
    borderWidth: 1,
    borderColor: GOLD,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 3,
    marginTop: 5
  },
  bannerSubText: { color: GOLD_LIGHT, fontSize: 12, fontWeight: "900", letterSpacing: 3 },
  provisional: { color: "#9A6B1B", fontSize: 10, fontWeight: "800", marginTop: 5 },

  grid: {
    alignSelf: "stretch",
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(198,161,91,0.4)"
  },
  cell: {
    width: "50%",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 5,
    paddingRight: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(198,161,91,0.3)"
  },
  cellBullet: { color: GOLD, fontSize: 9, marginTop: 3 },
  cellBody: { flex: 1, minWidth: 0 },
  cellLabelJp: { color: "#7A6A3E", fontSize: 10, fontWeight: "800" },
  cellValue: { color: INK, fontSize: 14, fontWeight: "900", marginTop: 1 },
  cellLabelEn: { color: "#A99A6E", fontSize: 8, fontWeight: "700", letterSpacing: 1, marginTop: 1 },

  attest: { color: "#6B5B33", fontSize: 9.5, fontWeight: "700", textAlign: "center", lineHeight: 14, marginTop: 8 },
  sign: { color: INK, fontFamily: SERIF, fontSize: 16, fontStyle: "italic", fontWeight: "700", marginTop: 4 },
  signLine: { width: 130, height: 1, backgroundColor: GOLD, marginTop: 2 },
  signSub: { color: "#8A7B52", fontSize: 8, fontWeight: "700", letterSpacing: 1, marginTop: 3 },
  officialSeal: {
    marginTop: 7,
    borderWidth: 2,
    borderColor: GOLD,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: NAVY
  },
  officialSealText: { color: GOLD_LIGHT, fontSize: 9, fontWeight: "900", letterSpacing: 2 },

  // ===== compact（一覧） =====
  compactRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  compactHighlighted: { borderColor: colors.accentGold, backgroundColor: colors.accentGoldSoft },
  compactBody: { flex: 1, gap: 3, minWidth: 0 },
  compactTopRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  diffBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  diffText: { fontSize: 12, fontWeight: "900" },
  compactRank: { fontSize: 12, fontWeight: "900", color: colors.textBody },
  proofTag: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.accentGoldInk,
    backgroundColor: "#FDE68A",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    overflow: "hidden"
  },
  compactNo: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  compactMeta: { color: colors.textMuted, fontSize: 12, fontWeight: "700" }
});
