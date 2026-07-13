import { GalleryVerticalEnd, ScanLine, Sparkles } from "../components/icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { colors } from "../theme";

const shopItems = [
  { title: "姿の開放", body: "きらめく姿や夜明けの姿をDPで開放できます。", price: "DP" },
  { title: "背景の開放", body: "個体詳細の背景候補をDPで開放できます。", price: "DP" },
  { title: "図鑑ヒント", body: "未発見種族やレア出現のヒントをDPで開放できます。", price: "DP" }
];

export const ShopScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>コレクションをもっと楽しく</Text>
          <Text style={styles.title}>ショップ</Text>
          <Text style={styles.subtitle}>DPは課金購入できません。ログインとスキャンで集めて開放に使います。</Text>
        </View>

        <View style={styles.heroCard}>
          <Sparkles color="#F97316" size={34} strokeWidth={2.4} />
          <View style={styles.heroBody}>
            <Text style={styles.heroTitle}>毎日のスキャン報酬を集めよう</Text>
            <Text style={styles.heroText}>開放は個体詳細画面から行えます。好きな個体を選んでDPを使いましょう。</Text>
          </View>
        </View>

        <View style={styles.list}>
          {shopItems.map((item) => (
            <View key={item.title} style={styles.itemCard}>
              <GalleryVerticalEnd color={colors.success} size={26} strokeWidth={2.4} />
              <View style={styles.itemBody}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text style={styles.itemText}>{item.body}</Text>
              </View>
              <Text style={styles.price}>{item.price}</Text>
            </View>
          ))}
        </View>

        <PrimaryButton label="スキャンして報酬を増やす" icon={ScanLine} onPress={() => navigation.navigate("Scan")} />
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
    padding: 18,
    gap: 16,
    paddingBottom: 36
  },
  header: {
    gap: 6
  },
  kicker: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.navy,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center"
  },
  subtitle: {
    color: "#5B6A83",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center"
  },
  heroCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA"
  },
  heroBody: {
    flex: 1,
    gap: 4
  },
  heroTitle: {
    color: colors.navy,
    fontSize: 18,
    fontWeight: "900"
  },
  heroText: {
    color: "#7C2D12",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  list: {
    gap: 10
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  itemTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "900"
  },
  itemText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700"
  },
  price: {
    color: colors.success,
    fontSize: 13,
    fontWeight: "900"
  }
});
