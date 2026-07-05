/**
 * ハプティクス（触覚フィードバック）。設定 hapticsEnabled で ON/OFF。失敗は握りつぶす。
 * 演出音OFF・振動OFFでも成立するよう、各所は best-effort で呼ぶだけ。
 */
import * as Haptics from "expo-haptics";

import { useSettingsStore } from "../stores/settingsStore";
import type { RevealTier } from "./scanPresentation.core";

const enabled = (): boolean => {
  try {
    return useSettingsStore.getState().settings.hapticsEnabled ?? true;
  } catch {
    return false;
  }
};

const safe = (fn: () => void) => {
  if (!enabled()) return;
  try {
    fn();
  } catch {
    // 非対応端末/Web では無視。
  }
};

/** 読み取り確定（軽い）。 */
export const hapticLock = (): void => safe(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** 出現前のため（中）。 */
export const hapticBuildup = (): void => safe(() => void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

/** 公開時。rare/secret は強め＋成功通知。 */
export const hapticReveal = (tier: RevealTier): void =>
  safe(() => {
    if (tier === "rare" || tier === "secret") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  });

/** エラー。 */
export const hapticError = (): void =>
  safe(() => void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
