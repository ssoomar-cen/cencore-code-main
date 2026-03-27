import { Pool, PoolClient } from "pg";

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = {
  async query<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
    const client = await pool.connect();
    try {
      const res = await client.query(sql, params as any[]);
      return res.rows as T[];
    } finally {
      client.release();
    }
  },
  async execute(sql: string, params: unknown[] = []): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(sql, params as any[]);
    } finally {
      client.release();
    }
  },
  async transact<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  },
};
