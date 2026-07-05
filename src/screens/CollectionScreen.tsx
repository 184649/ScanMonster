import { Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useState } from "react";

import { TOTAL_INDIVIDUAL_VARIANT_GOAL } from "../assets/monsterImages";
import { EmptyState } from "../components/EmptyState";
import { Filter, Search } from "../components/icons";
import { MonsterAvatar } from "../components/MonsterAvatar";
import { ELEMENTS } from "../data/elements";
import { REGIONS } from "../data/regions";
import { filterMonsters, sortMonsters, type CollectionFilters, type CollectionSortKey } from "../services/collectionService";
import { useMonsterStore } from "../stores/monsterStore";
import type { ElementType, UserMonster } from "../types/monster";
import type { RegionKey } from "../types/region";
import { getMonsterDisplayNameWithForm } from "../utils/formStage";

const screenWidth = Dimensions.get("window").width;
const CARD_GAP = 12;
const CARD_WIDTH = Math.floor((screenWidth - 36 - CARD_GAP) / 2);

type MonsterGridCardProps = {
  monster: UserMonster;
  displayName: string;
  onPress: () => void;
};

type FilterChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const getShortDate = (isoString: string): string => {
  const date = new Date(isoString);
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

const MonsterGridCard = ({ monster, displayName, onPress }: MonsterGridCardProps) => {
  const primary = ELEMENTS.find((element) => element.key === monster.dna.primaryElement) ?? ELEMENTS[0]!;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.monsterGridCard, { borderColor: primary.color }, pressed && styles.pressed]}
    >
      <Text style={[styles.rarity, { color: primary.color }]}>★ {monster.dna.rarity}</Text>
      <MonsterAvatar monster={monster} size={CARD_WIDTH - 28} showRarity={false} showElementFrame={false} />
      <Text numberOfLines={1} style={styles.monsterName}>{displayName}</Text>
      <Text numberOfLines={1} style={styles.variantName}>{monster.dna.contextVariant.variantName}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>{getShortDate(monster.obtainedAt)}</Text>
        <View style={[styles.elementBadge, { borderColor: primary.color, backgroundColor: primary.softColor }]}>
          <Text style={[styles.elementText, { color: primary.color }]}>{primary.label.slice(0, 1)}</Text>
        </View>
      </View>
    </Pressable>
  );
};

const FilterChip = ({ label, active, onPress }: FilterChipProps) => (
  <Pressable accessibilityRole="button" onPress={onPress} style={[styles.filterChip, active && styles.filterChipActive]}>
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </Pressable>
);

export const CollectionScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((state) => state.monsters);
  const economy = useMonsterStore((state) => state.economy);
  const [sortKey, setSortKey] = useState<CollectionSortKey>("obtainedDesc");
  const [filters, setFilters] = useState<CollectionFilters>({});

  const visibleMonsters = useMemo(() => sortMonsters(filterMonsters(monsters, filters), sortKey), [filters, monsters, sortKey]);
  const recentMonsters = monsters.slice(0, 4);
  const rareCounts = [1, 2, 3, 4, 5].map((rarity) => monsters.filter((monster) => monster.dna.rarity === rarity).length);

  const setFilter = <K extends keyof CollectionFilters>(key: K, value: CollectionFilters[K]) => {
    setFilters((current) => {
      const next = { ...current };

      if (current[key] === value) {
        delete next[key];
      } else {
        next[key] = value;
      }

      return next;
    });
  };

  const toggleFavoriteFilter = () => {
    setFilters((current) => {
      const next = { ...current };

      if (next.favoriteOnly) {
        delete next.favoriteOnly;
      } else {
        next.favoriteOnly = true;
      }

      return next;
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>個体コレクション</Text>
          <Text style={styles.progressText}>
            <Text style={styles.progressStrong}>{monsters.length}</Text> / {TOTAL_INDIVIDUAL_VARIANT_GOAL} 個体
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <FilterChip label="すべて" active={Object.keys(filters).length === 0} onPress={() => setFilters({})} />
          <FilterChip label="お気に入り" active={filters.favoriteOnly === true} onPress={toggleFavoriteFilter} />
          {ELEMENTS.slice(0, 6).map((element) => (
            <FilterChip
              key={element.key}
              label={element.label}
              active={filters.element === element.key}
              onPress={() => setFilter("element", element.key as ElementType)}
            />
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {REGIONS.filter((region) => region.key !== "unknown").slice(0, 5).map((region) => (
            <FilterChip
              key={region.key}
              label={region.shortName}
              active={filters.regionKey === region.key}
              onPress={() => setFilter("regionKey", region.key as RegionKey)}
            />
          ))}
          <FilterChip
            label={sortKey === "obtainedDesc" ? "入手順" : "レア順"}
            active
            onPress={() => setSortKey(sortKey === "obtainedDesc" ? "rarityDesc" : "obtainedDesc")}
          />
          <View style={styles.filterIcon}>
            <Filter color="#071B46" size={18} strokeWidth={2.4} />
          </View>
        </ScrollView>

        {recentMonsters.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>最近仲間にした個体</Text>
              <Text style={styles.moreText}>もっと見る ›</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRow}>
              {recentMonsters.map((monster) => (
                <MonsterGridCard
                  key={monster.id}
                  monster={monster}
                  displayName={getMonsterDisplayNameWithForm(monster, economy)}
                  onPress={() => navigation.navigate("MonsterDetail", { monsterId: monster.id })}
                />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>コレクション中の個体</Text>
          <Text style={styles.moreText}>並び替え: {sortKey === "obtainedDesc" ? "入手順" : "レア順"}</Text>
        </View>

        {visibleMonsters.length === 0 ? (
          <EmptyState
            title="表示できる個体がありません"
            message="条件を変えるか、新しいコードをスキャンしてコレクションを増やしてください。"
            icon={Search}
          />
        ) : (
          <View style={styles.grid}>
            {visibleMonsters.map((monster) => (
              <MonsterGridCard
                key={monster.id}
                monster={monster}
                displayName={getMonsterDisplayNameWithForm(monster, economy)}
                onPress={() => navigation.navigate("MonsterDetail", { monsterId: monster.id })}
              />
            ))}
          </View>
        )}

        <View style={styles.raritySummary}>
          {rareCounts.map((count, index) => (
            <Text key={index} style={styles.raritySummaryText}>★{index + 1} {count}種</Text>
          ))}
          <Text style={styles.raritySummaryText}>所持数 {monsters.length} / {TOTAL_INDIVIDUAL_VARIANT_GOAL}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFF"
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 36
  },
  header: {
    alignItems: "center",
    gap: 6
  },
  title: {
    color: "#071B46",
    fontSize: 32,
    fontWeight: "900"
  },
  progressText: {
    color: "#52627A",
    fontSize: 16,
    fontWeight: "900"
  },
  progressStrong: {
    color: "#2FA84F"
  },
  filterRow: {
    gap: 10,
    paddingRight: 18
  },
  filterChip: {
    minHeight: 42,
    paddingHorizontal: 17,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA"
  },
  filterChipActive: {
    backgroundColor: "#2FA84F",
    borderColor: "#2FA84F"
  },
  filterText: {
    color: "#071B46",
    fontSize: 13,
    fontWeight: "900"
  },
  filterTextActive: {
    color: "#FFFFFF"
  },
  filterIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA"
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  sectionTitle: {
    color: "#071B46",
    fontSize: 19,
    fontWeight: "900"
  },
  moreText: {
    color: "#52627A",
    fontSize: 13,
    fontWeight: "900"
  },
  recentRow: {
    gap: 12,
    paddingRight: 18
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP
  },
  monsterGridCard: {
    width: CARD_WIDTH,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.2,
    gap: 5
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  rarity: {
    fontSize: 13,
    fontWeight: "900"
  },
  monsterName: {
    color: "#071B46",
    fontSize: 15,
    fontWeight: "900"
  },
  variantName: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800"
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  dateText: {
    color: "#071B46",
    fontSize: 12,
    fontWeight: "800"
  },
  elementBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center"
  },
  elementText: {
    fontSize: 12,
    fontWeight: "900"
  },
  raritySummary: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  raritySummaryText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900"
  }
});
