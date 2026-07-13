import { useState } from "react";
import { Alert, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { APP_LINKS } from "../constants/appLinks";
import { FEATURE_FLAGS } from "../constants/featureFlags";
import { PrimaryButton } from "../components/PrimaryButton";
import { playSound } from "../services/soundService";
import { DEFAULT_SOUND_SETTINGS } from "../types/sound";
import { useMonsterStore } from "../stores/monsterStore";
import { useSettingsStore } from "../stores/settingsStore";
import { colors } from "../theme";

const VOLUME_STEPS = [0.2, 0.4, 0.6, 0.8, 1.0];

export const SettingsScreen = () => {
  const navigation = useNavigation<any>();
  const settings = useSettingsStore((state) => state.settings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const resetLocalData = useMonsterStore((state) => state.resetLocalData);
  const devUnlockAllForTesting = useMonsterStore((state) => state.devUnlockAllForTesting);
  const devDiscoverAllForTesting = useMonsterStore((state) => state.devDiscoverAllForTesting);
  const monsterCount = useMonsterStore((state) => state.monsters.length);
  const [message, setMessage] = useState<string | null>(null);
  const scanDebugEnabled = FEATURE_FLAGS.SHOW_SCAN_DEBUG || settings.showScanDebug === true;
  const monsterImageDebugEnabled = FEATURE_FLAGS.SHOW_CHARACTER_IMAGE_DEBUG || settings.showMonsterImageDebug === true;
  const seEnabled = settings.seEnabled ?? DEFAULT_SOUND_SETTINGS.seEnabled;
  const seVolume = settings.seVolume ?? DEFAULT_SOUND_SETTINGS.seVolume;
  const hapticsEnabled = settings.hapticsEnabled ?? true;
  const simpleScanFx = settings.simpleScanFx ?? false;

  const toggleSe = () => {
    const next = !seEnabled;
    void (async () => {
      await updateSettings({ seEnabled: next });
      // ONにした瞬間だけ確認音を鳴らす（OFF時は無音）。
      if (next) {
        playSound("tap");
      }
    })();
  };

  const cycleVolume = () => {
    const index = VOLUME_STEPS.findIndex((step) => Math.abs(step - seVolume) < 0.01);
    const next = VOLUME_STEPS[(index + 1) % VOLUME_STEPS.length] ?? DEFAULT_SOUND_SETTINGS.seVolume;
    void (async () => {
      await updateSettings({ seVolume: next });
      // 新しい音量でプレビュー。
      playSound("tap");
    })();
  };

  const handleOpenLink = async (url: string, label: string) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(label, "このリンクを開けませんでした。URLが正しく設定されているか確認してください。", [{ text: "OK" }]);
        return;
      }

      await Linking.openURL(url);
    } catch {
      Alert.alert(label, "リンクを開けませんでした。時間をおいて再度お試しください。", [{ text: "OK" }]);
    }
  };

  const handleReset = async () => {
    Alert.alert(
      "ローカルデータをリセットしますか？",
      "キャラ、DP、カテゴリ解放、気配ブースト、称号、スキャン履歴が削除されます。この操作は元に戻せません。",
      [
        { text: "キャンセル", style: "cancel" },
        {
          text: "リセット",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await resetLocalData();
              setMessage("ローカルのゲームデータをリセットしました。最初のカテゴリ選択から再開します。");
              navigation.navigate("MainTabs", { screen: "Home" });
            })();
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.kicker}>アプリ設定</Text>
          <Text style={styles.title}>設定</Text>
        </View>

        {message ? <Text style={styles.messageBox}>{message}</Text> : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>アカウント・コミュニティ</Text>
          <Text style={styles.description}>
            データの引継ぎ・連携や、機能改善の要望投稿ができます。
          </Text>
          <PrimaryButton label="アカウント・データ引継ぎ" onPress={() => navigation.navigate("Account")} />
          <PrimaryButton label="要望掲示板" variant="secondary" onPress={() => navigation.navigate("FeatureBoard")} />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>初回リリースの範囲</Text>
          <Text style={styles.description}>
            WORLDAWN MVPでは、スキャン、図鑑、DP、カテゴリ解放、気配ブースト、称号を提供します。探索、研究、個体差コレクション、位置情報による出現制御、課金、広告は初回リリース対象外です。
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>サウンド</Text>
          <Text style={styles.description}>
            スキャンや発見の効果音（SE）を設定します。素材が未配置の場合は無音のままアプリは動作します。
          </Text>
          <PrimaryButton
            label={`効果音: ${seEnabled ? "ON" : "OFF"}`}
            variant="ghost"
            soundId="none"
            onPress={toggleSe}
          />
          <PrimaryButton
            label={`効果音音量: ${Math.round(seVolume * 100)}%`}
            variant="ghost"
            soundId="none"
            disabled={!seEnabled}
            onPress={cycleVolume}
          />
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>スキャン演出</Text>
          <Text style={styles.description}>
            発見までの演出です。端末のReduce Motion（視差効果を減らす）設定時は自動で簡易表示になります。
          </Text>
          <PrimaryButton
            label={`触覚フィードバック: ${hapticsEnabled ? "ON" : "OFF"}`}
            variant="ghost"
            onPress={() => void updateSettings({ hapticsEnabled: !hapticsEnabled })}
          />
          <PrimaryButton
            label={`演出: ${simpleScanFx ? "簡易" : "しっかり"}`}
            variant="ghost"
            onPress={() => void updateSettings({ simpleScanFx: !simpleScanFx })}
          />
        </View>

        {FEATURE_FLAGS.ENABLE_DEV_UNLOCK_ALL ? (
          <View style={styles.panel}>
            <Text style={styles.sectionTitle}>動作確認（開発用）</Text>
            <Text style={styles.description}>
              図鑑を全種発見済みにし、DPを大量付与してカテゴリと称号を確認しやすくします。リリース時は featureFlags の ENABLE_DEV_UNLOCK_ALL を false にしてください。
            </Text>
            <PrimaryButton
              label={`図鑑を全種発見＋DP大量付与（現在 ${monsterCount} 体）`}
              onPress={() => {
                void (async () => {
                  const added = await devDiscoverAllForTesting("unknown");
                  await devUnlockAllForTesting();
                  setMessage(
                    added > 0
                      ? `図鑑を全種発見済みにし（＋${added}体）、DPを999,999付与しました。`
                      : "すでに全種発見済みです。DPを999,999付与しました。"
                  );
                })();
              }}
            />
          </View>
        ) : null}

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>デバッグ表示</Text>
          <Text style={styles.description}>リリース前は、以下の表示をOFFにしてから最終確認します。</Text>
          <PrimaryButton
            label={`スキャンDebug: ${scanDebugEnabled ? "ON" : "OFF"}`}
            variant="ghost"
            onPress={() => void updateSettings({ showScanDebug: !scanDebugEnabled })}
          />
          <PrimaryButton
            label={`画像Debug: ${monsterImageDebugEnabled ? "ON" : "OFF"}`}
            variant="ghost"
            onPress={() => void updateSettings({ showMonsterImageDebug: !monsterImageDebugEnabled })}
          />
          {FEATURE_FLAGS.DEBUG_MODE ? (
            <PrimaryButton
              label={`出現固定: ${
                settings.debugForceRarity === "rare"
                  ? "レア"
                  : settings.debugForceRarity === "normal"
                    ? "ノーマル"
                    : "OFF（通常抽選）"
              }`}
              variant="ghost"
              onPress={() =>
                void updateSettings({
                  debugForceRarity:
                    settings.debugForceRarity === undefined
                      ? "normal"
                      : settings.debugForceRarity === "normal"
                        ? "rare"
                        : undefined
                })
              }
            />
          ) : null}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>ローカルデータ</Text>
          <Text style={styles.description}>動作確認をやり直したい場合だけ使います。MVP版のゲームデータは端末内に保存されます。</Text>
          {FEATURE_FLAGS.ENABLE_DEV_RESET_BUTTON ? (
            <PrimaryButton label="ローカルデータをリセット" variant="ghost" onPress={() => void handleReset()} />
          ) : (
            <Text style={styles.description}>リセットボタンは現在非表示です。</Text>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>プライバシー</Text>
          <Text style={styles.description}>rawBarcode / rawQrValue / normalizedValue は永続保存しません。</Text>
          <Text style={styles.description}>同日同コード制限は sourceHash + localDate で行います。</Text>
          <Text style={styles.description}>正確な位置情報は保存せず、出現制御にも使いません。</Text>
          <PrimaryButton
            label="プライバシーポリシー"
            variant="ghost"
            onPress={() => void handleOpenLink(APP_LINKS.privacyPolicyUrl, "プライバシーポリシー")}
          />
          <PrimaryButton
            label="お問い合わせ"
            variant="ghost"
            onPress={() => void handleOpenLink(APP_LINKS.contactUrl, "お問い合わせ")}
          />
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
    padding: 18,
    gap: 14,
    paddingBottom: 34
  },
  header: {
    gap: 6
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  title: {
    color: colors.ink,
    fontSize: 32,
    fontWeight: "900"
  },
  panel: {
    gap: 12,
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "900"
  },
  description: {
    color: colors.textBody,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "600"
  },
  messageBox: {
    color: colors.successDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: "#BBF7D0"
  }
});
