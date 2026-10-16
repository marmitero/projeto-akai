import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Database } from "./database.js";
import { OnlineService } from "./online.js";
import { PremiumService } from "./premium.js";
import { SandboxProvider, decryptToken } from "./premium-providers.js";
import { parseServerConfig } from "./config.js";
import { createLocalSnapshot } from "../../client/src/local/session.js";
import { reconcileLedger } from "./audit.js";
import { competitiveStats } from "./community-domain.js";
import { buildServer } from "./app.js";
import {
  advanceCombat,
  type PremiumCommand,
  type LocalSnapshot,
  type PremiumProduct,
  type RewardedType,
} from "@akai/shared";
const url = process.env.TEST_DATABASE_URL,
  key = "ab".repeat(32),
  config = parseServerConfig({
    NODE_ENV: "test",
    MONETIZATION_MODE: "sandbox",
    MONETIZATION_TEST_DATABASE: "true",
    MONETIZATION_KEY: key,
  });
describe.skipIf(!url)("premium PostgreSQL isolated sandbox", () => {
  const base = new Database(url!),
    schema = "f8_" + randomUUID().replaceAll("-", "");
  let db: Database,
    online: OnlineService,
    premium: PremiumService,
    provider: SandboxProvider,
    now = 1800000000000;
  beforeAll(async () => {
    await base.pool.query("CREATE SCHEMA " + schema);
    const u = new URL(url!);
    u.searchParams.set("options", "-csearch_path=" + schema);
    db = new Database(u.toString());
    await db.migrate();
    online = new OnlineService(db, () => now);
    provider = new SandboxProvider(db, key, () => now);
    premium = new PremiumService(online, config, provider);
    await premium.guard();
  });
  beforeEach(async () => {
    await db.pool.query(
      "TRUNCATE akai_accounts,akai_premium_audit,akai_auth_limits CASCADE",
    );
    now = 1800000000000;
  });
  afterAll(async () => {
    await db?.close();
    await base.pool.query("DROP SCHEMA " + schema + " CASCADE");
    await base.close();
  });
  const cmd = (
    token: string,
    action: Omit<PremiumCommand, "commandId">,
    commandId = randomUUID(),
  ) => premium.command(token, { ...action, commandId });
  async function user() {
    const u = await online.guest(),
      s = createLocalSnapshot(now);
    s.battle.paused = true;
    s.battle.highest = 10;
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      u.accountId,
      s,
    ]);
    return u;
  }
  async function snapshot(id: string): Promise<LocalSnapshot> {
    return (
      await db.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [
        id,
      ])
    ).rows[0].snapshot;
  }
  async function intent(
    u: Awaited<ReturnType<typeof user>>,
    productId: PremiumProduct = "ruby_handful",
  ) {
    const r = await cmd(u.token, { type: "purchase.intent", productId } as Omit<
      PremiumCommand,
      "commandId"
    >);
    expect(r.code).toBe("OK");
    return r.intentId!;
  }
  async function receipt(
    u: Awaited<ReturnType<typeof user>>,
    productId: PremiumProduct = "ruby_handful",
  ) {
    const id = await intent(u, productId);
    const token = (
      (await premium.simulate(u.token, id)) as { purchaseToken: string }
    ).purchaseToken;
    return { id, token };
  }
  const verify = (
    u: Awaited<ReturnType<typeof user>>,
    r: { id: string; token: string },
    commandId = randomUUID(),
  ) =>
    cmd(
      u.token,
      {
        type: "purchase.verify",
        intentId: r.id,
        purchaseToken: r.token,
      } as Omit<PremiumCommand, "commandId">,
      commandId,
    );
  async function ad(u: Awaited<ReturnType<typeof user>>, reward: RewardedType) {
    const r = await cmd(u.token, { type: "ad.intent", reward } as Omit<
      PremiumCommand,
      "commandId"
    >);
    expect(r.code).toBe("OK");
    now += 5000;
    await premium.simulate(u.token, r.intentId!);
    return r.intentId!;
  }
  it("migration preserves old account/session/snapshot and re-runs without rewriting grants", async () => {
    const u = await user(),
      s = await snapshot(u.accountId);
    await db.migrate();
    expect(await snapshot(u.accountId)).toEqual(s);
    expect((await premium.read(u.token)).rubyBalance).toBe("0");
  });
  it("replays concurrent paid receipt verification exactly once and keeps raw token encrypted", async () => {
    const u = await user(),
      r = await receipt(u),
      id = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 20 }, () => verify(u, r, id)),
    );
    expect(results.every((r) => r.code === "OK")).toBe(true);
    await Promise.all(Array.from({ length: 5 }, () => verify(u, r)));
    expect((await snapshot(u.accountId)).balances.ruby).toBe("100000");
    expect(
      (await db.pool.query("SELECT * FROM akai_premium_grants")).rowCount,
    ).toBe(1);
    const row = (await db.pool.query("SELECT * FROM akai_purchases")).rows[0];
    expect(row.token_cipher).not.toContain(r.token);
    expect(
      (await db.pool.query("SELECT token_cipher FROM akai_sandbox_receipts"))
        .rows[0].token_cipher,
    ).not.toContain(r.token);
    expect(decryptToken(row.token_cipher, key)).toBe(r.token);
    expect(await reconcileLedger(db)).toEqual([]);
    await expect(
      db.pool.query("UPDATE akai_premium_grants SET amount=0"),
    ).rejects.toThrow();
    await expect(
      db.pool.query("UPDATE akai_premium_audit SET actor='changed'"),
    ).rejects.toThrow();
  });
  it("rejects forged, wrong-account and wrong-product proofs without a grant", async () => {
    const u = await user(),
      v = await user(),
      r = await receipt(u),
      other = await intent(v, "ruby_bag");
    await expect(
      verify(u, { ...r, token: r.token.slice(0, -5) + "xxxxx" }),
    ).rejects.toThrow("INVALID_PURCHASE_PROOF");
    expect((await verify(v, { id: other, token: r.token })).code).toBe(
      "RECEIPT_BINDING_MISMATCH",
    );
    expect((await snapshot(v.accountId)).balances.ruby).toBe("0");
  });
  it("pending payment grants nothing, then settles once after provider confirmation and restart", async () => {
    const u = await user(),
      r = await receipt(u),
      ref = (await provider.verify(r.token)).reference;
    await provider.setState(
      ref,
      "PENDING",
      "operator",
      "Fixture pending state",
    );
    expect((await verify(u, r)).code).toBe("OK");
    expect((await snapshot(u.accountId)).balances.ruby).toBe("0");
    expect((await premium.read(u.token)).purchases[0]!.state).toBe("pending");
    await provider.setState(
      ref,
      "PURCHASED",
      "operator",
      "Fixture confirmed state",
    );
    const restarted = new PremiumService(online, config, provider);
    await restarted.tick();
    await restarted.tick();
    expect((await snapshot(u.accountId)).balances.ruby).toBe("100000");
    expect((await premium.read(u.token)).purchases[0]!.delivery).toBe("done");
  });
  it("cancelled payment grants nothing and cannot later be resurrected", async () => {
    const u = await user(),
      r = await receipt(u),
      ref = (await provider.verify(r.token)).reference;
    await provider.setState(
      ref,
      "CANCELLED",
      "operator",
      "Fixture cancellation",
    );
    await verify(u, r);
    await provider.setState(
      ref,
      "PURCHASED",
      "operator",
      "Unexpected late state",
    );
    expect((await verify(u, r)).code).toBe("PURCHASE_CANCELLED");
    expect((await snapshot(u.accountId)).balances.ruby).toBe("0");
  });
  it("restores simulator proof lost before submission, and restore never duplicates Ruby", async () => {
    const u = await user();
    await receipt(u, "ruby_bag");
    await cmd(u.token, { type: "restore" });
    await cmd(u.token, { type: "restore" });
    expect((await snapshot(u.accountId)).balances.ruby).toBe("550000");
    expect((await premium.read(u.token)).purchases[0]!.delivery).toBe("done");
  });
  it("retries acknowledgement failure without a second grant", async () => {
    const u = await user(),
      r = await receipt(u);
    await verify(u, r);
    const actual = provider.finalize.bind(provider);
    provider.finalize = async () => {
      throw Error("provider finalize unavailable");
    };
    try {
      expect((await premium.tick()).failed).toBe(1);
      expect((await snapshot(u.accountId)).balances.ruby).toBe("100000");
    } finally {
      provider.finalize = actual;
    }
    now += 5000;
    await premium.tick();
    expect((await premium.read(u.token)).purchases[0]!.delivery).toBe("done");
    expect(
      (await db.pool.query("SELECT * FROM akai_premium_grants")).rowCount,
    ).toBe(1);
  });
  it("refund reverses available Rubies once and records debt if spent; later grants settle debt first", async () => {
    const u = await user(),
      r = await receipt(u);
    await verify(u, r);
    const a = await online.db.transaction((c) =>
      online.lockAccount(c, u.accountId),
    );
    const before = structuredClone(a.snapshot);
    a.snapshot.balances.ruby = "10000";
    await db.transaction((c) => online.save(c, a, before, "fixture-spend"));
    await provider.setState(
      (await provider.verify(r.token)).reference,
      "CANCELLED",
      "operator",
      "Fixture refund test",
    );
    await premium.tick();
    await premium.tick();
    expect((await premium.read(u.token)).rubyDebt).toBe("90000");
    expect((await snapshot(u.accountId)).balances.ruby).toBe("0");
    const next = await receipt(u);
    await verify(u, next);
    expect((await snapshot(u.accountId)).balances.ruby).toBe("10000");
    expect((await premium.read(u.token)).rubyDebt).toBe("0");
    expect(await reconcileLedger(db)).toEqual([]);
  });
  it("cosmetic entitlement restores without stats and revokes by source", async () => {
    const u = await user(),
      before = competitiveStats(await snapshot(u.accountId)),
      r = await receipt(u, "title_miner");
    await verify(u, r);
    await cmd(u.token, { type: "restore" });
    expect((await premium.read(u.token)).entitlements).toEqual(["title_miner"]);
    expect(competitiveStats(await snapshot(u.accountId))).toEqual(before);
    await provider.setState(
      (await provider.verify(r.token)).reference,
      "CANCELLED",
      "operator",
      "Refund cosmetic test",
    );
    await premium.tick();
    expect((await premium.read(u.token)).entitlements).toEqual([]);
  });
  it("provider timeout has no grant and leaves receipt retryable", async () => {
    const u = await user(),
      r = await receipt(u),
      actual = provider.verify.bind(provider);
    provider.verify = async () => {
      throw Error("provider offline");
    };
    try {
      await expect(verify(u, r)).rejects.toThrow("provider offline");
      expect((await snapshot(u.accountId)).balances.ruby).toBe("0");
    } finally {
      provider.verify = actual;
    }
    expect((await verify(u, r)).code).toBe("OK");
  });
  it("outbox failure rolls back receipt/grant/ledger/snapshot; same command can recover", async () => {
    const u = await user(),
      r = await receipt(u),
      id = randomUUID(),
      before = await snapshot(u.accountId);
    await db.pool.query(
      "CREATE FUNCTION f8_outbox_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload->>'reason' LIKE 'premium:grant:%' THEN RAISE EXCEPTION 'premium-outbox-fixture'; END IF; RETURN NEW; END $$; CREATE TRIGGER f8_outbox_fail BEFORE INSERT ON akai_events FOR EACH ROW EXECUTE FUNCTION f8_outbox_fail()",
    );
    try {
      await expect(verify(u, r, id)).rejects.toThrow("premium-outbox-fixture");
      expect(await snapshot(u.accountId)).toEqual(before);
      expect(
        (await db.pool.query("SELECT * FROM akai_purchases")).rowCount,
      ).toBe(0);
      expect(
        (await db.pool.query("SELECT * FROM akai_premium_grants")).rowCount,
      ).toBe(0);
    } finally {
      await db.pool.query(
        "DROP TRIGGER f8_outbox_fail ON akai_events; DROP FUNCTION f8_outbox_fail()",
      );
    }
    expect((await verify(u, r, id)).code).toBe("OK");
  });
  it("voluntary ad requires elapsed sandbox time, valid bound intent, cooldown and daily rolling cap", async () => {
    const u = await user(),
      r = await cmd(u.token, { type: "ad.intent", reward: "coins" } as Omit<
        PremiumCommand,
        "commandId"
      >);
    await expect(premium.simulate(u.token, r.intentId!)).rejects.toThrow(
      "SANDBOX_AD_NOT_FINISHED",
    );
    expect(
      (
        await cmd(u.token, { type: "ad.intent", reward: "coins" } as Omit<
          PremiumCommand,
          "commandId"
        >)
      ).code,
    ).toBe("AD_COOLDOWN");
    now += 5000;
    await premium.simulate(u.token, r.intentId!);
    await premium.simulate(u.token, r.intentId!);
    expect((await snapshot(u.accountId)).balances.coin).toBe("1200000");
    for (let i = 1; i < 8; i++) {
      now += 300000;
      await ad(u, "coins");
    }
    now += 300000;
    expect(
      (
        await cmd(u.token, { type: "ad.intent", reward: "coins" } as Omit<
          PremiumCommand,
          "commandId"
        >)
      ).code,
    ).toBe("AD_DAILY_LIMIT");
    now += 86400000;
    expect(
      (
        await cmd(u.token, { type: "ad.intent", reward: "coins" } as Omit<
          PremiumCommand,
          "commandId"
        >)
      ).code,
    ).toBe("OK");
  });
  it("ad expires and client cannot claim another account or cancel to evade caps", async () => {
    const u = await user(),
      v = await user(),
      r = await cmd(u.token, { type: "ad.intent", reward: "autoclick" } as Omit<
        PremiumCommand,
        "commandId"
      >);
    await expect(premium.simulate(v.token, r.intentId!)).rejects.toThrow(
      "INTENT_NOT_FOUND",
    );
    now += 600000;
    await expect(premium.simulate(u.token, r.intentId!)).rejects.toThrow(
      "INTENT_EXPIRED",
    );
    expect((await premium.read(u.token)).benefits).toHaveLength(0);
  });
  it("autoclick integrates exactly 3/sec only within presence and duration, without cadence rounding", async () => {
    const u = await user();
    await ad(u, "autoclick");
    const start = now;
    await online.state(u.token);
    for (let t = 1; t <= 10; t++) {
      now = start + t * 100;
      await online.state(u.token);
    }
    expect((await snapshot(u.accountId)).balances.iron).toBe("3000");
    now = start + 120000;
    await online.state(u.token);
    const iron = (await snapshot(u.accountId)).balances.iron;
    now += 1000;
    await online.state(u.token);
    expect((await snapshot(u.accountId)).balances.iron).toBe(iron);
    expect((await premium.read(u.token)).benefits).toHaveLength(0);
  });
  it("damage and reward boost end at exact wall boundary, and do not alter competitive stats", async () => {
    const u = await user(),
      s = await snapshot(u.accountId),
      beforeStats = competitiveStats(s);
    s.battle.paused = false;
    s.upgrades.attack = 100;
    s.battle.floor = 1;
    s.battle.enemies.forEach((e) => {
      e.hp = 1;
      e.maxHp = 1;
    });
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      u.accountId,
      s,
    ]);
    await ad(u, "battle_rewards");
    const start = now;
    await online.state(u.token);
    now += 1000;
    await online.state(u.token);
    const boosted = await snapshot(u.accountId);
    expect(BigInt(boosted.balances.coin)).toBeGreaterThanOrEqual(6000n);
    expect(competitiveStats(boosted).attack).toBeGreaterThan(
      beforeStats.attack,
    );
    const isolated = createLocalSnapshot(start);
    isolated.battle.paused = false;
    isolated.battle.enemies.forEach((e) => {
      e.hp = 20;
      e.maxHp = 20;
    });
    const base = structuredClone(isolated);
    advanceCombat(isolated, 1000, start, () => 0, 10000, 20000);
    advanceCombat(base, 1000, start, () => 0);
    expect(isolated.battle.enemies[0]!.hp).toBeLessThan(
      base.battle.enemies[0]!.hp,
    );
  });
  it("excludes a combat strike at exact benefit expiry and preserves competitive attributes", async () => {
    const u = await user();
    await ad(u, "battle_damage");
    const s = await snapshot(u.accountId),
      stats = competitiveStats(s);
    s.battle.paused = false;
    s.battle.phase = "fighting";
    s.battle.time = 0;
    s.battle.heroNextAt = 1000;
    s.battle.enemies.forEach((e) => {
      e.hp = 10000;
      e.maxHp = 10000;
      e.nextAt = 1000000;
    });
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      u.accountId,
      s,
    ]);
    // Move the server-authored benefit end to the next strike to exercise an exact event boundary.
    await db.pool.query(
      "UPDATE akai_ad_benefits SET end_at=$2 WHERE account_id=$1",
      [u.accountId, now + 1000],
    );
    await online.state(u.token);
    now += 1000;
    await online.state(u.token);
    const after = await snapshot(u.accountId);
    expect(after.battle.enemies[0]!.hp).toBe(10000 - stats.attack);
    expect(competitiveStats(after)).toEqual(stats);
  });
  it("suspension blocks verification and sanitized snapshot never leaks receipt or key", async () => {
    const u = await user(),
      r = await receipt(u);
    await db.pool.query(
      "UPDATE akai_profiles SET suspended=true WHERE account_id=$1",
      [u.accountId],
    );
    await expect(verify(u, r)).rejects.toThrow("UNAUTHENTICATED");
    await db.pool.query(
      "UPDATE akai_profiles SET suspended=false WHERE account_id=$1",
      [u.accountId],
    );
    await verify(u, r);
    const json = JSON.stringify(await premium.read(u.token));
    expect(json).not.toContain(r.token);
    expect(json).not.toContain(key);
  });
  it("failed provider receipt backs off without starving other deliveries", async () => {
    const u = await user(),
      v = await user(),
      a = await receipt(u),
      b = await receipt(v);
    await verify(u, a);
    await verify(v, b);
    const actual = provider.finalize.bind(provider);
    provider.finalize = async (token) => {
      if (token === a.token) throw Error("one provider receipt offline");
      await actual(token);
    };
    try {
      expect((await premium.tick()).failed).toBe(1);
      expect((await premium.read(v.token)).purchases[0]!.delivery).toBe("done");
      expect((await premium.read(u.token)).purchases[0]!.delivery).toBe(
        "pending",
      );
    } finally {
      provider.finalize = actual;
    }
    now += 3000;
    await premium.tick();
    expect((await premium.read(u.token)).purchases[0]!.delivery).toBe("done");
    expect((await snapshot(u.accountId)).balances.ruby).toBe("100000");
  });
  it("migrates real F7 schema to F8 and default-off HTTP exposes no simulator", async () => {
    const oldSchema = "old_f8_" + randomUUID().replaceAll("-", "");
    await base.pool.query("CREATE SCHEMA " + oldSchema);
    const u = new URL(url!);
    u.searchParams.set("options", "-csearch_path=" + oldSchema);
    const oldDB = new Database(u.toString());
    try {
      for (const file of [
        "001_online.sql",
        "002_community.sql",
        "003_market.sql",
      ])
        await oldDB.pool.query(
          await readFile(
            new URL("../migrations/" + file, import.meta.url),
            "utf8",
          ),
        );
      const oldOnline = new OnlineService(oldDB, () => now),
        account = await oldOnline.guest(),
        before = (
          await oldDB.pool.query(
            "SELECT snapshot FROM akai_accounts WHERE id=$1",
            [account.accountId],
          )
        ).rows[0].snapshot;
      await oldDB.migrate();
      expect((await oldOnline.state(account.token)).snapshot.balances).toEqual(
        before.balances,
      );
      const app = buildServer(parseServerConfig({ NODE_ENV: "test" }), false, {
        service: oldOnline,
      });
      await app.ready();
      const headers = {
        "x-akai-client": "1",
        origin: "http://localhost:5173",
        cookie: "akai_session=" + account.token,
      };
      try {
        expect(
          (
            await app.inject({ method: "GET", url: "/api/v1/premium", headers })
          ).json().mode,
        ).toBe("off");
        expect(
          (
            await app.inject({
              method: "POST",
              url: "/api/v1/premium/sandbox",
              headers,
              payload: { intentId: randomUUID() },
            })
          ).statusCode,
        ).toBe(404);
        expect(
          (
            await app.inject({
              method: "POST",
              url: "/api/v1/premium/commands",
              headers,
              payload: { type: "restore", commandId: randomUUID() },
            })
          ).json().error.code,
        ).toBe("MONETIZATION_DISABLED");
      } finally {
        await app.close();
      }
    } finally {
      await oldDB.close();
      await base.pool.query("DROP SCHEMA " + oldSchema + " CASCADE");
    }
  });
  it("environment marker prevents switching sandbox database into ordinary mode", async () => {
    await expect(
      new PremiumService(online, parseServerConfig({})).guard(),
    ).rejects.toThrow("TEST_DATABASE_MODE_MISMATCH");
    await premium.guard();
  });
  it("HTTP refuses production-shaped boolean grants, wrong Origin and native-provider routes in off mode", async () => {
    const u = await user(),
      app = buildServer(config, false, { service: online });
    await app.ready();
    const headers = {
      "x-akai-client": "1",
      origin: config.PUBLIC_ORIGIN,
      cookie: "akai_session=" + u.token,
    };
    try {
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/premium/commands",
            headers,
            payload: { type: "ad.complete", watched: true },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/premium/commands",
            headers: { ...headers, origin: "http://evil.invalid" },
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/api/v1/premium",
            headers: { "x-akai-client": "1" },
          })
        ).statusCode,
      ).toBe(401);
    } finally {
      await app.close();
    }
  });
});
