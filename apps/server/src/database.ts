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
    const marketV2 = await readFile(new URL("../migrations/006_market_v2_rehearsal.sql", import.meta.url), "utf8");
    const bossV8 = await readFile(new URL("../migrations/007_boss_events_v8.sql", import.meta.url), "utf8");
    const authenticatedV13 = await readFile(new URL("../migrations/008_authenticated_v13.sql", import.meta.url), "utf8");
    const authenticatedMarketV14 = await readFile(new URL("../migrations/009_authenticated_market_v14.sql", import.meta.url), "utf8");
    const arenaV15 = await readFile(new URL("../migrations/010_authenticated_arena_v15.sql", import.meta.url), "utf8");
    const guildV16 = await readFile(new URL("../migrations/011_authenticated_guilds_v16.sql", import.meta.url), "utf8");
    const seasonsV17 = await readFile(new URL("../migrations/012_authenticated_seasons_v17.sql", import.meta.url), "utf8");
    const bossArchiveV18 = await readFile(new URL("../migrations/013_boss_archive_guild_v18.sql", import.meta.url), "utf8");
    const warsV19 = await readFile(new URL("../migrations/014_authenticated_guild_wars_v19.sql", import.meta.url), "utf8");
    await this.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(41652001)");
      await c.query(sql);
      await c.query(community);
      await c.query(market);
      await c.query(premium);
      await c.query(economy);
      await c.query(marketV2);
      await c.query(bossV8);
      await c.query(authenticatedV13);
      await c.query(authenticatedMarketV14);
      await c.query(arenaV15);
      await c.query(guildV16);
      await c.query(seasonsV17);
      await c.query(bossArchiveV18);
      await c.query(warsV19);
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
