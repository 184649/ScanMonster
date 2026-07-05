import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { ScanLine } from "../components/icons";

export const ExpeditionScreen = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.panel}>
          <Text style={styles.kicker}>初回リリース対象外</Text>
          <Text style={styles.title}>探索機能はありません</Text>
          <Text style={styles.description}>
            WORLDAWNのMVPでは、ログインとスキャンでDPを集め、好きな個体の姿・背景・フレーム・図鑑ヒントを開放する体験に絞っています。
          </Text>
          <Text style={styles.description}>
            探索チケット、素材通貨、時短、広告報酬、課金ガチャは実装していません。
          </Text>
          <PrimaryButton label="スキャンでDPを集める" icon={ScanLine} onPress={() => navigation.navigate("MainTabs", { screen: "Scan" })} />
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
    flexGrow: 1,
    padding: 18,
    justifyContent: "center"
  },
  panel: {
    gap: 14,
    borderRadius: 8,
    padding: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  kicker: {
    color: "#2FA84F",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#071B46",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  description: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "700",
    textAlign: "center"
  }
});
