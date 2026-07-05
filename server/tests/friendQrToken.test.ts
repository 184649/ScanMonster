import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FRIEND_QR_TTL_SECONDS, issueFriendQrToken, verifyFriendQrToken } from "../src/friendQrToken.ts";

describe("動的フレンドQRトークン（Phase 2・純粋）", () => {
  it("有効トークンは owner を解決できる", () => {
    const t = issueFriendQrToken("usr_owner");
    const v = verifyFriendQrToken(t);
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.ownerUserId, "usr_owner");
  });

  it("期限切れは無効（exp 経過後）", () => {
    const now = Date.now();
    const t = issueFriendQrToken("usr_owner", now);
    const later = now + (FRIEND_QR_TTL_SECONDS + 1) * 1000;
    const v = verifyFriendQrToken(t, later);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "expired");
  });

  it("改ざん（署名不一致）は無効", () => {
    const t = issueFriendQrToken("usr_owner");
    const [body] = t.split(".");
    const tampered = `${body}.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`;
    const v = verifyFriendQrToken(tampered);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.reason, "bad_signature");
  });

  it("owner を書き換えた本文は署名が合わず無効（userId 偽装不可）", () => {
    const t = issueFriendQrToken("usr_owner");
    const sig = t.split(".")[1]!;
    const forgedBody = Buffer.from(JSON.stringify({ o: "usr_victim", iat: 0, exp: 9999999999 }))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const v = verifyFriendQrToken(`${forgedBody}.${sig}`);
    assert.equal(v.ok, false); // 署名は元の body 用なので不一致
  });

  it("不正形式は無効", () => {
    assert.equal(verifyFriendQrToken("").ok, false);
    assert.equal(verifyFriendQrToken("only-one-part").ok, false);
    assert.equal(verifyFriendQrToken("a.b.c").ok, false);
  });

  it("同じ有効トークンは複数回検証できる（60秒以内は複数人が読める＝世界単位の使い捨てにしない）", () => {
    const t = issueFriendQrToken("usr_owner");
    assert.equal(verifyFriendQrToken(t).ok, true);
    assert.equal(verifyFriendQrToken(t).ok, true);
  });
});
