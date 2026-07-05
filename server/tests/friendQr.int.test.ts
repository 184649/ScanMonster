import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { getPool, setPool } from "../src/db.ts";
import { applyAllMigrations } from "./pgmem.ts";

/**
 * 結合テスト（段2 §3〜§16）: フレンドQR発見（新規=未発見確定 / 既存=通常発見）。
 * 数値の補正倍率そのものは friendDaily.test.ts（純粋）で検証。ここは発見フロー・重複・人数計上を検証する。
 */
const hasRealDb = Boolean(process.env.DATABASE_URL);
const RUN = `fq_${Date.now()}`;
const W = `${RUN}_w`;
const c1 = `${RUN}_c1`;
const c2 = `${RUN}_c2`;
const c3 = `${RUN}_c3`;
const cP = `${RUN}_cP`; // prefecture（新規未発見確定の候補に入ってはいけない）
const cF = `${RUN}_cF`; // friend（旧ワールド専用・候補に入ってはいけない）

const NORMAL_SET = new Set([c1, c2, c3]);

const insertUser = async (id: string) => {
  await getPool().query("INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING", [id]);
};
const unlockWorld = async (userId: string) => {
  await getPool().query(
    "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order) VALUES ($1,$2,$3,1) ON CONFLICT (user_id, world_group) DO NOTHING",
    [`uw_${userId}`, userId, W]
  );
};
const markDiscovered = async (userId: string, charId: string) => {
  await getPool().query(
    `INSERT INTO character_records
       (id, user_id, character_id, first_discovered_at, last_discovered_at, discovery_count, best_difficulty_rank,
        titles, representative_score, first_discovery_id, latest_discovery_id, number_badges)
     VALUES ($1,$2,$3,NOW(),NOW(),1,'C','[]',0,'seed','seed','[]')
     ON CONFLICT (id) DO NOTHING`,
    [`crec_${userId}_${charId}`, userId, charId]
  );
};
const dailyCount = async (userId: string, localDate: string): Promise<number> => {
  const r = await getPool().query<{ n: string }>(
    "SELECT COUNT(*)::int AS n FROM friend_qr_reads WHERE reader_user_id = $1 AND local_date = $2",
    [userId, localDate]
  );
  return Number(r.rows[0]?.n ?? 0);
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
  await pool.query("INSERT INTO world_masters (world_group, realm_group, label, is_released) VALUES ($1,'life','W',TRUE) ON CONFLICT (world_group) DO NOTHING", [W]);
  for (const c of [c1, c2, c3]) {
    await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'normal',$2) ON CONFLICT (id) DO NOTHING", [c, W]);
  }
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group, prefecture_code) VALUES ($1,$1,'prefecture',$2,'13') ON CONFLICT (id) DO NOTHING", [cP, W]);
  await pool.query("INSERT INTO character_masters (id, name, rarity, world_group) VALUES ($1,$1,'friend',$2) ON CONFLICT (id) DO NOTHING", [cF, W]);
});

describe("フレンドQR発見（新規/既存）", () => {
  it("新規フレンド: 未発見キャラを必ず確定・公式番号(string)・発見証明・日次+1", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_A`;
    const owner = `${RUN}_oA`;
    await insertUser(reader);
    await insertUser(owner);
    await unlockWorld(reader);
    // c1,c2 は発見済み → 未発見は c3 のみ。
    await markDiscovered(reader, c1);
    await markDiscovered(reader, c2);

    const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: "2026-07-07" });
    assert.equal(res.status, "friend_found");
    if (res.status !== "friend_found") return;
    assert.equal(res.isNewFriend, true);
    assert.equal(res.discoveryRecord.characterId, c3); // 未発見確定
    assert.equal(typeof res.discoveryRecord.characterDiscoveryNo, "string");
    assert.ok(res.discoveryRecord.certificateId.startsWith("cert_")); // 発見証明
    assert.equal(await dailyCount(reader, "2026-07-07"), 1); // 日次+1
    assert.ok(!/secret|シークレット/.test(res.message)); // 禁止文言なし
  });

  it("同一相手・同日2回目は無効（duplicate・番号もDPも増えない）", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_A`;
    const owner = `${RUN}_oA`;
    const before = await dailyCount(reader, "2026-07-07");
    const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: "2026-07-07" });
    assert.equal(res.status, "duplicate");
    assert.equal(await dailyCount(reader, "2026-07-07"), before); // 増えない
  });

  it("翌日は同一相手を再び読める（既存フレンド・isNewFriend=false）", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_A`;
    const owner = `${RUN}_oA`;
    const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: "2026-07-08" });
    assert.equal(res.status, "friend_found");
    if (res.status !== "friend_found") return;
    assert.equal(res.isNewFriend, false); // 既存フレンド
    assert.ok(res.discoveryRecord.characterId); // キャラ1体
    assert.equal(await dailyCount(reader, "2026-07-08"), 1);
  });

  it("自分のQRは無効（self_qr）", async () => {
    const { scanFriendQr, FriendError } = await import("../src/friendService.ts");
    const reader = `${RUN}_A`;
    await assert.rejects(
      scanFriendQr({ readerUserId: reader, ownerUserId: reader, localDate: "2026-07-09" }),
      (e) => e instanceof FriendError && e.status === 400
    );
  });

  it("A→B と B→A は別方向として両方有効", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const a = `${RUN}_dirA`;
    const b = `${RUN}_dirB`;
    for (const u of [a, b]) {
      await insertUser(u);
      await unlockWorld(u);
    }
    const ab = await scanFriendQr({ readerUserId: a, ownerUserId: b, localDate: "2026-07-10" });
    const ba = await scanFriendQr({ readerUserId: b, ownerUserId: a, localDate: "2026-07-10" });
    assert.equal(ab.status, "friend_found");
    assert.equal(ba.status, "friend_found");
    assert.equal(await dailyCount(a, "2026-07-10"), 1);
    assert.equal(await dailyCount(b, "2026-07-10"), 1);
  });

  it("新規未発見確定候補に prefecture/friend は入らない（normal のみ）", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_excl`;
    await insertUser(reader);
    await unlockWorld(reader);
    // 毎日別の相手を新規フレンドとして読む。返るキャラは常に normal 集合内で、cP/cF は出ない。
    for (let i = 0; i < 8; i++) {
      const owner = `${RUN}_exo_${i}`;
      await insertUser(owner);
      const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: `2026-08-0${i + 1}` });
      assert.equal(res.status, "friend_found");
      if (res.status !== "friend_found") continue;
      assert.ok(NORMAL_SET.has(res.discoveryRecord.characterId), `got ${res.discoveryRecord.characterId}`);
      assert.notEqual(res.discoveryRecord.characterId, cP);
      assert.notEqual(res.discoveryRecord.characterId, cF);
    }
  });

  it("全対象キャラ発見済みでもエラーにならず通常発見にフォールバック", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_full`;
    const owner = `${RUN}_fullo`;
    await insertUser(reader);
    await insertUser(owner);
    await unlockWorld(reader);
    for (const c of [c1, c2, c3]) await markDiscovered(reader, c);
    const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: "2026-09-01" });
    assert.equal(res.status, "friend_found");
    if (res.status !== "friend_found") return;
    assert.ok(NORMAL_SET.has(res.discoveryRecord.characterId));
  });

  it("100人上限: 101人読んでも全員発見可能・日次カウントは101", async () => {
    const { scanFriendQr } = await import("../src/friendService.ts");
    const reader = `${RUN}_hundred`;
    await insertUser(reader);
    await unlockWorld(reader);
    const day = "2026-10-01";
    for (let i = 1; i <= 101; i++) {
      const owner = `${RUN}_ho_${i}`;
      await insertUser(owner);
      const res = await scanFriendQr({ readerUserId: reader, ownerUserId: owner, localDate: day });
      assert.equal(res.status, "friend_found"); // 101人目でも発見できる（補正は100で頭打ち）
    }
    assert.equal(await dailyCount(reader, day), 101);
  });

  it("getFriendEffect は数値でなくレベルと文言を返す（secret 非表示）", async () => {
    const { getFriendEffect } = await import("../src/friendService.ts");
    const eff = await getFriendEffect(`${RUN}_A`, "2026-07-08");
    assert.ok(eff.effectLevel >= 0 && eff.effectLevel <= 5);
    assert.ok(!/\d/.test(eff.message));
    assert.ok(!/secret|シークレット/.test(eff.message));
  });
});
