import type { ImageSourcePropType } from "react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  DiscoveryCoreAnimation,
  type DiscoveryCoreResultType,
  type DiscoveryCoreSourceType
} from "../components/discovery/DiscoveryCoreAnimation";
import { DiscoveryRewardSummary } from "../components/discovery/DiscoveryRewardSummary";
import { PrimaryButton } from "../components/PrimaryButton";
import type { DPRewardLine } from "../types/economy";
import { colors } from "../theme";

type DiscoveryRevealScreenProps = {
  resultType: DiscoveryCoreResultType;
  sourceType: DiscoveryCoreSourceType;
  characterImage?: ImageSourcePropType;
  characterName: string;
  rewardLines: DPRewardLine[];
  totalEarned: number;
  balanceAfter: number;
  onFinish: () => void;
  onSkip?: () => void;
};

export const DiscoveryRevealScreen = ({
  resultType,
  sourceType,
  characterImage,
  characterName,
  rewardLines,
  totalEarned,
  balanceAfter,
  onFinish,
  onSkip
}: DiscoveryRevealScreenProps) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.animationArea}>
        <DiscoveryCoreAnimation
          resultType={resultType}
          sourceType={sourceType}
          characterImage={characterImage}
          characterName={characterName}
          onFinish={onFinish}
          onSkip={onSkip}
        />
      </View>
      <ScrollView contentContainerStyle={styles.summaryArea} showsVerticalScrollIndicator={false}>
        <DiscoveryRewardSummary rewardLines={rewardLines} totalEarned={totalEarned} balanceAfter={balanceAfter} />
        <PrimaryButton label="結果を見る" onPress={onFinish} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.navy
  },
  animationArea: {
    flex: 1,
    minHeight: 420
  },
  summaryArea: {
    gap: 12,
    padding: 16,
    backgroundColor: colors.screenBg
  }
});
