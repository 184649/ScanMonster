import { CheckCircle2, MapPin, RotateCcw, ShieldCheck } from "../components/icons";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { PrimaryButton } from "../components/PrimaryButton";
import { REGIONS, getRegionOption } from "../data/regions";
import { useSettingsStore } from "../stores/settingsStore";
import { goBackOrHome } from "../utils/navigation";

const statusLabels = {
  idle: "待機中",
  detecting: "判定中",
  granted: "自動判定済み",
  denied: "位置情報が許可されていません",
  unavailable: "判定できませんでした",
  error: "取得に失敗しました"
} as const;

export const RegionSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const settings = useSettingsStore((state) => state.settings);
  const detecting = useSettingsStore((state) => state.regionDetectionInProgress);
  const refreshDetectedRegion = useSettingsStore((state) => state.refreshDetectedRegion);
  const selectedRegion = getRegionOption(settings.selectedRegionKey ?? "unknown");
  const detection = settings.regionDetection;
  const status = detecting ? "detecting" : detection?.status ?? "idle";

  const handleRefresh = async () => {
    await refreshDetectedRegion();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>位置情報で自動判定</Text>
          <Text style={styles.title}>地域設定</Text>
          <Text style={styles.subtitle}>
            現在地から日本の地方区分を判定し、発見時の地域バリアントに使います。緯度経度は保存せず、保存するのは地域区分だけです。
          </Text>
        </View>

        <View style={styles.currentPanel}>
          <View style={styles.currentHeader}>
            <View style={styles.currentIcon}>
              {detecting ? <ActivityIndicator color="#1D4ED8" /> : <MapPin color="#1D4ED8" size={24} strokeWidth={2.4} />}
            </View>
            <View style={styles.currentBody}>
              <Text style={styles.currentLabel}>現在の地域</Text>
              <Text style={styles.currentRegion}>{selectedRegion.name}</Text>
              <Text style={styles.statusText}>{statusLabels[status]}</Text>
            </View>
            {status === "granted" ? <CheckCircle2 color="#16A34A" size={24} strokeWidth={2.4} /> : null}
          </View>

          {detection?.addressLabel ? <Text style={styles.detailText}>判定元: {detection.addressLabel}</Text> : null}
          {detection?.detectedAt ? <Text style={styles.detailText}>最終判定: {new Date(detection.detectedAt).toLocaleString("ja-JP")}</Text> : null}
          {detection?.errorMessage ? <Text style={styles.warningText}>{detection.errorMessage}</Text> : null}

          <PrimaryButton
            label="現在地で再判定"
            icon={detecting ? undefined : RotateCcw}
            loading={detecting}
            disabled={detecting}
            onPress={() => void handleRefresh()}
          />
          <PrimaryButton label="戻る" variant="ghost" onPress={() => goBackOrHome(navigation)} />
        </View>

        {status === "denied" ? (
          <View style={styles.noticePanel}>
            <ShieldCheck color="#CA8A04" size={22} strokeWidth={2.4} />
            <Text style={styles.noticeText}>
              iPhoneの設定でExpo Goの位置情報を許可すると、自動判定できます。許可しない場合は「未判定」としてスキャンを続けます。
            </Text>
          </View>
        ) : null}

        <View style={styles.listPanel}>
          <Text style={styles.sectionTitle}>地方区分</Text>
          <View style={styles.list}>
            {REGIONS.filter((region) => region.key !== "unknown").map((region) => {
              const selected = selectedRegion.key === region.key;

              return (
                <View key={region.key} style={[styles.regionCard, selected && styles.selectedCard]}>
                  <View style={styles.regionIcon}>
                    <MapPin color={selected ? "#1D4ED8" : "#64748B"} size={18} strokeWidth={2.4} />
                  </View>
                  <View style={styles.regionBody}>
                    <Text style={styles.regionName}>{region.name}</Text>
                    <Text style={styles.regionDescription}>{region.description}</Text>
                  </View>
                  {selected ? <CheckCircle2 color="#16A34A" size={20} strokeWidth={2.4} /> : null}
                </View>
              );
            })}
          </View>
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
    paddingBottom: 34
  },
  header: {
    gap: 6
  },
  kicker: {
    color: "#1D4ED8",
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: "#0F172A",
    fontSize: 32,
    fontWeight: "900"
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 21
  },
  currentPanel: {
    gap: 12,
    borderRadius: 8,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  currentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  currentIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF2FF"
  },
  currentBody: {
    flex: 1,
    minWidth: 0
  },
  currentLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "800"
  },
  currentRegion: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "900"
  },
  statusText: {
    color: "#1D4ED8",
    fontSize: 13,
    fontWeight: "800"
  },
  detailText: {
    color: "#475569",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  warningText: {
    color: "#B45309",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800"
  },
  noticePanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A"
  },
  noticeText: {
    flex: 1,
    color: "#854D0E",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  listPanel: {
    gap: 12
  },
  sectionTitle: {
    color: "#0F172A",
    fontSize: 18,
    fontWeight: "900"
  },
  list: {
    gap: 10
  },
  regionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  selectedCard: {
    borderColor: "#93C5FD",
    backgroundColor: "#EAF2FF"
  },
  regionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9"
  },
  regionBody: {
    flex: 1,
    minWidth: 0,
    gap: 3
  },
  regionName: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "900"
  },
  regionDescription: {
    color: "#64748B",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600"
  }
});
