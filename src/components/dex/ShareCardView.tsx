import { StyleSheet, Text, View } from "react-native";

import { MonsterAvatar } from "../MonsterAvatar";
import { APP_INFO } from "../../constants/appInfo";
import type { ShareCardModel } from "../../services/shareCard.core";
import { getDexPresentation } from "../../services/dexPresentation.core";
import { colors, radius, spacing } from "../../theme";

type Props = {
  model: ShareCardModel;
  /** 一覧プレビュー用に少し小さく描く。 */
  compact?: boolean;
};

/**
 * SNS シェアカードの見た目。6種類（単体発見／レア発見／ワールド完成／
 * 図鑑進捗／今日の発見／今週のコレクション）を1つのレイアウトで描く。
 *
 * 方針：
 *  - **イラストが主役**。イラストの上に文字やエフェクトを重ねない。
 *  - 余白を十分に取り、情報行は最大4行まで（SNSで一目で分かる量）。
 *  - レアリティに応じて枠とタグの色を変える（配色は dexPresentation.core と共通）。
 *  - バーコード値・座標・秒単位の時刻は**モデル側で持たない**ため、ここにも出ない。
 */
export const ShareCardView = ({ model, compact = false }: Props) => {
  const p = getDexPresentation(model.paletteClass);
  const single = model.subjects.length <= 1;
  const imageSize = compact ? (single ? 116 : 62) : single ? 168 : 82;

  return (
    <View style={[styles.card, { borderColor: p.frameColor, borderWidth: p.frameWidth }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          WORLD<Text style={styles.logoAccent}>AWN</Text>
        </Text>
        <Text style={[styles.tag, { color: p.badgeTextColor, backgroundColor: p.badgeBackgroundColor }]}>
          {model.tag}
        </Text>
      </View>

      {/* イラスト。背景は透明PNGなので、ここで淡い面を敷いて整える。 */}
      <View style={[styles.stage, { backgroundColor: p.backgroundColor }]}>
        <View style={styles.stageRow}>
          {model.subjects.map((s) => (
            <MonsterAvatar
              key={s.id}
              imageKey={s.id}
              size={imageSize}
              thumb={!single}
              showRarity={false}
              showElementFrame={false}
              backgroundColor="transparent"
            />
          ))}
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {model.title}
      </Text>
      {model.subtitle ? (
        <Text style={styles.subtitle} numberOfLines={2}>
          {model.subtitle}
        </Text>
      ) : null}

      {model.showsProgressBar ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: `${Math.max(0, Math.min(100, model.progressPercent))}%`, backgroundColor: p.frameColor }
            ]}
          />
        </View>
      ) : null}

      {model.fields.length > 0 ? (
        <View style={styles.fields}>
          {model.fields.slice(0, 4).map((f) => (
            <View key={f.label} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{f.label}</Text>
              <Text style={styles.fieldValue} numberOfLines={1}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.hashtag}>{APP_INFO.hashtag}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  logo: { fontSize: 14, fontWeight: "900", color: colors.navy, letterSpacing: 1 },
  logoAccent: { color: colors.gold },
  tag: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
    flexShrink: 1
  },
  stage: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center"
  },
  stageRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: spacing.sm, flexWrap: "wrap" },
  title: { fontSize: 18, fontWeight: "900", color: colors.ink, textAlign: "center" },
  subtitle: { fontSize: 12, fontWeight: "700", color: colors.textSlate, textAlign: "center", lineHeight: 18 },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.borderFaint,
    overflow: "hidden",
    marginTop: spacing.xs
  },
  fill: { height: "100%", borderRadius: radius.pill },
  fields: { gap: 4, marginTop: spacing.xs },
  fieldRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  fieldLabel: { fontSize: 11, fontWeight: "800", color: colors.textFaint },
  fieldValue: { fontSize: 12, fontWeight: "800", color: colors.ink, flexShrink: 1 },
  hashtag: { fontSize: 11, fontWeight: "900", color: colors.textFaint, textAlign: "center", marginTop: spacing.xs }
});
