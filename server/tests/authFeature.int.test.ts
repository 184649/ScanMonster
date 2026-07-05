import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { getPool, setPool } from "../src/db.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト: 認証・引継ぎ・要望掲示板（pg-mem 実SQL）。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `af_${Date.now()}`;
const guestUser = `${RUN}_guest`;
const email = `${RUN}@example.com`;

before(async () => {
  if (!hasRealDb) {
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    applyAllMigrations(mem);
    const { Pool } = mem.adapters.createPg();
    setPool(new Pool() as unknown as import("pg").Pool);
  }
});

describe("認証・アカウント連携・引継ぎ", () => {
  it("register→login で同じ userId（引継ぎ先）が返る", async () => {
    const { registerAccount, loginAccount } = await import("../src/authService.ts");
    const reg = await registerAccount({ email, password: "secret123", userId: guestUser });
    assert.equal(reg.userId, guestUser);
    assert.ok(reg.token);

    const login = await loginAccount({ email, password: "secret123" });
    assert.equal(login.userId, guestUser); // 別端末でも同じデータキーに繋がる
  });

  it("重複メールは 409、誤パスワードは 401", async () => {
    const { registerAccount, loginAccount, AuthError } = await import("../src/authService.ts");
    await assert.rejects(
      registerAccount({ email, password: "secret123", userId: `${RUN}_g2` }),
      (e) => e instanceof AuthError && e.status === 409
    );
    await assert.rejects(
      loginAccount({ email, password: "wrongpass" }),
      (e) => e instanceof AuthError && e.status === 401
    );
  });

  it("引継ぎコード: create→redeem で user_id を取り戻す・再利用不可", async () => {
    const { createTransferCode, redeemTransferCode, AuthError } = await import("../src/authService.ts");
    const { code } = await createTransferCode(guestUser);
    const redeemed = await redeemTransferCode(code);
    assert.equal(redeemed.userId, guestUser);
    await assert.rejects(redeemTransferCode(code), (e) => e instanceof AuthError); // 使用済み
  });
});

describe("要望掲示板", () => {
  it("投稿→一覧に出る／リアクションのトグルでカウント増減", async () => {
    const { createFeatureRequest, listFeatureRequests, toggleReaction } = await import("../src/featureService.ts");
    const author = `${RUN}_author`;
    const other = `${RUN}_other`;
    const { id } = await createFeatureRequest({ userId: author, title: "ダークモードが欲しい", body: "夜に使いやすく" });

    let list = await listFeatureRequests({ userId: other, sort: "new" });
    const item = list.find((r) => r.id === id);
    assert.ok(item);
    assert.equal(item!.reactionCount, 0);
    assert.equal(item!.mine, false);

    const r1 = await toggleReaction({ requestId: id, userId: other });
    assert.equal(r1.reacted, true);
    assert.equal(r1.count, 1);

    list = await listFeatureRequests({ userId: other, sort: "top" });
    assert.equal(list.find((r) => r.id === id)!.reactionCount, 1);
    assert.equal(list.find((r) => r.id === id)!.reactedByMe, true);

    const r2 = await toggleReaction({ requestId: id, userId: other }); // 解除
    assert.equal(r2.reacted, false);
    assert.equal(r2.count, 0);
  });

  it("短すぎるタイトルは弾く", async () => {
    const { createFeatureRequest, FeatureError } = await import("../src/featureService.ts");
    await assert.rejects(
      createFeatureRequest({ userId: `${RUN}_x`, title: "a" }),
      (e) => e instanceof FeatureError
    );
  });
});
