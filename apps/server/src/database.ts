import pg, { type PoolClient } from "pg";
import { readFile } from "node:fs/promises";
export class Database {
  readonly pool: pg.Pool;
  constructor(url: string) {
    this.pool = new pg.Pool({
      connectionString: url,
      max: 10,
      connectionTimeoutMillis: 5000,
      statement_timeout: 10000,
    });
  }
  async migrate(): Promise<void> {
    const sql = await readFile(
      new URL("../migrations/001_online.sql", import.meta.url),
      "utf8",
    );
    const community = await readFile(
      new URL("../migrations/002_community.sql", import.meta.url),
      "utf8",
    );
    const market = await readFile(
      new URL("../migrations/003_market.sql", import.meta.url),
      "utf8",
    );
    const premium = await readFile(
      new URL("../migrations/004_monetization.sql", import.meta.url),
      "utf8",
    );
    const economy = await readFile(new URL("../migrations/005_economy_rehearsal.sql", import.meta.url), "utf8");
    await this.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(41652001)");
      await c.query(sql);
      await c.query(community);
      await c.query(market);
      await c.query(premium);
      await c.query(economy);
    });
  }
  async transaction<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const value = await fn(c);
      await c.query("COMMIT");
      return value;
    } catch (error) {
      await c.query("ROLLBACK");
      throw error;
    } finally {
      c.release();
    }
  }
  async close(): Promise<void> {
    await this.pool.end();
  }
}
