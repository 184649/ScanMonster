import { useEffect, useRef, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type ViewStyle } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { getCharacterFrameSet, type MotionName } from "../assets/characterFrames";
import { FEATURE_FLAGS } from "../constants/featureFlags";

type Scene = "scan" | "detail";

type CharacterMotionPlayerProps = {
  /** フレーム素材のキャラクターID（例: "bear"）。 */
  characterId: string;
  /** scan=発見結果（クリック無効） / detail=図鑑詳細（クリックでランダム反応）。 */
  scene: Scene;
  /** 表示領域（正方形, px）。 */
  size?: number;
  /** 自動再生。false のとき idle 先頭フレームで静止。 */
  autoPlay?: boolean;
  /** detail でタップされた時に呼ばれる（SE・親密度加算など）。 */
  onPress?: () => void;
  /** クリック反応を無効化する。 */
  disabled?: boolean;
  /** フレーム素材が無いキャラの代替表示（既存アバター等）。 */
  fallback?: React.ReactNode;
  style?: ViewStyle;
};

const CLICK_MOTIONS: MotionName[] = ["click_01_happy", "click_02_surprise", "click_03_affection"];
const DEFAULT_INTERVAL = { min: 4, max: 8 };

/**
 * 連番PNGのフレームアニメを再生するプレイヤー。
 *
 * scene="scan"  : scan_appear → idle ループ（4〜8秒ごとに normal を1回）。クリック無効。
 * scene="detail": detail_appear → idle ループ（同上）＋タップで click_01/02/03 をランダム再生。
 *
 * 設計上のポイント（低スペック端末対策）:
 * - 同時に画面へ載せる画像は「影 ＋ 静止ポーズ(下地) ＋ 現在フレーム」の最大3枚だけ。
 *   全フレームを重ねたり prefetch したりしない（1024pxの大量デコードでの描画失敗・OOMを避ける）。
 * - 下地(idle先頭フレーム)を常時表示するため、フレーム差し替え中も“真っ白/空白”にならない。
 * - 画面を離れる(フォーカス喪失)/unmount で setTimeout を必ず解除する。
 * - 素材が無いキャラは fallback を表示（既存実装を壊さない）。
 */
export const CharacterMotionPlayer = ({
  characterId,
  scene,
  size = 320,
  autoPlay = true,
  onPress,
  disabled = false,
  fallback = null,
  style
}: CharacterMotionPlayerProps) => {
  const isFocused = useIsFocused();
  const frameSet = getCharacterFrameSet(characterId);

  const [motion, setMotion] = useState<MotionName>("idle");
  const [frameIndex, setFrameIndex] = useState(0);
  const motionRef = useRef<MotionName>("idle");
  // 外側（Pressable）からエンジンのクリック処理を呼ぶための橋渡し。
  const clickHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!frameSet) {
      return;
    }

    // 静止（自動再生オフ or 非フォーカス）：idle 先頭で止める。
    if (!autoPlay || !isFocused) {
      motionRef.current = "idle";
      setMotion("idle");
      setFrameIndex(0);
      return;
    }

    // --- 再生エンジン（この effect のライフサイクルで完結）---
    let active = true;
    let frameTimer: ReturnType<typeof setTimeout> | null = null;
    let normalTimer: ReturnType<typeof setTimeout> | null = null;
    let playingOneShot = false;
    let lastClick: MotionName | null = null;

    const clearFrame = () => {
      if (frameTimer) {
        clearTimeout(frameTimer);
        frameTimer = null;
      }
    };
    const clearNormal = () => {
      if (normalTimer) {
        clearTimeout(normalTimer);
        normalTimer = null;
      }
    };
    const motionOf = (name: MotionName) => frameSet.motions[name];

    const play = (name: MotionName, onDone?: () => void) => {
      const data = motionOf(name);
      if (!data || data.frames.length === 0) {
        onDone?.();
        return;
      }
      motionRef.current = name;
      setMotion(name);
      setFrameIndex(0);
      clearFrame();

      let i = 0;
      const tick = () => {
        if (!active) {
          return;
        }
        i += 1;
        if (i < data.frames.length) {
          setFrameIndex(i);
          frameTimer = setTimeout(tick, data.frameDuration);
        } else {
          onDone?.();
        }
      };
      frameTimer = setTimeout(tick, data.frameDuration);
    };

    const scheduleNormal = () => {
      clearNormal();
      const nm = motionOf("normal");
      if (!nm) {
        return;
      }
      const interval = nm.interval ?? DEFAULT_INTERVAL;
      const ms = (interval.min + Math.random() * Math.max(0, interval.max - interval.min)) * 1000;
      normalTimer = setTimeout(() => {
        if (!active || playingOneShot) {
          return;
        }
        playingOneShot = true;
        play("normal", () => {
          playingOneShot = false;
          enterIdle();
        });
      }, ms);
    };

    const idleLoop = () => {
      if (!active) {
        return;
      }
      play("idle", idleLoop); // idle は待機ループ
    };

    const enterIdle = () => {
      idleLoop();
      scheduleNormal();
    };

    // detail のクリック処理。クリック中は現在のモーションを優先し、直前と同じは避ける。
    clickHandlerRef.current = () => {
      if (!active || disabled || scene !== "detail") {
        return;
      }
      const current = motionRef.current;
      if (current === "click_01_happy" || current === "click_02_surprise" || current === "click_03_affection") {
        return; // クリック再生中は無視（破綻防止）
      }
      let choices = CLICK_MOTIONS.filter((name) => motionOf(name));
      if (choices.length === 0) {
        return;
      }
      if (choices.length > 1 && lastClick) {
        choices = choices.filter((name) => name !== lastClick);
      }
      const pick = choices[Math.floor(Math.random() * choices.length)]!;
      lastClick = pick;
      clearNormal(); // クリック中は normal の自動再生を一時停止
      playingOneShot = true;
      play(pick, () => {
        playingOneShot = false;
        enterIdle();
      });
    };

    // 開始：登場モーション → idle ループ。
    const appear: MotionName = scene === "scan" ? "scan_appear" : "detail_appear";
    if (motionOf(appear)) {
      play(appear, () => enterIdle());
    } else {
      enterIdle();
    }

    return () => {
      active = false;
      clearFrame();
      clearNormal();
      clickHandlerRef.current = null;
    };
  }, [frameSet, autoPlay, isFocused, scene, disabled]);

  const boxStyle = { width: size, height: size };

  // 素材が無ければ代替表示（同じ表示領域で）。
  if (!frameSet) {
    return <View style={[styles.box, boxStyle, style]}>{fallback}</View>;
  }

  const motionData = frameSet.motions[motion] ?? frameSet.motions.idle;
  const frames = motionData?.frames ?? [];
  const currentIndex = Math.min(frameIndex, Math.max(0, frames.length - 1));
  const currentFrame: ImageSourcePropType | undefined = frames[currentIndex];

  // 静止ポーズの下地（idle先頭 or 現在モーション先頭）。差し替え中の空白を防ぐ。
  const baseFrame: ImageSourcePropType | undefined = frameSet.motions.idle?.frames?.[0] ?? frames[0];

  const canvas = (
    <View style={[styles.box, boxStyle, style]}>
      {frameSet.shadow ? (
        <Image source={frameSet.shadow} resizeMode="contain" fadeDuration={0} style={styles.layer} />
      ) : null}
      {baseFrame ? <Image source={baseFrame} resizeMode="contain" fadeDuration={0} style={styles.layer} /> : null}
      {currentFrame ? <Image source={currentFrame} resizeMode="contain" fadeDuration={0} style={styles.layer} /> : null}
      {FEATURE_FLAGS.SHOW_CHARACTER_IMAGE_DEBUG ? (
        <View style={styles.debug}>
          <Text style={styles.debugText}>
            {characterId}/{motion} {currentIndex + 1}/{frames.length}
          </Text>
        </View>
      ) : null}
    </View>
  );

  if (scene === "detail") {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        disabled={disabled}
        onPress={() => {
          clickHandlerRef.current?.();
          onPress?.();
        }}
      >
        {canvas}
      </Pressable>
    );
  }

  return canvas;
};

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  layer: {
    ...StyleSheet.absoluteFillObject
  },
  debug: {
    position: "absolute",
    left: 4,
    bottom: 4,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(15,23,42,0.75)"
  },
  debugText: {
    color: "#FACC15",
    fontSize: 11,
    fontWeight: "900"
  }
});
