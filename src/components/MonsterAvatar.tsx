import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { getMonsterImageSource } from "../assets/monsterImages";
import { getElementMeta } from "../data/elements";
import { getFamilyById, MONSTER_FAMILIES } from "../data/monsterFamilies";
import { getRareById } from "../data/rareMonsters";
import { resolveCharacterPresentation } from "../services/characterPresentationResolver";
import type { ElementType, MonsterFamily, RareMonster, UserMonster } from "../types/monster";
import { colors } from "../theme";

type MonsterAvatarProps = {
  familyId?: string;
  rareId?: string;
  imageKey?: string;
  /** 明示的な画像ソース（姿画像など）。指定時は imageKey 解決より優先。 */
  source?: ImageSourcePropType;
  monster?: UserMonster;
  size?: number;
  showRarity?: boolean;
  showElementFrame?: boolean;
  /** タイル背景色の上書き。背景画像を後ろに敷く場合は "transparent" を渡す。 */
  backgroundColor?: string;
  /** 図鑑グリッドなど小サイズ表示では縮小サムネを使う（無ければ原画へフォールバック）。 */
  thumb?: boolean;
  silhouette?: boolean;
};

type FallbackVisualProps = {
  emoji: string;
  label: string;
  no?: number;
  elementColor: string;
  elementSoftColor: string;
  size: number;
};

const getRarityText = (rarity?: number): string => {
  if (!rarity) {
    return "";
  }

  return "★".repeat(Math.max(1, Math.min(5, rarity)));
};

const FallbackVisual = ({ emoji, label, no, elementColor, elementSoftColor, size }: FallbackVisualProps) => {
  const emojiSize = Math.max(22, size * 0.42);
  const labelFontSize = Math.max(9, size * 0.1);
  const badgeSize = Math.max(22, size * 0.26);

  return (
    <View style={styles.fallbackRoot}>
      <View
        style={[
          styles.signalRing,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size,
            borderColor: elementColor
          }
        ]}
      />
      {emoji ? (
        <Text style={{ fontSize: emojiSize }} numberOfLines={1}>
          {emoji}
        </Text>
      ) : null}
      {no ? (
        <View
          style={[
            styles.noBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: elementSoftColor,
              borderColor: elementColor
            }
          ]}
        >
          <Text style={[styles.noText, { color: elementColor, fontSize: Math.max(9, size * 0.085) }]}>
            {no.toString().padStart(2, "0")}
          </Text>
        </View>
      ) : null}
      <View style={[styles.labelBadge, { backgroundColor: elementSoftColor }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.labelText, { color: elementColor, fontSize: labelFontSize }]}>
          {label}
        </Text>
      </View>
    </View>
  );
};

export const MonsterAvatar = ({
  familyId,
  rareId,
  imageKey,
  source,
  monster,
  size = 96,
  showRarity = true,
  showElementFrame = true,
  backgroundColor,
  thumb = false,
  silhouette = false
}: MonsterAvatarProps) => {
  const resolvedRareId = rareId ?? monster?.rareId;
  const rare: RareMonster | undefined = resolvedRareId ? getRareById(resolvedRareId) : undefined;

  const resolvedFamilyId = familyId ?? monster?.familyId ?? rare?.baseFamilyId ?? MONSTER_FAMILIES[0]!.id;
  const family: MonsterFamily = getFamilyById(resolvedFamilyId);

  const resolvedImageKey = imageKey ?? monster?.imageKey ?? rare?.imageKey ?? family.imageKey;
  const presentation = resolveCharacterPresentation(resolvedImageKey);
  // presentation resolver の現行画像を優先し、対象外の旧個体だけ旧マニフェストへ戻す。
  const catalogImage = thumb ? presentation?.thumbnailSource : presentation?.imageSource;
  const imageSource = source ?? catalogImage ?? getMonsterImageSource(resolvedImageKey);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageSource]);

  const elementType: ElementType = monster?.dna.primaryElement ?? rare?.defaultElement ?? family.defaultElement;
  const element = getElementMeta(elementType);
  const rarityText = getRarityText(monster?.dna.rarity ?? rare?.rarity);

  const fallbackEmoji = presentation ? "" : rare?.emoji ?? family.emoji;
  const fallbackLabel = presentation?.motifName ?? presentation?.displayName ?? rare?.displayName ?? family.baseAnimalName;

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderColor: showElementFrame ? element.color : "transparent",
          backgroundColor: backgroundColor ?? element.softColor
        }
      ]}
    >
      {imageSource && !imageFailed ? (
        <Image
          source={imageSource}
          style={[styles.image, silhouette && styles.silhouetteImage]}
          resizeMode="contain"
          fadeDuration={0}
          accessibilityLabel={presentation?.altText ?? fallbackLabel}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <FallbackVisual
          emoji={fallbackEmoji}
          label={fallbackLabel}
          no={presentation || rare ? undefined : family.no}
          elementColor={element.color}
          elementSoftColor={element.softColor}
          size={size}
        />
      )}
      {showRarity && rarityText ? (
        <View style={styles.rarityBadge}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={styles.rarityText}>
            {rarityText}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  frame: {
    borderRadius: 8,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  image: {
    width: "96%",
    height: "96%"
  },
  silhouetteImage: {
    opacity: 0.68,
    tintColor: colors.textBody
  },
  fallbackRoot: {
    position: "relative",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  signalRing: {
    position: "absolute",
    borderWidth: 2,
    opacity: 0.3
  },
  noBadge: {
    position: "absolute",
    left: 6,
    top: 6,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  noText: {
    fontWeight: "900"
  },
  labelBadge: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 7,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  labelText: {
    fontWeight: "900",
    textAlign: "center"
  },
  rarityBadge: {
    position: "absolute",
    right: 6,
    top: 6,
    maxWidth: "58%",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: "rgba(7, 27, 70, 0.82)"
  },
  rarityText: {
    color: colors.warn,
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  }
});
