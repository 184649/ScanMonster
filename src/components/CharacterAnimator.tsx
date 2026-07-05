import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { useIsFocused } from "@react-navigation/native";

type CharacterAnimatorMode = "scanResult" | "detail";

/** 内部のモーション状態機械。 */
type MotionState = "idle" | "normal" | "click1" | "click2" | "click3";

type CharacterAnimatorProps = {
  /** scanResult=発見結果（idle/normalのみ・クリック無効） / detail=図鑑詳細（idle/normal＋クリック反応）。 */
  mode: CharacterAnimatorMode;
  /** detail のときにクリック反応を有効化する。 */
  enableClickMotion?: boolean;
  /** 包む対象（MonsterAvatar や Image）。画像そのものは差し替えない＝色・比率・顔つき・雰囲気を変えない。 */
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * WORLDAWN 初回リリースのキャラクターアニメーション（軽量2D / React Native Animated）。
 *
 * - idle（待機）→ normal（通常）→ idle → normal … を定間隔で繰り返す状態機械。
 * - scanResult: idle/normal のみ。クリック反応なし。
 * - detail + enableClickMotion: クリックで click1/click2/click3 からランダム1つを再生し、
 *   終了後は必ず idle/normal ループへ戻る。連続クリックでも壊れない。
 * - 画面から離れた（フォーカスを失った）ら停止し、戻ったら再開する。
 * - transform（translate/scale/rotate）だけを重ね、1枚画像でも自然に見える。原型は崩さない。
 *   将来パーツ分割PNGへ拡張する場合も、この状態機械の上に載せられる。
 */
export const CharacterAnimator = ({ mode, enableClickMotion = false, children, style }: CharacterAnimatorProps) => {
  const isFocused = useIsFocused();

  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current; // -1..1

  const motionRef = useRef<MotionState>("idle");
  const currentAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const loopStoppedRef = useRef(true);
  const clickingRef = useRef(false);
  const clickTokenRef = useRef(0);

  const resetValues = () => {
    translateX.setValue(0);
    translateY.setValue(0);
    scale.setValue(1);
    rotate.setValue(0);
  };

  // --- 各モーションの Animated シーケンス（都度生成する）---
  const idleAnim = (): Animated.CompositeAnimation =>
    // 待機：呼吸のように控えめに上下＋わずかな拡縮。
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, { toValue: -4, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.02, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ]);

  const normalAnim = (): Animated.CompositeAnimation =>
    // 通常：待機より少しだけ動く（軽く跳ねて小さく傾く）。
    Animated.parallel([
      Animated.sequence([
        Animated.timing(translateY, { toValue: -8, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 700, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(200)
      ]),
      Animated.sequence([
        Animated.timing(rotate, { toValue: 0.5, duration: 350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -0.3, duration: 350, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0, duration: 350, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ]);

  const click1Anim = (): Animated.CompositeAnimation =>
    // よろこぶ：ぴょんと跳ねて少し大きくなり、ふわっと戻る。
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, { toValue: -18, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, friction: 4, tension: 120, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true })
      ])
    ]);

  const click2Anim = (): Animated.CompositeAnimation =>
    // おどろく：一瞬びくっと縮んで、小刻みに震えてから戻る。
    Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, { toValue: 5, duration: 90, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.95, duration: 90, useNativeDriver: true })
      ]),
      Animated.sequence([
        Animated.timing(translateX, { toValue: 7, duration: 55, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -7, duration: 55, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 50, useNativeDriver: true })
      ]),
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 130, useNativeDriver: true })
      ])
    ]);

  const click3Anim = (): Animated.CompositeAnimation =>
    // なつく：ゆっくり近づいて、柔らかく揺れてから戻る。
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 1.12, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 0.4, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      ]),
      Animated.timing(rotate, { toValue: -0.3, duration: 260, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }),
        Animated.spring(rotate, { toValue: 0, friction: 5, tension: 90, useNativeDriver: true })
      ])
    ]);

  // --- idle → normal → idle → normal … のループ ---
  const runLoop = () => {
    if (loopStoppedRef.current || clickingRef.current) {
      return;
    }
    motionRef.current = "idle";
    const seq = Animated.sequence([idleAnim(), normalAnim()]);
    currentAnimRef.current = seq;
    // 実行中は normal 区間に入ったら motion を更新（表示ロジック用の内部状態）。
    motionRef.current = "idle";
    seq.start(({ finished }) => {
      if (finished && !loopStoppedRef.current && !clickingRef.current) {
        runLoop();
      }
    });
  };

  const stopAll = () => {
    loopStoppedRef.current = true;
    clickingRef.current = false;
    currentAnimRef.current?.stop();
    currentAnimRef.current = null;
    resetValues();
  };

  // フォーカスに応じて開始/停止（画面遷移で停止し、戻ると再開する）。
  useEffect(() => {
    if (isFocused) {
      loopStoppedRef.current = false;
      clickingRef.current = false;
      resetValues();
      runLoop();
    } else {
      stopAll();
    }
    return () => {
      stopAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  const handleClick = () => {
    if (mode !== "detail" || !enableClickMotion || loopStoppedRef.current) {
      return;
    }

    // 連続クリック対策：新しいトークンを発行してから、進行中のアニメを止める。
    const myToken = ++clickTokenRef.current;
    currentAnimRef.current?.stop();
    clickingRef.current = true;
    resetValues();

    const pick = 1 + Math.floor(Math.random() * 3); // 1..3
    const anim = pick === 1 ? click1Anim() : pick === 2 ? click2Anim() : click3Anim();
    motionRef.current = pick === 1 ? "click1" : pick === 2 ? "click2" : "click3";
    currentAnimRef.current = anim;

    anim.start(({ finished }) => {
      // 途中で新しいクリックに置き換わっていたら、そのクリックの完了に任せる。
      if (myToken !== clickTokenRef.current) {
        return;
      }
      clickingRef.current = false;
      motionRef.current = "idle";
      if (finished && !loopStoppedRef.current) {
        runLoop();
      }
    });
  };

  const animatedStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale },
      { rotate: rotate.interpolate({ inputRange: [-1, 1], outputRange: ["-6deg", "6deg"] }) }
    ]
  };

  const content = <Animated.View style={[styles.center, animatedStyle]}>{children}</Animated.View>;

  if (mode === "detail" && enableClickMotion) {
    return (
      <Pressable accessibilityRole="imagebutton" onPress={handleClick} style={[styles.center, style]}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.center, style]}>{content}</View>;
};

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center"
  }
});
