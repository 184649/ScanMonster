import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";

import { MonsterAvatar } from "../components/MonsterAvatar";
import { CharacterRecordSection } from "../components/discovery/CharacterRecordSection";
import { PrimaryButton } from "../components/PrimaryButton";
import { getCatalogCharacterById, getCatalogDescriptionById, getCatalogRareById } from "../data/catalogLookup";
import { getCharacterMemoForSpecies } from "../data/characterMemos";
import { getRealWorldProfileForSpecies } from "../data/realWorldProfiles";
import { REALM_GROUP_LABELS, WORLD_GROUP_LABELS } from "../data/worlds";
import { HABITAT_GROUP_LABELS } from "../data/habitatGroups";
import { getCharacterRarityForMonster, getFamilyHabitatGroup } from "../data/characters";
import { getFamilyById } from "../data/monsterFamilies";
import { getRareById } from "../data/rareMonsters";
import { resolveCharacterPresentation } from "../services/characterPresentationResolver";
import { playSound } from "../services/soundService";
import { characterRarityLabel } from "../services/rarityLabel.core";
import { useMonsterStore } from "../stores/monsterStore";
import type { RootStackParamList } from "../types/navigation";
import type { RealmGroup, WorldGroup } from "../types/worlds";
import { goBackOrHome } from "../utils/navigation";
import { colors } from "../theme";

// レアリティ表示は共通モジュール characterRarityLabel を使用（legendary=「伝説」・段3）。

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
      const presentation = resolveCharacterPresentation(cat.id);
      const cWorld = cat.worldGroup ? WORLD_GROUP_LABELS[cat.worldGroup as WorldGroup] : "";
      const cRealm = cat.realmGroup ? REALM_GROUP_LABELS[cat.realmGroup as RealmGroup] : "";
      const isRare = Boolean(catRare);
      return (
        <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.heroCard}>
              <View style={styles.noPill}>
                <Text style={styles.noPillText}>{`${cWorld || "図鑑"} No.${String(cat.no).padStart(3, "0")}`}</Text>
              </View>
              <MonsterAvatar imageKey={cat.id} size={220} showRarity={false} showElementFrame={false} />
              <Text style={styles.title}>{presentation?.displayName ?? cat.name}</Text>
              <Text style={styles.subtitle}>
                {isRare ? `${cWorld}のレア` : cWorld} / {presentation?.motifName ?? (cat.speciesJa || cat.speciesEn)}
              </Text>
              <View style={styles.badgeRow}>
                <Text style={styles.badge}>{isRare ? "レア" : "通常"}</Text>
                {cRealm ? <Text style={styles.badge}>{cRealm}</Text> : null}
                {cWorld ? <Text style={styles.badge}>{cWorld}</Text> : null}
              </View>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>キャラメモ</Text>
              <Text style={styles.body}>{presentation?.shortDescription ?? (cat.description || "（説明は準備中です）")}</Text>
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
  const presentationId = monster.characterId ?? monster.imageKey;
  const presentation = resolveCharacterPresentation(presentationId);
  const catalogDescription = hasWorld
    ? presentation?.shortDescription ?? getCatalogDescriptionById(presentationId)
    : undefined;
  const habitat = monster.habitatGroup ?? getFamilyHabitatGroup(monster.familyId);
  const characterRarity = monster.characterRarity ?? getCharacterRarityForMonster(monster);
  const firstDiscoveredAt = monster.firstDiscoveredAt ?? monster.obtainedAt;
  const lastDiscoveredAt = monster.lastDiscoveredAt ?? monster.obtainedAt;
  const discoveryCount = monster.discoveryCount ?? 1;

  // 図鑑No：カタログ（ワールド内の連番）を優先、無ければ旧 family.no。
  const catalogChar = getCatalogCharacterById(monster.characterId ?? monster.imageKey);
  const dexNo = catalogChar?.no ?? family.no;
  const dexNoLabel = `${hasWorld ? worldLabel : "図鑑"} No.${String(dexNo).padStart(3, "0")}`;

  // キャラメモ：カタログ説明→モチーフ別メモ→（ワールド系は汎用文／旧系は family/rare）。
  const speciesJa = presentation?.motifName ?? monster.speciesJa ?? monster.speciesEn ?? "";
  const memoText =
    catalogDescription ??
    getCharacterMemoForSpecies(monster.speciesEn) ??
    (hasWorld
      ? speciesJa
        ? `${speciesJa}をモチーフにした${worldLabel}のいきものです。`
        : "このワールドで見つかるいきものです。"
      : rare
        ? rare.loreMemo
        : family.biologicalMemo);
  const profile = getRealWorldProfileForSpecies(monster.speciesEn);

  // 代表発見証明の直後に差し込む「キャラメモ＋実在モチーフ参考値」。
  const memoPanel = (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>キャラメモ</Text>
      <Text style={styles.body}>{memoText}</Text>
      {profile ? (
        <View style={styles.profileBox}>
          <Text style={styles.profileTitle}>実在モチーフ参考値</Text>
          {profile.motifName ? <Text style={styles.profileMotif}>モチーフ：{profile.motifName}</Text> : null}
          {profile.sizeText ? (
            <Text style={styles.profileLine}>
              {profile.sizeLabel ?? "サイズ"}：{profile.sizeText}
            </Text>
          ) : null}
          {profile.weightText ? <Text style={styles.profileLine}>体重：{profile.weightText}</Text> : null}
          {profile.wingspanText ? <Text style={styles.profileLine}>翼開長：{profile.wingspanText}</Text> : null}
          {profile.lifespanText ? (
            <Text style={styles.profileLine}>
              {profile.lifespanLabel ?? "寿命"}：{profile.lifespanText}
            </Text>
          ) : null}
          <Text style={styles.profileNote}>※図鑑の読み物です。ゲームの能力値ではありません。</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.noPill}>
            <Text style={styles.noPillText}>{dexNoLabel}</Text>
          </View>
          <MonsterAvatar monster={monster} size={220} showRarity={false} showElementFrame={false} />
          <Text style={styles.title}>{monster.nickname ?? presentation?.displayName ?? monster.displayName}</Text>
          <Text style={styles.subtitle}>
            {hasWorld
              ? `${characterRarity === "rare" ? `${worldLabel}のレア` : worldLabel} / ${speciesJa}`
              : `${rare ? `${family.name}のレア` : family.name} / ${family.baseAnimalName}`}
          </Text>
          <View style={styles.badgeRow}>
            <Text style={styles.badge}>発見済み</Text>
            <Text style={styles.badge}>{characterRarityLabel[characterRarity]}</Text>
            <Text style={styles.badge}>{hasWorld ? worldLabel : HABITAT_GROUP_LABELS[habitat]}</Text>
            {monster.favorite ? <Text style={[styles.badge, styles.badgeFav]}>★お気に入り</Text> : null}
          </View>
        </View>

        <CharacterRecordSection
          characterId={monster.characterId ?? monster.imageKey}
          fallbackFirstDiscoveredAt={firstDiscoveredAt}
          fallbackLastDiscoveredAt={lastDiscoveredAt}
          fallbackDiscoveryCount={discoveryCount}
          belowRepresentative={memoPanel}
        />

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>プライバシー</Text>
          <Text style={styles.body}>共有カードや詳細画面には、バーコード数字やQR内容は表示しません。保存されているのは sourceHash です。</Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            label={monster.favorite ? "お気に入り解除" : "お気に入り登録"}
            variant={monster.favorite ? "secondary" : "primary"}
            soundId="none"
            onPress={() => {
              playSound("favorite");
              void toggleFavorite(monster.id);
            }}
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
    backgroundColor: colors.screenBg
  },
  content: {
    padding: 16,
    paddingTop: 10,
    gap: 12,
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
    gap: 10,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  noPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC"
  },
  noPillText: {
    color: colors.successDark,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5
  },
  title: {
    color: colors.navy,
    fontSize: 30,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: colors.success,
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
    color: colors.successDark,
    backgroundColor: colors.successSoft,
    fontSize: 13,
    fontWeight: "900"
  },
  badgeFav: {
    color: colors.accentGoldInk,
    backgroundColor: "#FEF3C7"
  },
  profileBox: {
    gap: 4,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.borderFaint
  },
  profileTitle: { color: colors.navy, fontSize: 14, fontWeight: "900", marginBottom: 2 },
  profileMotif: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  profileLine: { color: colors.textBody, fontSize: 13, fontWeight: "700" },
  profileNote: { color: colors.textFaint, fontSize: 11, fontWeight: "700" },
  panel: {
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  recordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
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
    borderColor: colors.border
  },
  recordLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  recordValue: {
    color: colors.navy,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "900"
  },
  body: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700"
  },
  actions: {
    gap: 10
  }
});
