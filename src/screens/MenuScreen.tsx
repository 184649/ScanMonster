/**
 * メニュー（タブ）。データ／設定／参加する／その他 をカテゴリで整理（見本準拠）。
 * 未実装は「準備中」表示。既存画面へ遷移。
 */
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { MenuListItem } from "../components/MenuListItem";
import { SectionCard } from "../components/SectionCard";
import { colors } from "../theme";

export const MenuScreen = () => {
  const navigation = useNavigation<any>();
  const go = (route: string) => () => navigation.navigate(route);
  const goLegal = (doc: "terms" | "privacy") => () => navigation.navigate("Legal", { doc });

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>メニュー</Text>

        <SectionCard title="毎日の楽しみ">
          <MenuListItem emoji="🎯" label="ミッション" sub="今日のミッションと連続記録でDPを伸ばそう" onPress={go("Mission")} last />
        </SectionCard>

        <SectionCard title="データ">
          <MenuListItem emoji="☁️" label="データ引き継ぎ" sub="端末変更でも発見記録を引き継げます" onPress={go("Account")} />
          <MenuListItem emoji="📄" label="発見ログ" onPress={go("DiscoveryLog")} />
          <MenuListItem emoji="🗓️" label="発見カレンダー" onPress={go("DiscoveryCalendar")} />
          <MenuListItem emoji="🔢" label="番号コレクション" onPress={go("NumberCollection")} last />
        </SectionCard>

        <SectionCard title="設定">
          <MenuListItem emoji="📍" label="位置情報設定" sub="都道府県判定にのみ使用します" onPress={go("RegionSettings")} />
          <MenuListItem emoji="🔔" label="通知設定" comingSoon />
          <MenuListItem emoji="🛡️" label="プライバシー" onPress={go("Settings")} />
          <MenuListItem emoji="❓" label="ヘルプ" comingSoon last />
        </SectionCard>

        <SectionCard title="参加する">
          <MenuListItem emoji="💬" label="機能改善・要望" sub="要望の投稿・リアクションができます" onPress={go("FeatureBoard")} />
          <MenuListItem emoji="📣" label="お知らせ" comingSoon last />
        </SectionCard>

        <SectionCard title="その他">
          <MenuListItem emoji="🏅" label="マイページ" sub="プロフィール・フレンド・称号" onPress={go("MyPage")} />
          <MenuListItem emoji="📃" label="利用規約" onPress={goLegal("terms")} />
          <MenuListItem emoji="🔏" label="プライバシーポリシー" onPress={goLegal("privacy")} />
          <MenuListItem emoji="ℹ️" label="アプリ情報" onPress={go("Settings")} last />
        </SectionCard>

        <Text style={styles.footer}>WORLDAWN</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.screenBg },
  content: { padding: 16, gap: 18, paddingBottom: 34 },
  title: { color: colors.navy, fontSize: 24, fontWeight: "900", textAlign: "center", paddingVertical: 6 },
  footer: { color: "#CBD5E1", fontSize: 12, fontWeight: "900", textAlign: "center", marginTop: 4 }
});
