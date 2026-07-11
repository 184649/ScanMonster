import { useCallback, useEffect, useRef } from "react";
import { Animated, Dimensions, Easing, Pressable, StyleSheet, Text, View, type ImageSourcePropType } from "react-native";

import { getCharacterImage, getCharacterThumb } from "../../assets/characterImages.generated";
import { getMonsterImageSource } from "../../assets/monsterImages";
import type { RevealTier } from "../../services/scanPresentation.core";

type Props = {
  imageKey?: string;
  /** 後方互換。tier 未指定なら isRare から導出。 */
  isRare?: boolean;
  /** 演出ティア（normal/rare/secret/friend）。 */
  tier?: RevealTier;
  /** 特別番号・最強の証・高難度のときの追加演出（§7）。 */
  celebrate?: boolean;
  onDone: () => void;
};

const { width } = Dimensions.get("window");
const CHAR = Math.min(260, Math.round(width * 0.62));
const RAY_COUNT = 12;
const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => i);

const THEME: Record<RevealTier, { glow: string; ray: string; flash: string; banner: string; border: string; label: string }> = {
  normal: { glow: "#BBF7D0", ray: "#86EFAC", flash: "#FFFFFF", banner: "rgba(22, 101, 52, 0.94)", border: "#BBF7D0", label: "いきもの出現！" },
  rare: { glow: "#FDE68A", ray: "#FCD34D", flash: "#FDE68A", banner: "rgba(180, 83, 9, 0.96)", border: "#FDE68A", label: "★ レア出現！ ★" },
  secret: { glow: "#C4B5FD", ray: "#A78BFA", flash: "#DDD6FE", banner: "rgba(76, 29, 149, 0.96)", border: "#C4B5FD", label: "☆ 未知の出現！ ☆" },
  friend: { glow: "#FBCFE8", ray: "#F9A8D4", flash: "#FCE7F3", banner: "rgba(157, 23, 77, 0.94)", border: "#FBCFE8", label: "縁の出現！" }
};

/**
 * 「目覚めの儀式」演出（豪華版・ティア差分）。集光→鼓動→チャージ→シルエット→フラッシュで弾ける
 *（放射光＋きらめき粒子＋回転ハロー）。rare/secret は色・粒子・二段フラッシュ・間を強める。
 * celebrate は特別バッジ＋粒子増でスクショ映えを狙う。タップでスキップ可。新規画像は不要。
 */
export const AwakeningReveal = ({ imageKey, isRare, tier, celebrate = false, onDone }: Props) => {
  const t: RevealTier = tier ?? (isRare ? "rare" : "normal");
  const elevated = t !== "normal";
  const isSecret = t === "secret";
  const theme = THEME[t];

  const source: ImageSourcePropType | undefined =
    (imageKey ? getCharacterImage(imageKey) ?? getCharacterThumb(imageKey) ?? getMonsterImageSource(imageKey) : undefined) ??
    undefined;

  const backdrop = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const charge = useRef(new Animated.Value(0)).current;
  const sil = useRef(new Animated.Value(0)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const tierFlash = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const charO = useRef(new Animated.Value(0)).current;
  const charS = useRef(new Animated.Value(0.82)).current;
  const charRot = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const done = useRef(false);

  const finish = useCallback(() => {
    if (done.current) {
      return;
    }
    done.current = true;
    onDone();
  }, [onDone]);

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: elevated ? 5200 : 6400, easing: Easing.linear, useNativeDriver: true })
    );

    const pulseCount = isSecret ? 5 : elevated ? 4 : 3;
    const pulseDur = elevated ? 240 : 320;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: pulseDur, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: pulseDur, useNativeDriver: true })
      ]),
      { iterations: pulseCount }
    );

    const seq = Animated.sequence([
      Animated.timing(backdrop, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(glow, { toValue: 1, duration: 320, useNativeDriver: true }),
      pulseLoop,
      Animated.timing(charge, { toValue: 1, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(sil, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.parallel([
        Animated.sequence([
          Animated.timing(flash, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(flash, { toValue: 0, duration: 380, useNativeDriver: true })
        ]),
        elevated
          ? Animated.sequence([
              Animated.delay(90),
              Animated.timing(tierFlash, { toValue: 1, duration: 120, useNativeDriver: true }),
              Animated.timing(tierFlash, { toValue: 0, duration: 420, useNativeDriver: true })
            ])
          : Animated.delay(0),
        Animated.timing(burst, { toValue: 1, duration: elevated ? 820 : 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(sil, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(charO, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(charS, { toValue: 1.12, duration: 220, easing: Easing.out(Easing.back(2.2)), useNativeDriver: true }),
          Animated.spring(charS, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.timing(charRot, { toValue: 1, duration: 130, useNativeDriver: true }),
          Animated.timing(charRot, { toValue: -1, duration: 160, useNativeDriver: true }),
          Animated.spring(charRot, { toValue: 0, friction: 5, useNativeDriver: true })
        ]),
        Animated.sequence([
          Animated.delay(120),
          Animated.spring(banner, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true })
        ])
      ]),
      Animated.delay(elevated ? 1050 : 900)
    ]);

    spinLoop.start();
    seq.start(({ finished }) => {
      if (finished) {
        finish();
      }
    });
    return () => {
      seq.stop();
      spinLoop.stop();
    };
    // 初回マウント時に一度だけ再生する。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chargeScale = charge.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] });
  const glowScale = Animated.multiply(glow.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }), chargeScale);
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, elevated ? 1.18 : 1.12] });
  const ringScale = Animated.multiply(glowScale, pulseScale);
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, elevated ? 0.95 : 0.85] });

  const spinDeg = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const rayScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.5] });
  const rayOpacity = burst.interpolate({ inputRange: [0, 0.12, 0.5, 1], outputRange: [0, 0.95, 0.7, 0] });
  const haloOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0, elevated ? 0.9 : 0.6] });
  const charWobble = charRot.interpolate({ inputRange: [-1, 1], outputRange: ["-4deg", "4deg"] });

  const particleCount = isSecret ? 22 : elevated ? 18 : 12;
  const bonusParticles = celebrate ? 6 : 0;
  const particles = Array.from({ length: particleCount + bonusParticles }, (_, i) => i);

  return (
    <Pressable style={styles.overlay} onPress={finish} accessibilityRole="button">
      <Animated.View style={[styles.backdrop, { opacity: backdrop }]} />

      <View style={styles.center}>
        <Animated.View
          style={[styles.halo, { borderColor: theme.glow, opacity: haloOpacity, transform: [{ scale: ringScale }, { rotate: spinDeg }] }]}
        />

        <Animated.View
          style={[styles.rays, { opacity: rayOpacity, transform: [{ scale: rayScale }, { rotate: spinDeg }] }]}
          pointerEvents="none"
        >
          {RAYS.map((i) => (
            <View
              key={i}
              style={[styles.ray, { backgroundColor: theme.ray, transform: [{ rotate: `${(360 / RAY_COUNT) * i}deg` }, { translateY: -CHAR * 0.5 }] }]}
            />
          ))}
        </Animated.View>

        <Animated.View style={[styles.glow, { backgroundColor: theme.glow, opacity: glowOpacity, transform: [{ scale: ringScale }] }]} />
        <Animated.View
          style={[styles.glowInner, { backgroundColor: "#FFFFFF", opacity: Animated.multiply(glowOpacity, 0.9), transform: [{ scale: ringScale }] }]}
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
              style={[styles.char, { opacity: charO, transform: [{ scale: charS }, { rotate: charWobble }] }]}
            />
          </>
        ) : null}

        {particles.map((i) => {
          const angle = (360 / particles.length) * i;
          const dist = CHAR * (0.5 + (i % 3) * 0.16);
          const translateY = burst.interpolate({ inputRange: [0, 1], outputRange: [-CHAR * 0.18, -dist] });
          const opacity = burst.interpolate({ inputRange: [0, 0.18, 0.8, 1], outputRange: [0, 1, 1, 0] });
          const scale = burst.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1, 0.5] });
          return (
            <Animated.View
              key={i}
              pointerEvents="none"
              style={[styles.spark, { backgroundColor: i % 2 === 0 ? "#FFFFFF" : theme.ray, opacity, transform: [{ rotate: `${angle}deg` }, { translateY }, { scale }] }]}
            />
          );
        })}
      </View>

      <Animated.View
        style={[
          styles.banner,
          { backgroundColor: theme.banner, borderColor: theme.border, opacity: banner, transform: [{ scale: banner.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }
        ]}
      >
        <Text style={styles.bannerText}>{theme.label}</Text>
        {celebrate ? <Text style={styles.bannerSub}>この発見は特別です</Text> : null}
      </Animated.View>

      <Animated.View style={[styles.flash, { opacity: flash }]} pointerEvents="none" />
      <Animated.View style={[styles.tierFlash, { backgroundColor: theme.flash, opacity: tierFlash }]} pointerEvents="none" />
      <Text style={styles.skipHint}>タップでスキップ</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#071B46" },
  center: { alignItems: "center", justifyContent: "center", width: CHAR + 160, height: CHAR + 160 },
  halo: { position: "absolute", width: CHAR + 130, height: CHAR + 130, borderRadius: (CHAR + 130) / 2, borderWidth: 2, borderStyle: "dashed" },
  rays: { position: "absolute", width: CHAR * 2, height: CHAR * 2, alignItems: "center", justifyContent: "center" },
  ray: { position: "absolute", width: 4, height: CHAR * 0.9, borderRadius: 2 },
  glow: { position: "absolute", width: CHAR + 90, height: CHAR + 90, borderRadius: (CHAR + 90) / 2 },
  glowInner: { position: "absolute", width: CHAR - 10, height: CHAR - 10, borderRadius: (CHAR - 10) / 2 },
  char: { position: "absolute", width: CHAR, height: CHAR },
  silhouette: { tintColor: "#0B1220" },
  spark: { position: "absolute", width: 9, height: 9, borderRadius: 5 },
  flash: { ...StyleSheet.absoluteFillObject, backgroundColor: "#FFFFFF" },
  tierFlash: { ...StyleSheet.absoluteFillObject },
  banner: { position: "absolute", top: "20%", borderRadius: 999, paddingHorizontal: 22, paddingVertical: 9, borderWidth: 2, alignItems: "center" },
  bannerText: { color: "#FFF7E0", fontSize: 18, fontWeight: "900", letterSpacing: 1 },
  bannerSub: { color: "#FFF7E0", fontSize: 12, fontWeight: "800", marginTop: 2, opacity: 0.9 },
  skipHint: { position: "absolute", bottom: 40, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "800" }
});
