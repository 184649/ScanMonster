/**
 * 要望・機能改善の掲示板。投稿・一覧（人気/新着）・リアクション（トグル）。
 */
import { randomUUID } from "node:crypto";

import { getPool } from "./db.ts";

export class FeatureError extends Error {
  status: number;
  constructor(code: string) {
    super(code);
    this.name = "FeatureError";
    this.status = code === "not_found" ? 404 : 400;
  }
}

export type FeatureRequestDTO = {
  id: string;
  title: string;
  body: string;
  status: string;
  createdAt: string;
  reactionCount: number;
  reactedByMe: boolean;
  mine: boolean;
};

export const createFeatureRequest = async (params: {
  userId: string;
  title: string;
  body?: string;
}): Promise<{ id: string }> => {
  const title = (params.title ?? "").trim();
  if (title.length < 3) throw new FeatureError("title_too_short");
  const id = `fr_${randomUUID()}`;
  await getPool().query("INSERT INTO feature_requests (id, user_id, title, body) VALUES ($1,$2,$3,$4)", [
    id,
    params.userId,
    title.slice(0, 120),
    (params.body ?? "").slice(0, 2000)
  ]);
  return { id };
};

export const listFeatureRequests = async (params: {
  userId: string;
  sort?: "top" | "new";
}): Promise<FeatureRequestDTO[]> => {
  const pool = getPool();
  const reqs = await pool.query<{
    id: string;
    user_id: string;
    title: string;
    body: string;
    status: string;
    created_at: string;
  }>("SELECT id, user_id, title, body, status, created_at FROM feature_requests");
  const counts = await pool.query<{ request_id: string; n: number }>(
    "SELECT request_id, COUNT(*)::int AS n FROM feature_request_reactions GROUP BY request_id"
  );
  const mine = await pool.query<{ request_id: string }>(
    "SELECT request_id FROM feature_request_reactions WHERE user_id = $1",
    [params.userId]
  );
  const countMap = new Map(counts.rows.map((r) => [r.request_id, Number(r.n)]));
  const mySet = new Set(mine.rows.map((r) => r.request_id));

  const list: FeatureRequestDTO[] = reqs.rows.map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
    reactionCount: countMap.get(r.id) ?? 0,
    reactedByMe: mySet.has(r.id),
    mine: r.user_id === params.userId
  }));

  const byNew = (a: FeatureRequestDTO, b: FeatureRequestDTO) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);
  list.sort(params.sort === "top" ? (a, b) => b.reactionCount - a.reactionCount || byNew(a, b) : byNew);
  return list;
};

/** リアクションをトグルする。付与→true/解除→false と最新カウントを返す。 */
export const toggleReaction = async (params: {
  requestId: string;
  userId: string;
  type?: string;
}): Promise<{ reacted: boolean; count: number }> => {
  const pool = getPool();
  const type = params.type ?? "like";
  const exists = await pool.query("SELECT 1 FROM feature_requests WHERE id = $1", [params.requestId]);
  if ((exists.rowCount ?? 0) === 0) throw new FeatureError("not_found");

  const already = await pool.query("SELECT 1 FROM feature_request_reactions WHERE request_id=$1 AND user_id=$2 AND type=$3", [
    params.requestId,
    params.userId,
    type
  ]);
  const had = (already.rowCount ?? 0) > 0;
  if (had) {
    await pool.query("DELETE FROM feature_request_reactions WHERE request_id=$1 AND user_id=$2 AND type=$3", [
      params.requestId,
      params.userId,
      type
    ]);
  } else {
    await pool.query("INSERT INTO feature_request_reactions (id, request_id, user_id, type) VALUES ($1,$2,$3,$4)", [
      `rx_${randomUUID()}`,
      params.requestId,
      params.userId,
      type
    ]);
  }
  const count = await pool.query<{ n: number }>(
    "SELECT COUNT(*)::int AS n FROM feature_request_reactions WHERE request_id = $1",
    [params.requestId]
  );
  return { reacted: !had, count: Number(count.rows[0]?.n ?? 0) };
};
