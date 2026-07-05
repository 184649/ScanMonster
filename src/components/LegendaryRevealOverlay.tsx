/**
 * 伝説解放演出（段3 §5/§25）。normalコンプリートの瞬間に一度だけ表示する。
 * 「伝説キャラ」という直接的な断定は避け、示唆的な文言で存在に気づかせる。
 * 二重表示防止は呼び出し側（legendaryReveal の永続化）で担保する。
 */
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export const LegendaryRevealOverlay = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}>
      <View style={styles.card}>
        <Text style={styles.spark}>✨</Text>
        <Text style={styles.title}>新たな気配を確認しました</Text>
        <Text style={styles.body}>
          このワールドの通常キャラをすべて発見しました。{"\n"}
          その瞬間、これまで感じなかった気配が現れています。{"\n\n"}
          まだ出会っていない特別な存在がいるようです。
        </Text>
        <Pressable style={styles.button} onPress={onClose}>
          <Text style={styles.buttonText}>確かめる</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(7,11,26,0.82)", alignItems: "center", justifyContent: "center", padding: 28 },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 20,
    padding: 26,
    alignItems: "center",
    gap: 14,
    backgroundColor: "#0B1220",
    borderWidth: 1,
    borderColor: "#FCD34D"
  },
  spark: { fontSize: 44 },
  title: { color: "#FCD34D", fontSize: 22, fontWeight: "900", textAlign: "center" },
  body: { color: "#E2E8F0", fontSize: 14, fontWeight: "700", textAlign: "center", lineHeight: 22 },
  button: {
    marginTop: 6,
    borderRadius: 999,
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: "#FCD34D"
  },
  buttonText: { color: "#0B1220", fontSize: 15, fontWeight: "900" }
});
