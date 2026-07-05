import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildFriendQrPayload, parseFriendQrPayload } from "../src/utils/friendQrPayload.ts";

describe("friendQrPayload", () => {
  it("build→parse で userId を往復できる", () => {
    const payload = buildFriendQrPayload("user_abc123");
    assert.equal(payload, "worldawn:fq:user_abc123");
    assert.equal(parseFriendQrPayload(payload), "user_abc123");
  });

  it("フレンドQR以外は null（商品QR・招待コード等）", () => {
    assert.equal(parseFriendQrPayload("https://example.com/product/123"), null);
    assert.equal(parseFriendQrPayload("worldawn:invite:ABCD1234"), null);
    assert.equal(parseFriendQrPayload("ABCD1234"), null);
  });

  it("空・null は null", () => {
    assert.equal(parseFriendQrPayload(""), null);
    assert.equal(parseFriendQrPayload(null), null);
    assert.equal(parseFriendQrPayload("worldawn:fq:"), null);
  });
});
