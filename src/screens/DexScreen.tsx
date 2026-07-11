/**
 * 図鑑（タブ）。検索＋カテゴリチップ＋グリッド。未発見はシルエット＋???。
 * secret は未発見時に存在を明示しない（カタログに secret を含めない＝出さない）。仕様 §7。
 */
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { CATALOG_CHARACTERS, CATALOG_LEGENDARIES } from "../data/characterCatalog.generated";
import { WORLD_GROUP_LABELS } from "../data/worlds";
import { ownedCatalogIds } from "../services/worldDex.core";
import { completedNormalWorlds, visibleLegendaryEntries } from "../services/legendaryVisibility.core";
import { monstersByCatalogId } from "../services/worldDex";
import { useMonsterStore } from "../stores/monsterStore";
import type { WorldGroup } from "../types/worlds";

type Chip = { key: string; label: string; match: (c: (typeof CATALOG_CHARACTERS)[number]) => boolean };
type CardItem = { id: string; no: number; name: string; worldGroup: string; speciesJa: string; speciesEn: string; hasImage: boolean };

const CHIPS: Chip[] = [
  { key: "all", label: "すべて", match: () => true },
  { key: "basic", label: "基本", match: (c) => c.realmGroup === "life" },
  { key: "friend", label: "フレンド", match: (c) => c.worldGroup === "friend" },
  { key: "prefecture", label: "都道府県", match: (c) => c.worldGroup === "prefecture" }
];

const worldLabel = (wg?: string) => (wg && wg in WORLD_GROUP_LABELS ? WORLD_GROUP_LABELS[wg as WorldGroup] : "");

export const DexScreen = () => {
  const navigation = useNavigation<any>();
  const monsters = useMonsterStore((s) => s.monsters);
  const [chip, setChip] = useState("all");
  const [query, setQuery] = useState("");

  const owned = useMemo(() => ownedCatalogIds(monsters), [monsters]);
  const byId = useMemo(() => monstersByCatalogId(monsters), [monsters]);

  // 伝説（§4）: そのワールドの normal を全発見したユーザーにだけ表示。未解放は存在も件数も出さない。
  const completed = useMemo(() => completedNormalWorlds(CATALOG_CHARACTERS, owned), [owned]);
  const legendaryEntries = useMemo(() => visibleLegendaryEntries(CATALOG_LEGENDARIES, owned, completed), [owned, completed]);
  const hasLegendary = legendaryEntries.length > 0;
  // 伝説チップは解放済み伝説が1体以上あるときだけ出す（＝未解放時は「伝説」という語も出さない）。
  const chips = useMemo<Chip[]>(
    () => (hasLegendary ? [...CHIPS, { key: "legendary", label: "伝説", match: () => false }] : CHIPS),
    [hasLegendary]
  );

  const isLegendaryChip = chip === "legendary";

  const data = useMemo<CardItem[]>(() => {
    const q = query.trim().toLowerCase();
    const byQuery = (c: CardItem) =>
      q.length === 0 || `${c.name} ${c.speciesJa} ${c.speciesEn}`.toLowerCase().includes(q);
    if (isLegendaryChip) {
      return legendaryEntries.map((l) => l.entry).filter(byQuery);
    }
    const active = CHIPS.find((c) => c.key === chip) ?? CHIPS[0]!;
    return CATALOG_CHARACTERS.filter((c) => c.hasImage && active.match(c)).filter(byQuery);
  }, [chip, query, isLegendaryChip, legendaryEntries]);

  const total = useMemo(() => CATALOG_CHARACTERS.filter((c) => c.hasImage).length, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.headerArea}>
        <Text style={styles.title}>図鑑</Text>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="名前やキーワードで検索"
            placeholderTextColor="#94A3B8"
          />
        </View>
        <View style={styles.chips}>
          {chips.map((c) => (
            <Pressable key={c.key} onPress={() => setChip(c.key)} style={[styles.chip, chip === c.key && styles.chipActive]}>
              <Text style={[styles.chipText, chip === c.key && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.rowWrap}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<Text style={styles.footer}>{total}件中 {data.length}件を表示中</Text>}
        renderItem={({ item }) => {
          const isOwned = owned.has(item.id);
          const monsterId = byId.get(item.id)?.id;
          // 未発見の伝説は詳細へ遷移させない（§CharacterDetail）。
          const legendaryLocked = isLegendaryChip && !isOwned;
          return (
            <Pressable
              style={[styles.card, !isOwned && styles.cardUnfound]}
              disabled={legendaryLocked}
              onPress={
                legendaryLocked
                  ? undefined
                  : () => navigation.navigate("MonsterDetail", monsterId ? { monsterId } : { catalogId: item.id })
              }
            >
              <Text style={styles.cardNo}>No.{String(item.no).padStart(3, "0")}</Text>
              <Text style={styles.cardName} numberOfLines={1}>
                {isOwned ? item.name : "???"}
              </Text>
              <View style={styles.thumb}>
                <MonsterAvatar imageKey={item.id} size={72} thumb showRarity={false} showElementFrame={false} silhouette={!isOwned} />
              </View>
              <Text style={[styles.status, isOwned ? styles.statusOwned : styles.statusUnfound]}>
                {isOwned ? "● 発見済み" : "○ 未発見"}
              </Text>
              {isOwned ? <Text style={styles.cardWorld}>{worldLabel(item.worldGroup)}</Text> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F7FAFF" },
  headerArea: { paddingHorizontal: 16, paddingTop: 6, gap: 12 },
  title: { color: "#071B46", fontSize: 24, fontWeight: "900", textAlign: "center" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  searchIcon: { fontSize: 15 },
  searchInput: { flex: 1, fontSize: 15, fontWeight: "700", color: "#0F172A" },
  chips: { flexDirection: "row", gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E2E8F0" },
  chipActive: { backgroundColor: "#1D4ED8", borderColor: "#1D4ED8" },
  chipText: { color: "#334155", fontSize: 13, fontWeight: "900" },
  chipTextActive: { color: "#FFFFFF" },
  grid: { padding: 12, paddingBottom: 24 },
  rowWrap: { gap: 8, marginBottom: 8 },
  card: {
    flex: 1,
    gap: 4,
    borderRadius: 12,
    padding: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEF2F7",
    alignItems: "flex-start"
  },
  cardUnfound: { backgroundColor: "#F8FAFC", borderStyle: "dashed" },
  cardNo: { color: "#94A3B8", fontSize: 11, fontWeight: "900" },
  cardName: { color: "#0F172A", fontSize: 14, fontWeight: "900", alignSelf: "stretch" },
  thumb: { alignSelf: "center", paddingVertical: 2 },
  status: { fontSize: 11, fontWeight: "900" },
  statusOwned: { color: "#16A34A" },
  statusUnfound: { color: "#94A3B8" },
  cardWorld: { color: "#64748B", fontSize: 10, fontWeight: "800" },
  footer: { color: "#94A3B8", fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 12 }
});
