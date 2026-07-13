/**
 * ワールド一覧（§9）。ワールドが増えても見やすいカテゴリ折りたたみUI。
 * 横並びタブを増やさない。隠し領域（シークレット）は未発見時に明示しない＝出さない。
 */
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { CATALOG_CHARACTERS } from "../data/characterCatalog.generated";
import { INITIAL_WORLD_GROUPS, WORLD_GROUP_EMOJI, WORLD_GROUP_LABELS } from "../data/worlds";
import { completedNormalWorlds } from "../services/legendaryVisibility.core";
import { ownedCatalogIds } from "../services/worldDex.core";
import { useMonsterStore } from "../stores/monsterStore";
import { colors } from "../theme";

type Item = { label: string; emoji?: string; note?: string; onPress?: () => void };
type Category = { key: string; title: string; desc: string; items: Item[] };

export const WorldListScreen = () => {
  const navigation = useNavigation<any>();
  const [open, setOpen] = useState<Record<string, boolean>>({ basic: true, special: true, region: true, limited: false });
  const monsters = useMonsterStore((s) => s.monsters);
  // 伝説解放（そのワールドの normal コンプリート）済みのワールドだけ「新たな気配」を示唆する（§24）。
  // 未解放時は伝説の存在・件数を一切出さない。
  const completed = useMemo(() => completedNormalWorlds(CATALOG_CHARACTERS, ownedCatalogIds(monsters)), [monsters]);

  const categories: Category[] = [
    {
      key: "basic",
      title: "基本ワールド",
      desc: "さまざまな生き物と出会える基本のワールド",
      items: INITIAL_WORLD_GROUPS.map((world) => ({
        label: WORLD_GROUP_LABELS[world],
        emoji: WORLD_GROUP_EMOJI[world],
        note: completed.has(world) ? "✨ 新たな気配を確認" : undefined,
        onPress: () => navigation.navigate("MainTabs", { screen: "Dex" })
      }))
    },
    {
      key: "special",
      title: "特殊ワールド",
      desc: "通常スキャンとは異なる方法で出会えるワールド",
      items: [
        {
          label: "フレンドワールド",
          emoji: "🤝",
          note: "フレンドQRを読み込むと出会えます",
          onPress: () => navigation.navigate("MainTabs", { screen: "Friend" })
        }
      ]
    },
    {
      key: "region",
      title: "都道府県キャラ",
      desc: "日本の各都道府県をモチーフにしたキャラ",
      items: [{ label: "都道府県キャラ", emoji: "📍", note: "位置情報を許可して、その地域でスキャンすると出会えることがあります" }]
    },
    {
      key: "limited",
      title: "限定・コラボ",
      desc: "期間限定やコラボで出会える特別なワールド",
      items: [{ label: "準備中", emoji: "🎪", note: "開催中の限定企画はありません" }]
    }
    // 隠し領域（シークレット）は明示しない。
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>WORLDAWN</Text>
          <Text style={styles.title}>ワールド一覧</Text>
          <Text style={styles.subtitle}>カテゴリごとに整理しています。タップで開閉できます。</Text>
        </View>

        {categories.map((cat) => (
          <View key={cat.key} style={styles.category}>
            <Pressable style={styles.catHeader} onPress={() => setOpen((o) => ({ ...o, [cat.key]: !o[cat.key] }))}>
              <View style={styles.catHeadBody}>
                <Text style={styles.catTitle}>{cat.title}</Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </View>
              <Text style={styles.catToggle}>{open[cat.key] ? "▲" : "▼"}</Text>
            </Pressable>
            {open[cat.key]
              ? cat.items.map((item, i) => (
                  <Pressable
                    key={`${cat.key}_${i}`}
                    style={[styles.item, !item.onPress && styles.itemStatic]}
                    onPress={item.onPress}
                    disabled={!item.onPress}
                  >
                    <Text style={styles.itemEmoji}>{item.emoji ?? "•"}</Text>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      {item.note ? <Text style={styles.itemNote}>{item.note}</Text> : null}
                    </View>
                    {item.onPress ? <Text style={styles.chevron}>›</Text> : null}
                  </Pressable>
                ))
              : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, gap: 12, paddingBottom: 34 },
  header: { gap: 6 },
  kicker: { color: colors.success, fontSize: 12, fontWeight: "900" },
  title: { color: colors.navy, fontSize: 30, fontWeight: "900" },
  subtitle: { color: colors.textSlate, fontSize: 13, fontWeight: "700" },
  category: { borderRadius: 12, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    backgroundColor: colors.surfaceMuted
  },
  catHeadBody: { flex: 1, gap: 2, minWidth: 0 },
  catTitle: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  catDesc: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  catToggle: { color: colors.primaryInk, fontSize: 13, fontWeight: "900", marginLeft: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderFaint
  },
  itemStatic: { opacity: 0.95 },
  itemEmoji: { fontSize: 22 },
  itemBody: { flex: 1, gap: 2, minWidth: 0 },
  itemLabel: { color: colors.ink, fontSize: 15, fontWeight: "900" },
  itemNote: { color: colors.textMuted, fontSize: 12, fontWeight: "700", lineHeight: 17 },
  chevron: { color: colors.textFaint, fontSize: 22, fontWeight: "900" }
});
