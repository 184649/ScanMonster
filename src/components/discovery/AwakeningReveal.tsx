import { useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { getCharacterImage, getCharacterThumb } from "../../assets/characterImages.generated";
import { getMonsterImageSource } from "../../assets/monsterImages";

type Props = {
  imageKey?: string;
  isRare: boolean;
  onDone: () => void;
};

const { width } = Dimensions.get("window");
const CHAR = Math.min(260, Math.round(width * 0.62));

/**
 * 「目覚めの儀式」演出（トーンB）。集光→ため→シルエット→目覚め。
 * レアは色・鼓動・弾けを強める。タップでスキップ可。新規キャラ画像は不要
 *（シルエット＝キャラ画像を tintColor で黒く塗るだけ）。
 */
export const AwakeningReveal = ({ imageKey, isRare, onDone }: Props) => {
  const source: ImageSourcePropType | undefined =
    (imageKey ? getCharacterImage(imageKey) ?? getCharacterThumb(imageKey) ?? getMonsterImageSource(imageKey) : undefined) ??
    undefined;

  const backdrop = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const sil = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const charO = useRef(new Animated.Value(0)).current;
  const charS = useRef(new Animated.Value(0.82)).current;
  const banner = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const pulseCount = isRare ? 4 : 3;
    const pulseDur = isRare ? 250 : 330;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: pulseDur, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: pulseDur, useNativeDriver: true })
      ]),
      { iterations: pulseCount }
    );

    const seq = Animated.sequence([
      Animated.timing(backdrop, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration: 300, useNativeDriver: true }),
      pulseLoop,
      Animated.timing(sil, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 340, useNativeDriver: true })
        ]),
        Animated.timing(sil, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(charO, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(charS, { toValue: 1.06, duration: 240, useNativeDriver: true }),
          Animated.spring(charS, { toValue: 1, friction: 6, useNativeDriver: true })
        ]),
        Animated.timing(banner, { toValue: 1, duration: 320, useNativeDriver: true })
      ]),
      Animated.delay(900)
    ]);

    seq.start(({ finished }) => {
      if (finished) {
        finish();
      }
    });
    return () => seq.stop();
    // 初回マウント時に一度だけ再生する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const glowColor = isRare ? "#FDE68A" : "#BBF7D0";
  const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, isRare ? 1.16 : 1.12] });
  const ringScale = Animated.multiply(glowScale, pulseScale);
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, isRare ? 0.95 : 0.85] });

  return (
    <Pressable style={styles.overlay} onPress={finish} accessibilityRole="button">
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />

      <View style={styles.center}>
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: glowColor, opacity: glowOpacity, transform: [{ scale: ringScale }] }
          ]}
        />
        <Animated.View
          style={[
            styles.glowInner,
            { backgroundColor: "#FFFFFF", opacity: Animated.multiply(glowOpacity, 0.9), transform: [{ scale: ringScale }] }
          ]}
        />

        {source ? (
          <>
            <Animated.Image
              source={source}
              resizeMode="contain"
              style={[styles.char, styles.silhouette, { opacity: sil, transform: [{ scale: glowScale }] }]}
            />
            <Animated.Image
              source={source}
              resizeMode="contain"
              style={[styles.char, { opacity: charO, transform: [{ scale: charS }] }]}
            />
          </>
        ) : null}
      </View>

      {isRare ? (
        <Animated.View style={[styles.banner, { opacity: banner }]}>
          <Text style={styles.bannerText}>レア出現！</Text>
        </Animated.View>
      ) : null}

      <Animated.View style={[styles.flash, { opacity: flash }]} pointerEvents="none" />
      <Text style={styles.skipHint}>タップでスキップ</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#071B46" },
  center: { alignItems: "center", justifyContent: "center", width: CHAR + 120, height: CHAR + 120 },
  glow: {
    position: "absolute",
    width: CHAR + 90,
    height: CHAR + 90,
    borderRadius: (CHAR + 90) / 2
  },
  glowInner: {
    position: "absolute",
    width: CHAR - 10,
    height: CHAR - 10,
    borderRadius: (CHAR - 10) / 2
  },
  char: { position: "absolute", width: CHAR, height: CHAR },
  silhouette: { tintColor: "#0B1220" },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" },
  banner: {
    position: "absolute",
    top: "22%",
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: "rgba(180, 83, 9, 0.95)"
  },
  bannerText: { color: "#FFF7E0", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  skipHint: { position: "absolute", bottom: 40, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800" }
});
