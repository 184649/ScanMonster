/**
 * フレンド効果ヒント（段2 §11）。Lv.0〜5 と文言のみ表示。
 * その日の有効フレンド人数の大分類を Lv として表示する。具体的な確率数値・secret は一切見せない。
 */
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { isServerMode } from "../config/apiConfig";
import { getActiveServerUserId } from "../services/activeUser";
import { getFriendEffect } from "../services/apiClient";
import { useMonsterStore } from "../stores/monsterStore";

const DEFAULT_MESSAGE = "フレンドQRを読むと、珍しい発見に近づくことがあります";

export const FriendEffectCard = () => {
  const userSalt = useMonsterStore((s) => s.userSalt);
  const [level, setLevel] = useState(0);
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  useFocusEffect(
    useCallback(() => {
      if (!isServerMode) return;
      let active = true;
      void (async () => {
        try {
          const today = new Date().toISOString().slice(0, 10);
          const res = await getFriendEffect(getActiveServerUserId(userSalt), today);
          if (!active) return;
          setLevel(res.effectLevel);
          setMessage(res.message || DEFAULT_MESSAGE);
        } catch {
          // 取得失敗時は既定文言のまま。
        }
      })();
      return () => {
        active = false;
      };
    }, [userSalt])
  );

  return (
    <View style={[styles.card, level > 0 && styles.cardActive]}>
      <Text style={styles.title}>フレンド効果 Lv.{level}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 4,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0"
  },
  cardActive: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74"
  },
  title: { color: "#C2410C", fontSize: 14, fontWeight: "900" },
  message: { color: "#52627A", fontSize: 13, lineHeight: 19, fontWeight: "700" }
});
