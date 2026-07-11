import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, describe, it } from "node:test";

import { getPool, setPool, withTransaction } from "../src/db.ts";
import { finalizeDiscovery, getLegendaryUnlockedWorlds } from "../src/scanService.ts";
import { processScan } from "../src/scanService.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 地上ワールド ゴールデンパス統合テスト（本番コード経路 processScan / finalizeDiscovery を使用）。
 * fixture は「テスト専用の地上ワールド」で本番 seed/アセットには一切触れない。
 * 抽選はテストでも固定しない：normal のみ候補が存在する構成にして本番の乱択のまま normal を集め切る。
 * legendary は実確率 1% では引けないため、legendary“発見”は本番の共有 finalizer を直接呼んで検証する
 * （＝採番/記録/証明の本番経路。候補入りの可否は解放前後で別途検証）。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `gp_${Date.now()}`;
const W = `${RUN}_ground`;
const N = [`${RUN}_n1`, `${RUN}_n2`, `${RUN}_n3`];
const L = `${RUN}_legend`; // 地上legendary（テスト専用）
const S = `${RUN}_secret`; // secret（is_available_for_scan=FALSE＝出現しないが秘匿検証に使う）

let server: Server;
let base = "";

const anon = async (): Promise<{ token: string; userId: string }> => {
  const res = await fetch(`${base}/api/auth/anon`, { method: "POST" });
  return (await res.json()) as { token: string; userId: string };
};
const dex = async (token: string): Promise<Array<{ id: string; discovered: boolean }>> => {
  const res = await fetch(`${base}/api/dex`, { headers: { Authorization: `Bearer ${token}` } });
  return ((await res.json()) as { characters: Array<{ id: string; discovered: boolean }> }).characters;
};
const discovered = async (userId: string): Promise<Set<string>> => {
  const r = await getPool().query<{ character_id: string }>("SELECT character_id FROM character_records WHERE user_id = $1", [userId]);
  return new Set(r.rows.map((x) => x.character_id));
};

before(async () => {
  if (!hasRealDb) {
    const { newDb } = await import("pg-mem");
    const mem = newDb();
    applyAllMigrations(mem);
    const { Pool } = mem.adapters.createPg();
    setPool(new Pool() as unknown as import("pg").Pool);
  }
  const pool = getPool();
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','地上(test)',TRUE) ON CONFLICT (world_group) DO NOTHING", [W]);
  for (const id of N) {
    await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [id, W]);
  }
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex) VALUES ($1,$1,'legendary',$2,TRUE,FALSE) ON CONFLICT (id) DO NOTHING", [L, W]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group, is_available_for_scan, is_visible_in_dex) VALUES ($1,$1,'secret',$2,FALSE,FALSE) ON CONFLICT (id) DO NOTHING", [S, W]);
  const { createApp } = await import("../src/app.ts");
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => server?.close());

describe("地上ゴールデンパス（本番コード経路・pg-mem）", () => {
  it("匿名→解放→normalスキャン→最後の1体で伝説解放（その瞬間のみ）→秘匿→伝説発見→再取得→引き継ぎ", async () => {
    // 1. 匿名アカウント（Bearer）
    const me = await anon();
    assert.ok(me.userId.startsWith("usr_"));
    await getPool().query(
      "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
      [`uw_${me.userId}`, me.userId, W]
    );

    // 2. 解放前：legendary未解放・dexに legendary/secret を出さない
    assert.equal((await withTransaction((c) => getLegendaryUnlockedWorlds(c, me.userId, [W]))).has(W), false);
    let ids = (await dex(me.token)).map((c) => c.id);
    assert.ok(N.every((n) => ids.includes(n)), "normalは表示される");
    assert.ok(!ids.includes(L), "解放前は legendary を出さない");
    assert.ok(!ids.includes(S), "secret は出さない");

    // 3. normal を集め切る（本番の乱択のまま。normal候補しか成立しないので必ず normal を引く）
    let unlockedNowCount = 0;
    let completedAt = -1;
    for (let i = 0; i < 60; i++) {
      const before = await discovered(me.userId);
      const beforeNormals = N.filter((n) => before.has(n)).length;
      const r = await processScan({ userId: me.userId, sourceHash: `${RUN}_h${i}`, scanType: "barcode", localDate: "2026-07-07" });
      assert.equal(r.status, "discovered");
      if (r.status !== "discovered") break;
      assert.equal(typeof r.discoveryRecord.characterDiscoveryNo, "string"); // 公式番号 string
      // 伝説解放は「normalの最後の1体を新規発見した瞬間」のみ
      if (r.discoveryRecord.legendaryUnlockedNow) {
        unlockedNowCount += 1;
        completedAt = i;
        assert.equal(r.discoveryRecord.legendaryUnlockedNow, W);
        const nowNormals = N.filter((n) => beforeNormals >= 0).length; // 解放時点で全normal発見済みのはず
        const after = await discovered(me.userId);
        assert.ok(N.every((n) => after.has(n)), "解放時点で全normalが発見済み");
        void nowNormals;
      }
      const after = await discovered(me.userId);
      if (N.every((n) => after.has(n))) break;
    }
    assert.equal(unlockedNowCount, 1, "legendaryUnlockedNow はちょうど1回だけ発火");
    assert.ok(completedAt >= 0, "normalコンプリートが成立");

    // 4. 解放後：user_world_legendary 記録あり・dexに legendary が出る（secretは依然非表示）
    assert.equal((await withTransaction((c) => getLegendaryUnlockedWorlds(c, me.userId, [W]))).has(W), true);
    const uwl = await getPool().query("SELECT 1 FROM user_world_legendary WHERE user_id=$1 AND world_group=$2", [me.userId, W]);
    assert.equal(uwl.rowCount, 1);
    ids = (await dex(me.token)).map((c) => c.id);
    assert.ok(ids.includes(L), "解放後は legendary をシルエット表示できる");
    assert.ok(!ids.includes(S), "secret は解放後も非表示");

    // 5. 再解放しない：全normal発見済みで再スキャン → legendaryUnlockedNow は返らない
    const again = await processScan({ userId: me.userId, sourceHash: `${RUN}_again`, scanType: "barcode", localDate: "2026-07-07" });
    assert.equal(again.status === "discovered" && again.discoveryRecord.legendaryUnlockedNow, undefined);

    // 6. legendary を実発見（本番の共有 finalizer 経路）：採番・記録・証明・rarity保持
    const legRec = await withTransaction((c) =>
      finalizeDiscovery(c, {
        userId: me.userId,
        character: { id: L, name: L, world_group: W, rarity: "legendary" },
        localDate: "2026-07-07",
        discoverySource: "normal_scan",
        proofRoll: 0.99,
        friendCountToday: 0,
        isFirstValidScanOfDay: false
      })
    );
    assert.equal(legRec.rarity, "legendary"); // normalへ丸めない
    assert.equal(legRec.characterDiscoveryNo, "1"); // キャラ別独立連番（Lの初発見=No.1）
    assert.equal(typeof legRec.characterDiscoveryNo, "string");
    assert.ok(legRec.certificateId.startsWith("cert_"));
    const dr = await getPool().query("SELECT rarity FROM discovery_records WHERE id=$1", [legRec.id]);
    assert.equal((dr.rows[0] as { rarity: string }).rarity, "legendary");
    const cr = await getPool().query("SELECT 1 FROM character_records WHERE user_id=$1 AND character_id=$2", [me.userId, L]);
    assert.equal(cr.rowCount, 1);
    ids = (await dex(me.token)).map((c) => c.id);
    assert.ok(ids.includes(L), "発見済み legendary は dex に出る");

    // 7. 再取得（再起動相当）：新しい Bearer 取得は不可（同一ユーザー）だが、既存 token で discoveries/dp を取り戻せる
    const dl = (await (await fetch(`${base}/api/discoveries`, { headers: { Authorization: `Bearer ${me.token}` } })).json()) as { discoveries: Array<{ character_id: string; rarity: string }> };
    assert.ok(dl.discoveries.some((d) => d.character_id === L && d.rarity === "legendary"));
    const dp = (await (await fetch(`${base}/api/dp`, { headers: { Authorization: `Bearer ${me.token}` } })).json()) as { balance: number };
    assert.ok(dp.balance > 0);

    // 8. 引き継ぎ：別 token でも legendary解放・legendary発見・公式番号が保持される
    const { createTransferCode, redeemTransferCode } = await import("../src/authService.ts");
    const { code } = await createTransferCode(me.userId);
    const redeemed = await redeemTransferCode(code);
    assert.equal(redeemed.userId, me.userId);
    ids = (await dex(redeemed.token)).map((c) => c.id);
    assert.ok(ids.includes(L), "引き継ぎ後も legendary が見える（解放保持）");
    const dl2 = (await (await fetch(`${base}/api/discoveries`, { headers: { Authorization: `Bearer ${redeemed.token}` } })).json()) as { discoveries: Array<{ character_id: string }> };
    assert.ok(dl2.discoveries.some((d) => d.character_id === L), "引き継ぎ後も legendary発見が保持");
    assert.ok(N.every((n) => dl2.discoveries.some((d) => d.character_id === n)), "引き継ぎ後も normal発見が保持");
  });
});
