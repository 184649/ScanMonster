/**
 * WORLDAWN API ルート。ユーザー識別は Authorization: Bearer <token>（x-user-id は廃止）。
 * 発見番号は BIGINT だが pg は string で返す → そのまま返す（Number 化しない）。
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";

import { query, withTransaction } from "./db.ts";
import { processScan } from "./scanService.ts";
import { WORLD_BOOST, WORLD_UNLOCK_COSTS } from "./domain.ts";
import {
  AuthError,
  createAnonymousAccount,
  createTransferCode,
  loginAccount,
  redeemTransferCode,
  registerAccount,
  resolveUserIdFromToken
} from "./authService.ts";
import { createFeatureRequest, FeatureError, listFeatureRequests, toggleReaction } from "./featureService.ts";
import { FriendError, getFriendEffect, scanFriendQr } from "./friendService.ts";
import { FRIEND_QR_TTL_SECONDS, issueFriendQrToken, verifyFriendQrToken } from "./friendQrToken.ts";
import { perIp, perUser } from "./rateLimit.ts";

const MIN = 60_000;
const HOUR = 60 * MIN;

export const router = Router();

/**
 * Bearer トークンから本人を確定する。クライアントが送る userId は本人性の根拠にしない（x-user-id 廃止）。
 * Authorization: Bearer <token> が無い/無効なら 401。
 */
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const header = (req.header("authorization") || "").trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const userId = await resolveUserIdFromToken(match?.[1]);
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as Request & { userId: string }).userId = userId;
  next();
};

const uid = (req: Request): string => (req as Request & { userId: string }).userId;

router.get("/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok", ok: true });
  } catch {
    res.status(503).json({ status: "db_unavailable", ok: false });
  }
});

// POST /api/scan — 発見処理（トランザクション）。ユーザー単位で連打を抑制（番号farming対策）。
router.post("/scan", requireAuth, perUser("SCAN", 60, MIN), async (req, res) => {
  const { sourceHash, scanType, localDate, prefectureCode, prefectureName } = req.body ?? {};
  if (typeof sourceHash !== "string" || typeof localDate !== "string") {
    res.status(400).json({ error: "sourceHash and localDate are required." });
    return;
  }
  try {
    const result = await processScan({
      userId: uid(req),
      sourceHash,
      scanType: scanType === "qr" || scanType === "player_qr" ? scanType : "barcode",
      localDate,
      prefectureCode: typeof prefectureCode === "string" ? prefectureCode : undefined,
      prefectureName: typeof prefectureName === "string" ? prefectureName : undefined
    });
    res.json(result);
  } catch (error) {
    console.error("[scan] failed", error);
    res.status(500).json({ error: "scan_failed" });
  }
});

// GET /api/dex — 図鑑（段3 §4/§23）。
//  - normal/rare: 未発見でも表示（シルエット）。
//  - legendary: そのワールドを解放済みのユーザーにだけ表示（未解放者には件数も返さない）。
//  - secret: 発見済みのユーザーにだけ表示（未発見では存在・件数を一切返さない）。
//  - prefecture/variant/limited/friend: 初期リリースでは発見済みのみ表示。
router.get("/dex", requireAuth, async (req, res) => {
  const rows = await query(
    `SELECT m.id, m.name, m.rarity, m.world_group, m.image_url,
            (cr.character_id IS NOT NULL) AS discovered, cr.discovery_count, cr.best_difficulty_rank
       FROM character_masters m
       LEFT JOIN character_records cr ON cr.character_id = m.id AND cr.user_id = $1
       LEFT JOIN user_world_legendary uwl ON uwl.user_id = $1 AND uwl.world_group = m.world_group
      WHERE m.is_available_for_scan = TRUE
        AND (
          cr.character_id IS NOT NULL                       -- 発見済みは常に表示
          OR m.rarity IN ('normal','rare')                  -- 基本キャラは未発見でも表示
          OR (m.rarity = 'legendary' AND uwl.user_id IS NOT NULL) -- 伝説は解放後のみ
        )
      ORDER BY m.world_group, m.id`,
    [uid(req)]
  );
  res.json({ characters: rows.rows });
});

// GET /api/characters/:characterId — 詳細＋記録＋全発見証明。
router.get("/characters/:characterId", requireAuth, async (req, res) => {
  const characterId = req.params.characterId;
  const master = await query("SELECT * FROM character_masters WHERE id = $1", [characterId]);
  if ((master.rowCount ?? 0) === 0) {
    res.status(404).json({ error: "character_not_found" });
    return;
  }
  const record = await query("SELECT * FROM character_records WHERE user_id = $1 AND character_id = $2", [
    uid(req),
    characterId
  ]);
  const certificates = await query(
    "SELECT * FROM discovery_records WHERE user_id = $1 AND character_id = $2 ORDER BY discovered_at DESC",
    [uid(req), characterId]
  );
  const representativeId = record.rows[0]?.representative_discovery_id;
  res.json({
    master: master.rows[0],
    record: record.rows[0] ?? null,
    representative: certificates.rows.find((c) => c.id === representativeId) ?? certificates.rows[0] ?? null,
    certificates: certificates.rows
  });
});

// GET /api/dp — 現在のDP残高（引き継ぎ後の新端末が取り戻すため）。
router.get("/dp", requireAuth, async (req, res) => {
  const r = await query<{ balance: number }>("SELECT balance FROM user_dp WHERE user_id = $1", [uid(req)]);
  res.json({ balance: Number(r.rows[0]?.balance ?? 0) });
});

// GET /api/world-unlocks — 解放済みワールド一覧（引き継ぎ後の新端末が取り戻すため）。
router.get("/world-unlocks", requireAuth, async (req, res) => {
  const r = await query(
    "SELECT world_group, unlock_order, cost_dp FROM user_world_unlocks WHERE user_id = $1 ORDER BY unlock_order",
    [uid(req)]
  );
  res.json({ worlds: r.rows });
});

// GET /api/discoveries — 発見ログ（新しい順）。
router.get("/discoveries", requireAuth, async (req, res) => {
  const rows = await query(
    "SELECT * FROM discovery_records WHERE user_id = $1 ORDER BY discovered_at DESC LIMIT 500",
    [uid(req)]
  );
  res.json({ discoveries: rows.rows });
});

// GET /api/discovery-calendar — 日別集計（一番発見・特別フラグ）。
router.get("/discovery-calendar", requireAuth, async (req, res) => {
  const rows = await query(
    `SELECT local_date,
            COUNT(*)::int AS count,
            bool_or(rarity = 'rare') AS has_rare,
            bool_or(strongest_proof) AS has_strongest_proof,
            bool_or(primary_number_badge IS NOT NULL) AS has_number_value
       FROM discovery_records WHERE user_id = $1
       GROUP BY local_date ORDER BY local_date DESC`,
    [uid(req)]
  );
  res.json({ days: rows.rows });
});

// POST /api/worlds/:worldGroup/unlock — ワールド解放（DP消費・トランザクション）。
router.post("/worlds/:worldGroup/unlock", requireAuth, async (req, res) => {
  const world = req.params.worldGroup;
  try {
    const result = await withTransaction(async (client) => {
      const owned = await client.query("SELECT COUNT(*)::int AS n FROM user_world_unlocks WHERE user_id = $1", [uid(req)]);
      const count = owned.rows[0]?.n ?? 0;
      const cost = WORLD_UNLOCK_COSTS[count];
      if (cost === undefined) return { ok: false, message: "これ以上解放できません。" };
      const dupe = await client.query("SELECT 1 FROM user_world_unlocks WHERE user_id = $1 AND world_group = $2", [uid(req), world]);
      if ((dupe.rowCount ?? 0) > 0) return { ok: true, message: "解放済みです。" };
      if (cost > 0) {
        const bal = await client.query<{ balance: number }>("SELECT balance FROM user_dp WHERE user_id = $1", [uid(req)]);
        const balance = bal.rows[0]?.balance ?? 0;
        if (balance < cost) return { ok: false, message: `DPが足りません（必要 ${cost}）。` };
        await client.query("UPDATE user_dp SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1", [uid(req), cost]);
        await client.query("INSERT INTO dp_transactions (id, user_id, amount, reason) VALUES ($1,$2,$3,$4)", [
          `dpt_${randomUUID()}`, uid(req), -cost, `unlock:${world}`
        ]);
      }
      await client.query(
        "INSERT INTO user_world_unlocks (id, user_id, world_group, unlock_order, cost_dp) VALUES ($1,$2,$3,$4,$5)",
        [`uw_${randomUUID()}`, uid(req), world, count + 1, cost]
      );
      return { ok: true, message: `${world} を解放しました。` };
    });
    res.json(result);
  } catch (error) {
    console.error("[unlock] failed", error);
    res.status(500).json({ error: "unlock_failed" });
  }
});

// POST /api/worlds/:worldGroup/boost — ワールドブースト（300DP・次の10有効スキャン）。
router.post("/worlds/:worldGroup/boost", requireAuth, async (req, res) => {
  const world = req.params.worldGroup;
  try {
    const result = await withTransaction(async (client) => {
      const active = await client.query("SELECT 1 FROM user_boosts WHERE user_id = $1 AND is_active = TRUE", [uid(req)]);
      if ((active.rowCount ?? 0) > 0) return { ok: false, message: "すでにブースト中です。" };
      const owned = await client.query("SELECT COUNT(*)::int AS n FROM user_world_unlocks WHERE user_id = $1", [uid(req)]);
      if ((owned.rows[0]?.n ?? 0) <= 1) return { ok: false, message: "2ワールド以上解放後に使用できます。" };
      const bal = await client.query<{ balance: number }>("SELECT balance FROM user_dp WHERE user_id = $1", [uid(req)]);
      if ((bal.rows[0]?.balance ?? 0) < WORLD_BOOST.cost) return { ok: false, message: "DPが足りません。" };
      await client.query("UPDATE user_dp SET balance = balance - $2, updated_at = NOW() WHERE user_id = $1", [uid(req), WORLD_BOOST.cost]);
      await client.query("INSERT INTO user_boosts (id, user_id, target_world_group, remaining_valid_scans) VALUES ($1,$2,$3,$4)", [
        `boost_${randomUUID()}`, uid(req), world, WORLD_BOOST.validScans
      ]);
      return { ok: true, message: `${world} のブーストを開始しました。` };
    });
    res.json(result);
  } catch (error) {
    console.error("[boost] failed", error);
    res.status(500).json({ error: "boost_failed" });
  }
});

// POST /api/masters/characters — マスタ登録/更新（開発/運用用）。IP単位で監視。※認証強化は今後の課題。
router.post("/masters/characters", perIp("MASTERS", 30, MIN), async (req, res) => {
  const b = req.body ?? {};
  if (typeof b.id !== "string" || typeof b.name !== "string" || typeof b.worldGroup !== "string") {
    res.status(400).json({ error: "id, name, worldGroup are required." });
    return;
  }
  const rarity = ["normal", "rare", "secret", "friend"].includes(b.rarity) ? b.rarity : "normal";
  const availableDefault = rarity === "secret" || rarity === "friend" ? false : true;
  await query(
    `INSERT INTO character_masters
       (id, name, rarity, world_group, image_url, description, motif_name, real_world_profile, is_visible_in_dex, is_available_for_scan, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name, rarity = EXCLUDED.rarity, world_group = EXCLUDED.world_group,
       image_url = EXCLUDED.image_url, description = EXCLUDED.description, motif_name = EXCLUDED.motif_name,
       real_world_profile = EXCLUDED.real_world_profile, is_visible_in_dex = EXCLUDED.is_visible_in_dex,
       is_available_for_scan = EXCLUDED.is_available_for_scan, updated_at = NOW()`,
    [
      b.id, b.name, rarity, b.worldGroup, b.imageUrl ?? null, b.description ?? null, b.motifName ?? null,
      b.realWorldProfile ? JSON.stringify(b.realWorldProfile) : null,
      b.isVisibleInDex ?? true,
      b.isAvailableForScan ?? availableDefault
    ]
  );
  res.json({ ok: true });
});

// ===== 認証・アカウント連携・引継ぎ（§ログイン/連携/引継ぎ） =====

// POST /api/auth/anon — 匿名アカウント作成（初回起動）。IP単位で大量作成を抑制（NAT配下の対面イベントは許容する緩め設定）。
router.post("/auth/anon", perIp("ANON", 120, 10 * MIN), async (_req, res) => {
  try {
    res.json(await createAnonymousAccount());
  } catch (error) {
    console.error("[auth.anon] failed", error);
    res.status(500).json({ error: "anon_failed" });
  }
});

// POST /api/auth/register — 現在の匿名ユーザー(Bearer)にアカウント(メール/パスワード)を紐づける。
router.post("/auth/register", requireAuth, async (req, res) => {
  const { email, password, displayName } = req.body ?? {};
  try {
    const result = await registerAccount({ email, password, userId: uid(req), displayName });
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[register] failed", error);
    res.status(500).json({ error: "register_failed" });
  }
});

// POST /api/auth/login — ログイン → 引継ぎ先 userId を返す。
router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body ?? {};
  try {
    const result = await loginAccount({ email, password });
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[login] failed", error);
    res.status(500).json({ error: "login_failed" });
  }
});

// POST /api/transfer/create — 引継ぎコード発行（現在の user_id）。乱発防止。
router.post("/transfer/create", requireAuth, perUser("TRANSFER_CREATE", 5, HOUR), async (req, res) => {
  try {
    res.json(await createTransferCode(uid(req)));
  } catch (error) {
    console.error("[transfer.create] failed", error);
    res.status(500).json({ error: "transfer_create_failed" });
  }
});

// POST /api/transfer/redeem — 引継ぎコードで user_id を取り戻す。IP単位で総当たり抑制。
router.post("/transfer/redeem", perIp("TRANSFER_REDEEM", 10, HOUR), async (req, res) => {
  const { code } = req.body ?? {};
  if (typeof code !== "string") {
    res.status(400).json({ error: "code is required." });
    return;
  }
  try {
    res.json(await redeemTransferCode(code));
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[transfer.redeem] failed", error);
    res.status(500).json({ error: "transfer_redeem_failed" });
  }
});

// ===== 要望掲示板 =====

// GET /api/feature-requests?sort=top|new — 一覧（掲示板）。
router.get("/feature-requests", requireAuth, async (req, res) => {
  const sort = req.query.sort === "top" ? "top" : "new";
  res.json({ requests: await listFeatureRequests({ userId: uid(req), sort }) });
});

// POST /api/feature-requests — 投稿。
router.post("/feature-requests", requireAuth, async (req, res) => {
  const { title, body } = req.body ?? {};
  try {
    res.json(await createFeatureRequest({ userId: uid(req), title, body }));
  } catch (error) {
    if (error instanceof FeatureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[feature.create] failed", error);
    res.status(500).json({ error: "feature_create_failed" });
  }
});

// ===== フレンドQR・フレンド効果 =====

// POST /api/friend-qr/token — 自分（owner）用の短期QRトークンを発行（Bearer→owner）。約60秒有効。
router.post("/friend-qr/token", requireAuth, perUser("FRIEND_TOKEN", 30, MIN), async (req, res) => {
  res.json({ token: issueFriendQrToken(uid(req)), expiresInSeconds: FRIEND_QR_TTL_SECONDS });
});

// POST /api/friend-qr/scan — 読み取った動的QRトークンで発見（Phase 2）。
//  reader は Bearer から確定。owner は署名付きトークンから解決（クライアントの userId は信用しない）。
router.post("/friend-qr/scan", requireAuth, perUser("FRIEND_SCAN", 60, MIN), async (req, res) => {
  const { token, localDate } = req.body ?? {};
  if (typeof token !== "string" || typeof localDate !== "string") {
    res.status(400).json({ error: "token and localDate are required." });
    return;
  }
  const verified = verifyFriendQrToken(token);
  if (!verified.ok) {
    // 改ざん/期限切れ/不正形式。どれも無効として弾く（詳細理由は internal のみ）。
    res.status(400).json({ error: `qr_${verified.reason}` });
    return;
  }
  try {
    res.json(await scanFriendQr({ readerUserId: uid(req), ownerUserId: verified.ownerUserId, localDate }));
  } catch (error) {
    if (error instanceof FriendError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[friend-qr] failed", error);
    res.status(500).json({ error: "friend_qr_failed" });
  }
});

// GET /api/friend-effect?localDate=YYYY-MM-DD — フレンド効果（レベル＋文言のみ・数値なし）。
// localDate はその日の有効フレンド人数からレベルを算出するために使う（無ければサーバー日付）。
router.get("/friend-effect", requireAuth, async (req, res) => {
  const localDate = typeof req.query.localDate === "string" ? req.query.localDate : new Date().toISOString().slice(0, 10);
  res.json(await getFriendEffect(uid(req), localDate));
});

// POST /api/feature-requests/:id/react — リアクション（トグル）。
router.post("/feature-requests/:id/react", requireAuth, async (req, res) => {
  const type = typeof req.body?.type === "string" ? req.body.type : "like";
  try {
    res.json(await toggleReaction({ requestId: String(req.params.id), userId: uid(req), type }));
  } catch (error) {
    if (error instanceof FeatureError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    console.error("[feature.react] failed", error);
    res.status(500).json({ error: "feature_react_failed" });
  }
});
