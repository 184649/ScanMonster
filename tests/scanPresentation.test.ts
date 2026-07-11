import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyOutcome,
  isBigCelebration,
  phaseDurations,
  pickPrimaryRef,
  resolveTier
} from "../src/services/scanPresentation.core.ts";
import type { DiscoveryResultRef } from "../src/types/discovery.ts";

const ref = (id: string, kind: DiscoveryResultRef["kind"]): DiscoveryResultRef => ({
  id,
  kind,
  scanSource: "barcode",
  dpEarned: 0,
  dpBalanceAfter: 0,
  dpBreakdown: []
});

describe("scanPresentation.core", () => {
  it("resolveTier: レアリティ→ティア", () => {
    assert.equal(resolveTier("normal"), "normal");
    assert.equal(resolveTier("rare"), "rare");
    assert.equal(resolveTier("secret"), "secret");
    assert.equal(resolveTier("friend"), "friend");
    assert.equal(resolveTier(undefined), "normal");
  });

  it("isBigCelebration: 最強の証/特別番号/高難度で true", () => {
    assert.ok(isBigCelebration({ strongestProof: true }));
    assert.ok(isBigCelebration({ numberValueRank: "premium" }));
    assert.ok(isBigCelebration({ numberValueRank: "legend" }));
    assert.ok(isBigCelebration({ difficultyRank: "SS" }));
    assert.ok(isBigCelebration({ difficultyRank: "SSS" }));
    assert.ok(!isBigCelebration({ numberValueRank: "rare", difficultyRank: "A" }));
    assert.ok(!isBigCelebration({}));
  });

  it("phaseDurations: secret > rare > normal（待ちを演出に吸収）", () => {
    const n = phaseDurations("normal");
    const r = phaseDurations("rare");
    const s = phaseDurations("secret");
    assert.ok(r.analyzingMin > n.analyzingMin);
    assert.ok(s.analyzingMin > r.analyzingMin);
    assert.ok(s.preReveal > r.preReveal);
    assert.ok(r.preReveal > n.preReveal);
  });

  it("phaseDurations: Reduce Motion / 簡易は短縮", () => {
    const reduced = phaseDurations("secret", { reduceMotion: true });
    const simple = phaseDurations("secret", { simple: true });
    const full = phaseDurations("secret");
    assert.ok(reduced.preReveal < full.preReveal);
    assert.deepEqual(reduced, simple);
  });

  it("classifyOutcome / pickPrimaryRef", () => {
    const dup = [ref("a", "duplicate"), ref("b", "duplicate")];
    const mixed = [ref("a", "duplicate"), ref("b", "first")];
    assert.equal(classifyOutcome(dup), "duplicate");
    assert.equal(classifyOutcome(mixed), "discovered");
    assert.equal(pickPrimaryRef(mixed)?.id, "b");
    assert.equal(pickPrimaryRef(dup), undefined);
  });
});
