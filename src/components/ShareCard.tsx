import { StyleSheet, Text, View } from "react-native";

import { APP_INFO } from "../constants/appInfo";
import { getElementMeta } from "../data/elements";
import { getFamilyById } from "../data/monsterFamilies";
import { getRareById } from "../data/rareMonsters";
import type { UserMonster } from "../types/monster";
import { MonsterAvatar } from "./MonsterAvatar";

type ShareCardProps = {
  monster: UserMonster;
  discoveredFamilies: number;
  totalFamilies: number;
  discoveredIndividuals: number;
};

const rarityStars = (rarity: number): string => "★".repeat(Math.max(1, Math.min(5, rarity)));

/**
 * SNS 共有用のカード表現。
 * 表示するのは名前・種族・レア度・図鑑進捗・一言・#WORLDAWN のみ。
 * バーコード値・正確なスキャン時刻・位置情報・sourceHash は表示しない。
 */
export const ShareCard = ({ monster, discoveredFamilies, totalFamilies, discoveredIndividuals }: ShareCardProps) => {
  const family = getFamilyById(monster.familyId);
  const rare = monster.rareId ? getRareById(monster.rareId) : undefined;
  const element = getElementMeta(monster.dna.primaryElement);
  const speciesLabel = rare ? `${family.name}のレア` : family.name;

  return (
    <View style={[styles.card, { borderColor: element.color }]}>
      <View style={styles.header}>
        <Text style={styles.logo}>
          WORLD<Text style={styles.logoGreen}>AWN</Text>
        </Text>
        <Text style={styles.tag}>{APP_INFO.hashtag}</Text>
      </View>

      <View style={[styles.imageWrap, { backgroundColor: element.softColor }]}>
        <MonsterAvatar monster={monster} size={150} showRarity={false} showElementFrame={false} />
      </View>

      <Text style={styles.name}>{monster.nickname || monster.displayName}</Text>
      <Text style={styles.species}>{speciesLabel}</Text>

      <View style={styles.metaRow}>
        <View style={[styles.chip, { backgroundColor: "#FEF3C7" }]}>
          <Text style={styles.chipText}>{rarityStars(monster.dna.rarity)}</Text>
        </View>
        <View style={[styles.chip, { backgroundColor: element.softColor }]}>
          <Text style={[styles.chipText, { color: element.color }]}>{element.label}</Text>
        </View>
      </View>

      <Text style={styles.progress}>
        図鑑 {discoveredFamilies} / {totalFamilies}
      </Text>
      <Text style={styles.tagline}>{APP_INFO.tagline}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    alignItems: "center"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "stretch"
  },
  logo: {
    color: "#071B46",
    fontSize: 20,
    fontWeight: "900"
  },
  logoGreen: {
    color: "#35AD4D"
  },
  tag: {
    color: "#2877D9",
    fontSize: 13,
    fontWeight: "900"
  },
  imageWrap: {
    width: "100%",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  name: {
    color: "#071B46",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  species: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  metaRow: {
    flexDirection: "row",
    gap: 8
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  chipText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "900"
  },
  progress: {
    color: "#071B46",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  tagline: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700"
  }
});
