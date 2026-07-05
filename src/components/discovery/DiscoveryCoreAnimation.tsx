import { useEffect, useMemo, useRef, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

export type DiscoveryCoreResultType = "already_discovered" | "new_variant" | "new_species" | "rare";
export type DiscoveryCoreSourceType = "barcode" | "qr";

type DiscoveryCoreAnimationProps = {
  resultType: DiscoveryCoreResultType;
  sourceType: DiscoveryCoreSourceType;
  characterImage?: ImageSourcePropType;
  characterName: string;
  onFinish: () => void;
  onSkip?: () => void;
};

const timingByType: Record<DiscoveryCoreResultType, number> = {
  already_discovered: 1200,
  new_variant: 3000,
  new_species: 3300,
  rare: 3800
};

const openingTextByType: Record<DiscoveryCoreResultType, string> = {
  already_discovered: "発見済みのコードです",
  new_variant: "コードの奥に、気配があります…",
  new_species: "光が集まっています…",
  rare: "ただならぬ気配がします…"
};

const finishTextByType: Record<DiscoveryCoreResultType, string> = {
  already_discovered: "またDPを少し見つけました",
  new_variant: "新しい個体を発見！",
  new_species: "新しいいきものを発見！",
  rare: "隠れレアを発見！"
};

export const DiscoveryCoreAnimation = ({
  resultType,
  sourceType,
  characterImage,
  characterName,
  onFinish,
  onSkip
}: DiscoveryCoreAnimationProps) => {
  const progress = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const [phaseText, setPhaseText] = useState(openingTextByType[resultType]);
  const duration = timingByType[resultType];

  const particles = useMemo(
    () =>
      Array.from({ length: resultType === "rare" ? 16 : 10 }, (_, index) => ({
        id: index,
        angle: (index / (resultType === "rare" ? 16 : 10)) * Math.PI * 2,
        distance: 88 + (index % 3) * 18,
        size: sourceType === "qr" ? 8 + (index % 2) * 3 : 4,
        delay: index * 45
      })),
    [resultType, sourceType]
  );

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 720, useNativeDriver: true })
      ])
    );
    pulseLoop.start();

    const timers = [
      setTimeout(() => setPhaseText("なにかが目覚めそうです…"), Math.floor(duration * 0.3)),
      setTimeout(() => setPhaseText(resultType === "rare" ? "光の奥から、特別ないきものが現れました" : "もうすぐ姿を現します…"), Math.floor(duration * 0.62)),
      setTimeout(() => setPhaseText(finishTextByType[resultType]), Math.floor(duration * 0.82))
    ];

    Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      pulseLoop.stop();
      timers.forEach(clearTimeout);
    };
  }, [duration, onFinish, progress, pulse, resultType]);

  const coreScale = Animated.add(
    progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [0.65, 1.08, 1.45] }),
    pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.08] })
  );
  const flashOpacity = progress.interpolate({ inputRange: [0, 0.72, 0.86, 1], outputRange: [0, 0, 0.8, 0] });
  const characterOpacity = progress.interpolate({ inputRange: [0, 0.72, 0.9, 1], outputRange: [0, 0, 1, 1] });
  const characterScale = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.82, 0.82, 1] });
  const coreOpacity = progress.interpolate({ inputRange: [0, 0.82, 1], outputRange: [1, 1, 0] });
  const rareGlow = resultType === "rare" ? "#FACC15" : resultType === "new_species" ? "#5EEAD4" : "#93C5FD";

  return (
    <View style={styles.root}>
      <View style={styles.backdrop} />
      <View style={styles.content}>
        <Text style={styles.kicker}>{sourceType === "qr" ? "QRの光" : "バーコードの光"}が集まっています</Text>
        <Text style={styles.phaseText}>{phaseText}</Text>

        <View style={styles.stage}>
          {particles.map((particle) => {
            const x = Math.cos(particle.angle) * particle.distance;
            const y = Math.sin(particle.angle) * particle.distance;
            const translateX = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [x, x * 0.25, 0] });
            const translateY = progress.interpolate({ inputRange: [0, 0.72, 1], outputRange: [y, y * 0.25, 0] });
            const opacity = progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.2, 1, 0] });

            return (
              <Animated.View
                key={particle.id}
                style={[
                  sourceType === "qr" ? styles.qrParticle : styles.barParticle,
                  {
                    width: sourceType === "qr" ? particle.size : particle.size * 5,
                    height: particle.size,
                    backgroundColor: rareGlow,
                    opacity,
                    transform: [{ translateX }, { translateY }]
                  }
                ]}
              />
            );
          })}

          <Animated.View
            style={[
              styles.core,
              {
                borderColor: rareGlow,
                shadowColor: rareGlow,
                opacity: coreOpacity,
                transform: [{ scale: coreScale }]
              }
            ]}
          >
            <View style={[styles.coreInner, { backgroundColor: rareGlow }]} />
          </Animated.View>

          <Animated.View style={[styles.flash, { opacity: flashOpacity }]} />

          <Animated.View style={{ opacity: characterOpacity, transform: [{ scale: characterScale }] }}>
            {characterImage ? (
              <Image source={characterImage} style={styles.characterImage} resizeMode="contain" fadeDuration={0} />
            ) : (
              <View style={styles.fallbackCharacter}>
                <Text style={styles.fallbackText}>?</Text>
              </View>
            )}
          </Animated.View>
        </View>

        <Text numberOfLines={2} adjustsFontSizeToFit style={styles.characterName}>
          {characterName}
        </Text>
        <Pressable accessibilityRole="button" onPress={onSkip ?? onFinish} style={styles.skipButton}>
          <Text style={styles.skipText}>スキップ</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#071B46"
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#020617",
    opacity: 0.88
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
    gap: 14
  },
  kicker: {
    color: "#93C5FD",
    fontSize: 13,
    fontWeight: "900"
  },
  phaseText: {
    minHeight: 54,
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "900",
    textAlign: "center"
  },
  stage: {
    width: 270,
    height: 270,
    alignItems: "center",
    justifyContent: "center"
  },
  core: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    shadowOpacity: 0.55,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 }
  },
  coreInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    opacity: 0.72
  },
  barParticle: {
    position: "absolute",
    borderRadius: 999
  },
  qrParticle: {
    position: "absolute",
    borderRadius: 2
  },
  flash: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#FFFFFF"
  },
  characterImage: {
    width: 218,
    height: 218
  },
  fallbackCharacter: {
    width: 190,
    height: 190,
    borderRadius: 95,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 2,
    borderColor: "#FFFFFF"
  },
  fallbackText: {
    color: "#FFFFFF",
    fontSize: 72,
    fontWeight: "900"
  },
  characterName: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: "center"
  },
  skipButton: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)"
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  }
});
