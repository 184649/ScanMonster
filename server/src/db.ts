/**
 * PostgreSQL 接続プールと簡易クエリヘルパー。
 * 本番は DATABASE_URL の実 PostgreSQL。テストは pg-mem 等のプールを setPool で注入できる。
 */
import { Pool, type PoolClient } from "pg";

const connectionString = process.env.DATABASE_URL;

let injectedPool: Pool | undefined;

/** テスト用: プールを差し替える（pg-mem など）。 */
export const setPool = (pool: Pool): void => {
  injectedPool = pool;
};

let realPool: Pool | undefined;
export const getPool = (): Pool => {
  if (injectedPool) {
    return injectedPool;
  }
  if (!realPool) {
    if (!connectionString) {
      console.warn("[db] DATABASE_URL is not set. Set it in .env before running the server.");
    }
    realPool = new Pool({ connectionString });
  }
  return realPool;
};

export const query = <T = unknown>(text: string, params?: unknown[]) =>
  getPool().query<T & Record<string, unknown>>(text, params);

/** 1トランザクションで fn を実行する（例外時は自動 ROLLBACK）。 */
export const withTransaction = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
