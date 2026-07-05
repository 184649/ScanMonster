import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { _resetRateLimits, hitRateLimit } from "../src/rateLimit.ts";

describe("レート制限コア（Phase 3・純粋）", () => {
  it("上限までは許可、超過で 429 相当（allowed=false）", () => {
    _resetRateLimits();
    const rule = { max: 3, windowMs: 1000 };
    const now = 1_000_000;
    assert.equal(hitRateLimit("k", rule, now).allowed, true); // 1
    assert.equal(hitRateLimit("k", rule, now).allowed, true); // 2
    assert.equal(hitRateLimit("k", rule, now).allowed, true); // 3
    const over = hitRateLimit("k", rule, now); // 4
    assert.equal(over.allowed, false);
    assert.ok(over.retryAfterMs > 0);
  });

  it("ウィンドウ経過でリセットされる", () => {
    _resetRateLimits();
    const rule = { max: 1, windowMs: 1000 };
    const t0 = 2_000_000;
    assert.equal(hitRateLimit("k", rule, t0).allowed, true);
    assert.equal(hitRateLimit("k", rule, t0).allowed, false);
    assert.equal(hitRateLimit("k", rule, t0 + 1001).allowed, true); // ウィンドウ跨ぎ
  });

  it("キーが異なれば独立（owner が100人に読まれても各 reader は別バケット）", () => {
    _resetRateLimits();
    const rule = { max: 1, windowMs: 1000 };
    const now = 3_000_000;
    for (let i = 0; i < 100; i++) {
      assert.equal(hitRateLimit(`reader:${i}`, rule, now).allowed, true); // 各 reader 1回目は必ず許可
    }
  });
});
