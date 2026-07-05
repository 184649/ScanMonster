import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { PrimaryButton } from "../components/PrimaryButton";
import { getCatalogCharacterById, getCatalogDescriptionById, getCatalogRareById } from "../data/catalogLookup";
import { REALM_GROUP_LABELS, WORLD_GROUP_LABELS } from "../data/worlds";
import { HABITAT_GROUP_LABELS } from "../data/habitatGroups";
import { getCharacterRarityForMonster, getFamilyHabitatGroup } from "../data/characters";
import { getFamilyById } from "../data/monsterFamilies";
import { getRareById } from "../data/rareMonsters";
import { useMonsterStore } from "../stores/monsterStore";
import type { RootStackParamList } from "../types/navigation";
import type { RealmGroup, WorldGroup } from "../types/worlds";
import { formatFullDateTime } from "../utils/dateUtils";
import { goBackOrHome } from "../utils/navigation";

const rarityLabel = {
  normal: "通常",
  rare: "レア",
  secret: "シークレット"
} as const;

export const MonsterDetailScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { monsterId, catalogId } = route.params as RootStackParamList["MonsterDetail"];
  const monster = useMonsterStore((state) => (monsterId ? state.getMonsterById(monsterId) : undefined));
  const toggleFavorite = useMonsterStore((state) => state.toggleFavorite);

  if (!monster) {
    // 未所持/デバッグ表示：カタログ情報でプレビュー表示する。
    const previewId = catalogId ?? monsterId;
    const catRare = previewId ? getCatalogRareById(previewId) : undefined;
    const cat = catRare ?? (previewId ? getCatalogCharacterById(previewId) : undefined);
    if (cat) {
      const cWorld = cat.worldGroup ? WORLD_GROUP_LABELS[cat.worldGroup as WorldGroup] : "";
      const cRealm = cat.realmGroup ? REALM_GROUP_LABELS[cat.realmGroup as RealmGroup] : "";
      const isRare = Boolean(catRare);
      return (
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <View style={styles.noBadge}>
                <Text style={styles.noText}>{String(cat.no).padStart(3, "0")}</Text>
              </View>
              <MonsterAvatar imageKey={cat.id} size={230} showRarity={false} showElementFrame={false} />
              <Text style={styles.title}>{cat.name}</Text>
              <Text style={styles.subtitle}>
                {isRare ? `${cWorld}のレア` : cWorld} / {cat.speciesJa || cat.speciesEn}
              </Text>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{isRare ? "レア" : "通常"}</Text>
                {cRealm ? <Text style={styles.badge}>{cRealm}</Text> : null}
                {cWorld ? <Text style={styles.badge}>{cWorld}</Text> : null}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>キャラメモ</Text>
              <Text style={styles.body}>{cat.description || "（説明は準備中です）"}</Text>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>ステータス</Text>
              <Text style={styles.body}>まだ発見していないキャラです（図鑑プレビュー）。スキャンで見つけると発見記録が付きます。</Text>
            </View>

            <View style={styles.actions}>
              <PrimaryButton label="図鑑へ戻る" onPress={() => goBackOrHome(navigation)} />
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContent}>
          <Text style={styles.title}>キャラが見つかりません</Text>
          <PrimaryButton label="戻る" onPress={() => goBackOrHome(navigation)} />
        </View>
      </SafeAreaView>
    );
  }

  const family = getFamilyById(monster.familyId);
  const rare = monster.rareId ? getRareById(monster.rareId) : undefined;
  const hasWorld = Boolean(monster.worldGroup);
  const worldLabel = monster.worldGroup ? WORLD_GROUP_LABELS[monster.worldGroup] : "";
  const realmLabel = monster.realmGroup ? REALM_GROUP_LABELS[monster.realmGroup] : "";
  const catalogDescription = hasWorld
    ? getCatalogDescriptionById(monster.characterId ?? monster.imageKey)
    : undefined;
  const habitat = monster.habitatGroup ?? getFamilyHabitatGroup(monster.familyId);
  const characterRarity = monster.characterRarity ?? getCharacterRarityForMonster(monster);
  const firstDiscoveredAt = monster.firstDiscoveredAt ?? monster.obtainedAt;
  const lastDiscoveredAt = monster.lastDiscoveredAt ?? monster.obtainedAt;
  const discoveryCount = monster.discoveryCount ?? 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.noBadge}>
            <Text style={styles.noText}>{family.no.toString().padStart(2, "0")}</Text>
          </View>
          <MonsterAvatar monster={monster} size={230} showRarity={false} showElementFrame={false} />
          <Text style={styles.title}>{monster.nickname ?? monster.displayName}</Text>
          <Text style={styles.subtitle}>
            {hasWorld
              ? `${characterRarity === "rare" ? `${worldLabel}のレア` : worldLabel} / ${monster.speciesJa ?? monster.speciesEn ?? ""}`
              : `${rare ? `${family.name}のレア` : family.name} / ${family.baseAnimalName}`}
          </Text>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>{rarityLabel[characterRarity]}</Text>
            {hasWorld && realmLabel ? <Text style={styles.badge}>{realmLabel}</Text> : null}
            <Text style={styles.badge}>{hasWorld ? worldLabel : HABITAT_GROUP_LABELS[habitat]}</Text>
            <Text style={styles.badge}>{monster.favorite ? "お気に入り" : "通常登録"}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>発見記録</Text>
          <View style={styles.recordGrid}>
            <View style={styles.recordItem}>
              <Text style={styles.recordLabel}>初発見日</Text>
              <Text style={styles.recordValue}>{formatFullDateTime(firstDiscoveredAt)}</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordLabel}>最終発見日</Text>
              <Text style={styles.recordValue}>{formatFullDateTime(lastDiscoveredAt)}</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordLabel}>発見回数</Text>
              <Text style={styles.recordValue}>{discoveryCount}回</Text>
            </View>
            <View style={styles.recordItem}>
              <Text style={styles.recordLabel}>{hasWorld ? "所属ワールド" : "出現カテゴリ"}</Text>
              <Text style={styles.recordValue}>{hasWorld ? `${realmLabel}／${worldLabel}` : HABITAT_GROUP_LABELS[habitat]}</Text>
            </View>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>キャラメモ</Text>
          {catalogDescription ? (
            <Text style={styles.body}>{catalogDescription}</Text>
          ) : (
            <>
              <Text style={styles.body}>{rare ? rare.loreMemo : family.biologicalMemo}</Text>
              <Text style={styles.body}>{rare ? rare.relationToBaseFamily : family.gameTrait}</Text>
            </>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>プライバシー</Text>
          <Text style={styles.body}>共有カードや詳細画面には、バーコード数字やQR内容は表示しません。保存されているのは sourceHash です。</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={monster.favorite ? "お気に入り解除" : "お気に入り登録"}
            variant={monster.favorite ? "secondary" : "primary"}
            onPress={() => void toggleFavorite(monster.id)}
          />
          <PrimaryButton label="図鑑へ" variant="secondary" onPress={() => navigation.navigate("WorldDex")} />
          <PrimaryButton label="もう一度スキャン" variant="ghost" onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })} />
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
    gap: 14,
    paddingBottom: 36
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 14
  },
  heroCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA"
  },
  noBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0FDF4",
    borderWidth: 2,
    borderColor: "#35AD4D"
  },
  noText: {
    color: "#166534",
    fontSize: 21,
    fontWeight: "900"
  },
  title: {
    color: "#071B46",
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: "#2FA84F",
    fontSize: 15,
    fontWeight: "900",
    textAlign: "center"
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center"
  },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    color: "#166534",
    backgroundColor: "#DCFCE7",
    fontSize: 13,
    fontWeight: "900"
  },
  panel: {
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  sectionTitle: {
    color: "#071B46",
    fontSize: 18,
    fontWeight: "900"
  },
  recordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden"
  },
  recordItem: {
    width: "50%",
    minHeight: 72,
    gap: 3,
    justifyContent: "center",
    padding: 10,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E2E8F0"
  },
  recordLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  recordValue: {
    color: "#071B46",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900"
  },
  body: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700"
  },
  actions: {
    gap: 10
  }
});
