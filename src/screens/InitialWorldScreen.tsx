import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { PrimaryButton } from "../components/PrimaryButton";
import {
  INITIAL_WORLD_GROUPS,
  WORLD_GROUP_DESCRIPTIONS,
  WORLD_GROUP_EMOJI,
  WORLD_GROUP_LABELS
} from "../data/worlds";
import { useMonsterStore } from "../stores/monsterStore";
import type { WorldGroup } from "../types/worlds";

export const InitialWorldScreen = () => {
  const selectInitialWorldGroup = useMonsterStore((state) => state.selectInitialWorldGroup);
  const [selected, setSelected] = useState<WorldGroup>(INITIAL_WORLD_GROUPS[0] ?? "ground");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleStart = async () => {
    setSaving(true);
    const result = await selectInitialWorldGroup(selected);
    setMessage(result.message);
    setSaving(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            WORLD<Text style={styles.logoGreen}>AWN</Text>
          </Text>
          <Text style={styles.title}>最初に開くワールドを選んでください</Text>
          <Text style={styles.subtitle}>最初は選んだワールドのキャラだけが出現します。あとからDPでワールドを広げられます。</Text>
        </View>

        <View style={styles.cardList}>
          {INITIAL_WORLD_GROUPS.map((world) => {
            const active = selected === world;
            return (
              <Pressable
                key={world}
                accessibilityRole="button"
                onPress={() => setSelected(world)}
                style={({ pressed }) => [styles.card, active && styles.cardActive, pressed && styles.pressed]}
              >
                <Text style={styles.emoji}>{WORLD_GROUP_EMOJI[world]}</Text>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{WORLD_GROUP_LABELS[world]}</Text>
                  <Text style={styles.cardText}>{WORLD_GROUP_DESCRIPTIONS[world]}</Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <Text style={styles.radioMark}>✓</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <PrimaryButton
          label={saving ? "保存中" : `${WORLD_GROUP_LABELS[selected]}ではじめる`}
          loading={saving}
          disabled={saving}
          onPress={() => void handleStart()}
        />

        <View style={styles.note}>
          <Text style={styles.noteTitle}>初回リリースの遊び方</Text>
          <Text style={styles.noteText}>スキャンでDPを集め、ワールド解放とワールドブーストで出会えるキャラを増やしていきます。</Text>
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
    padding: 20,
    gap: 18,
    paddingBottom: 36
  },
  header: {
    gap: 8
  },
  logo: {
    color: "#071B46",
    fontSize: 36,
    fontWeight: "900"
  },
  logoGreen: {
    color: "#35AD4D"
  },
  title: {
    color: "#071B46",
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 34
  },
  subtitle: {
    color: "#52627A",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700"
  },
  cardList: {
    gap: 12
  },
  card: {
    minHeight: 96,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D7E0EA"
  },
  cardActive: {
    borderColor: "#35AD4D",
    backgroundColor: "#F0FDF4"
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }]
  },
  emoji: {
    fontSize: 30
  },
  cardBody: {
    flex: 1,
    gap: 4
  },
  cardTitle: {
    color: "#071B46",
    fontSize: 18,
    fontWeight: "900"
  },
  cardText: {
    color: "#52627A",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  },
  radio: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CBD5E1"
  },
  radioActive: {
    backgroundColor: "#35AD4D"
  },
  radioMark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center"
  },
  message: {
    color: "#166534",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "800",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#BBF7D0"
  },
  note: {
    gap: 6,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  noteTitle: {
    color: "#92400E",
    fontSize: 15,
    fontWeight: "900"
  },
  noteText: {
    color: "#57451D",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700"
  }
});
