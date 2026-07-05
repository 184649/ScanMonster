import { StyleSheet, Text, View } from "react-native";

import { formatDP, formatEarnedDP } from "../../data/economy";
import type { DPRewardLine } from "../../types/economy";

type DiscoveryRewardSummaryProps = {
  rewardLines: DPRewardLine[];
  totalEarned: number;
  balanceAfter: number;
};

export const DiscoveryRewardSummary = ({
  rewardLines,
  totalEarned,
  balanceAfter
}: DiscoveryRewardSummaryProps) => {
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View>
          <Text style={styles.label}>獲得</Text>
          <Text style={styles.earned}>{formatEarnedDP(totalEarned)}</Text>
        </View>
        <View style={styles.balanceBlock}>
          <Text style={styles.label}>現在</Text>
          <Text style={styles.balance}>{formatDP(balanceAfter)}</Text>
        </View>
      </View>

      {rewardLines.length > 0 ? (
        <View style={styles.lines}>
          {rewardLines.map((line) => (
            <View key={line.id} style={styles.line}>
              <Text numberOfLines={1} style={styles.lineLabel}>{line.label}</Text>
              <Text style={styles.lineAmount}>{formatEarnedDP(line.amount)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>今回のDP付与はありません。</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    gap: 12,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  label: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900"
  },
  earned: {
    color: "#B45309",
    fontSize: 30,
    fontWeight: "900"
  },
  balanceBlock: {
    alignItems: "flex-end"
  },
  balance: {
    color: "#071B46",
    fontSize: 18,
    fontWeight: "900"
  },
  lines: {
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    paddingTop: 10
  },
  line: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  lineLabel: {
    flex: 1,
    color: "#57451D",
    fontSize: 13,
    fontWeight: "800"
  },
  lineAmount: {
    color: "#B45309",
    fontSize: 13,
    fontWeight: "900"
  },
  empty: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "800"
  }
});
