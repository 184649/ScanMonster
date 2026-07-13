import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_FRIEND_QR_SECRET,
  FRIEND_QR_TTL_SECONDS,
  isDefaultFriendQrSecret,
  issueFriendQrToken,
  verifyFriendQrToken
} from "../src/friendQrToken.ts";

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

  it("本番ガード：秘密鍵が未設定/既定なら危険と判定する（偽造防止の起動ガード用）", () => {
    const saved = process.env.FRIEND_QR_SECRET;
    try {
      delete process.env.FRIEND_QR_SECRET;
      assert.equal(isDefaultFriendQrSecret(), true, "未設定は危険");
      process.env.FRIEND_QR_SECRET = DEFAULT_FRIEND_QR_SECRET;
      assert.equal(isDefaultFriendQrSecret(), true, "既定値のままは危険");
      process.env.FRIEND_QR_SECRET = "a-strong-random-production-secret";
      assert.equal(isDefaultFriendQrSecret(), false, "強い値なら安全");
    } finally {
      if (saved === undefined) delete process.env.FRIEND_QR_SECRET;
      else process.env.FRIEND_QR_SECRET = saved;
    }
  });
});
