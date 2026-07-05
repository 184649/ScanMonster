/**
 * スキャン演出オーバーレイ（§5 の5フェーズ）。
 *  Phase1 scan_locked → Phase2 analyzing（API待ちを吸収）→ Phase3 pre_reveal → Phase4 revealing。
 * Phase5（発見証明）は結果画面に委譲する。サーバー応答は run() の Promise で待ち、
 * analyzingMin を満たすまで解析演出を継続して「待たされ感」を消す。
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { playSound } from "../../services/soundService";
import { hapticBuildup, hapticError, hapticLock, hapticReveal } from "../../services/hapticsService";
import {
  classifyOutcome,
  isBigCelebration,
  phaseDurations,
  pickPrimaryRef,
  resolveTier,
  type RevealTier
} from "../../services/scanPresentation.core";
import { useMonsterStore } from "../../stores/monsterStore";
import { useSettingsStore } from "../../stores/settingsStore";
import type { DiscoveryResultRef } from "../../types/discovery";
import type { ScanOutcome, ScanPresentationPhase } from "../../types/scanPresentation";
import { AwakeningReveal } from "./AwakeningReveal";

type Props = {
  /** 発見APIを実行して結果一覧（重複含む）を返す。 */
  run: () => Promise<DiscoveryResultRef[]>;
  /** 演出完了時にスキャン画面へ結果を返す。 */
  onFinished: (outcome: ScanOutcome) => void;
};

const ANALYZING_TEXTS = ["解析中…", "発見を照合中…", "記録を生成中…"];

type RevealData = { imageKey?: string; tier: RevealTier; celebrate: boolean; results: DiscoveryResultRef[] };

export const ScanPresentation = ({ run, onFinished }: Props) => {
  const [phase, setPhase] = useState<ScanPresentationPhase>("scan_locked");
  const [reveal, setReveal] = useState<RevealData | null>(null);
  const [analyzingText, setAnalyzingText] = useState(ANALYZING_TEXTS[0]);
  const getMonsterById = useMonsterStore((s) => s.getMonsterById);
  const getDiscoveryRecordById = useMonsterStore((s) => s.getDiscoveryRecordById);
  const simpleFx = useSettingsStore((s) => s.settings.simpleScanFx ?? false);

  const skipRef = useRef(false);
  const mountedRef = useRef(true);
  const finishedRef = useRef(false);

  // 共有アニメーション値。
  const ring = useRef(new Animated.Value(0)).current; // 解析リング回転
  const orb = useRef(new Animated.Value(0)).current; // pre_reveal 鼓動
  const lock = useRef(new Animated.Value(0)).current; // ロックオン
  const conv = useRef(new Animated.Value(0)).current; // 収束粒子

  const emit = (outcome: ScanOutcome) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinished(outcome);
  };

  useEffect(() => {
    let reduceMotion = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(resolve, skipRef.current ? 0 : Math.max(0, ms));
        timers.push(t);
      });

    // 無限ループ演出（解析リング・収束粒子・鼓動）。
    const ringLoop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    const convLoop = Animated.loop(Animated.timing(conv, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    const orbLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orb, { toValue: 1, duration: 520, useNativeDriver: true }),
        Animated.timing(orb, { toValue: 0, duration: 520, useNativeDriver: true })
      ])
    );

    (async () => {
      try {
        reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
      } catch {
        reduceMotion = false;
      }
      const simple = simpleFx || reduceMotion;
      const neutral = phaseDurations("normal", { reduceMotion, simple });

      // Phase 1: 読み取り確定
      setPhase("scan_locked");
      hapticLock();
      playSound("scan_read");
      Animated.timing(lock, { toValue: 1, duration: simple ? 120 : 260, useNativeDriver: true }).start();
      const promise = run(); // ここで API を投げる（待機を吸収）
      let settled: { ok?: DiscoveryResultRef[]; err?: unknown } | null = null;
      promise.then((ok) => (settled = { ok })).catch((err) => (settled = { err }));
      await wait(neutral.locked);
      if (!mountedRef.current) return;

      // Phase 2: 解析（最小時間を満たしつつ API を待つ）
      setPhase("analyzing");
      ringLoop.start();
      convLoop.start();
      const t0 = Date.now();
      while (!settled && !skipRef.current && mountedRef.current) {
        await wait(120);
      }
      const remain = neutral.analyzingMin - (Date.now() - t0);
      if (remain > 0 && !skipRef.current) {
        await wait(remain);
      }
      if (!settled) {
        // スキップされても結果が無いと公開できないので待つ。
        settled = await promise.then((ok) => ({ ok })).catch((err) => ({ err }));
      }
      ringLoop.stop();
      convLoop.stop();
      if (!mountedRef.current) return;

      if (settled?.err) {
        hapticError();
        emit({ kind: "error", message: "発見処理に失敗しました。もう一度読み取ってください。" });
        return;
      }
      const refs = settled?.ok ?? [];
      if (classifyOutcome(refs) === "duplicate") {
        emit({ kind: "duplicate", results: refs });
        return;
      }

      // 公開対象を確定。
      const primary = pickPrimaryRef(refs);
      const monster = primary?.monsterId ? getMonsterById(primary.monsterId) : undefined;
      const cert = primary?.discoveryRecordId ? getDiscoveryRecordById(primary.discoveryRecordId) : undefined;
      const tier = resolveTier(monster?.characterRarity);
      const celebrate = cert
        ? isBigCelebration({
            numberValueRank: cert.primaryNumberBadge?.valueRank,
            difficultyRank: cert.difficultyRank,
            strongestProof: cert.strongestProof
          })
        : false;
      setReveal({ imageKey: monster?.imageKey, tier, celebrate, results: refs });

      // Phase 3: 出現前のため（ティアで長さを変える）
      playSound("scan_success"); // 解析完了＝抽選に進む合図
      setPhase("pre_reveal");
      hapticBuildup();
      orbLoop.start();
      const pre = phaseDurations(tier, { reduceMotion, simple });
      await wait(pre.preReveal);
      orbLoop.stop();
      if (!mountedRef.current) return;

      // Phase 4: 公開（AwakeningReveal に委譲）
      setPhase("revealing");
      hapticReveal(tier);
      playSound(tier === "normal" ? "discovery_normal" : "discovery_rare");
    })();

    return () => {
      mountedRef.current = false;
      timers.forEach(clearTimeout);
      ringLoop.stop();
      convLoop.stop();
      orbLoop.stop();
    };
    // マウント時に一度だけ実行。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 解析中テキストの巡回。
  useEffect(() => {
    if (phase !== "analyzing") return;
    let i = 0;
    const id = setInterval(() => {
      i = (i + 1) % ANALYZING_TEXTS.length;
      setAnalyzingText(ANALYZING_TEXTS[i]);
    }, 700);
    return () => clearInterval(id);
  }, [phase]);

  const ringSpin = ring.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const convParticles = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  const onSkip = () => {
    skipRef.current = true;
  };

  if (phase === "revealing" && reveal) {
    // AwakeningReveal の暗幕は 0→1 でフェードインするため、その間に背後のカメラが
    // 一瞬透けるのを防ぐため、常に不透明な暗幕を裏に敷いておく。
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <View style={styles.backdrop} />
        <AwakeningReveal
          imageKey={reveal.imageKey}
          tier={reveal.tier}
          celebrate={reveal.celebrate}
          onDone={() => emit({ kind: "discovered", results: reveal.results })}
        />
      </View>
    );
  }

  return (
    <Pressable style={styles.overlay} onPress={onSkip} accessibilityRole="button">
      <View style={styles.backdrop} />

      {phase === "scan_locked" ? (
        <Animated.View style={[styles.lockWrap, { opacity: lock, transform: [{ scale: lock.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }) }] }]}>
          <View style={styles.lockBox}>
            <View style={[styles.corner, styles.cTL]} />
            <View style={[styles.corner, styles.cTR]} />
            <View style={[styles.corner, styles.cBL]} />
            <View style={[styles.corner, styles.cBR]} />
            <View style={styles.lockDot} />
          </View>
          <Text style={styles.phaseText}>読み取り確定</Text>
        </Animated.View>
      ) : null}

      {phase === "analyzing" ? (
        <View style={styles.center}>
          <Animated.View style={[styles.analyzeRing, { transform: [{ rotate: ringSpin }] }]} />
          <Animated.View style={[styles.analyzeRingInner, { transform: [{ rotate: ringSpin }] }]} />
          {convParticles.map((i) => {
            const angle = (360 / convParticles.length) * i;
            const ty = conv.interpolate({ inputRange: [0, 1], outputRange: [-96, -20] });
            const op = conv.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] });
            return (
              <Animated.View
                key={i}
                style={[styles.convDot, { opacity: op, transform: [{ rotate: `${angle}deg` }, { translateY: ty }] }]}
              />
            );
          })}
          <View style={styles.coreDot} />
          <Text style={styles.phaseTextLight}>{analyzingText}</Text>
        </View>
      ) : null}

      {phase === "pre_reveal" ? (
        <View style={styles.center}>
          <Animated.View
            style={[styles.orbOuter, { opacity: orb.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.95] }), transform: [{ scale: orb.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.14] }) }] }]}
          />
          <Animated.View
            style={[styles.orbInner, { opacity: orb.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }), transform: [{ scale: orb.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1.06] }) }] }]}
          />
          <Text style={styles.phaseTextLight}>なにかが目覚める…！</Text>
        </View>
      ) : null}

      <Text style={styles.skipHint}>タップで演出を短縮</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", zIndex: 50 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#071B46" },
  center: { alignItems: "center", justifyContent: "center", width: 240, height: 240 },
  lockWrap: { alignItems: "center", gap: 16 },
  lockBox: { width: 160, height: 160, alignItems: "center", justifyContent: "center" },
  corner: { position: "absolute", width: 34, height: 34, borderColor: "#7DD3FC" },
  cTL: { left: 0, top: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cTR: { right: 0, top: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cBL: { left: 0, bottom: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cBR: { right: 0, bottom: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  lockDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: "#E0F2FE" },
  analyzeRing: { position: "absolute", width: 150, height: 150, borderRadius: 75, borderWidth: 3, borderColor: "rgba(125,211,252,0.35)", borderTopColor: "#7DD3FC" },
  analyzeRingInner: { position: "absolute", width: 104, height: 104, borderRadius: 52, borderWidth: 3, borderColor: "rgba(250,204,21,0.25)", borderBottomColor: "#FACC15" },
  convDot: { position: "absolute", width: 8, height: 8, borderRadius: 4, backgroundColor: "#BAE6FD" },
  coreDot: { position: "absolute", width: 20, height: 20, borderRadius: 10, backgroundColor: "#FFFFFF" },
  orbOuter: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#1D4ED8" },
  orbInner: { position: "absolute", width: 96, height: 96, borderRadius: 48, backgroundColor: "#DBEAFE" },
  phaseText: { color: "#E0F2FE", fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  phaseTextLight: { position: "absolute", bottom: -6, color: "rgba(224,242,254,0.92)", fontSize: 15, fontWeight: "800" },
  skipHint: { position: "absolute", bottom: 40, color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "800" }
});
