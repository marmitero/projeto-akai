import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import {
  MarketActionSchema,
  marketFee,
  createEquipment,
  type MarketAction,
  type LocalSnapshot,
} from "@akai/shared";
import { Database } from "./database.js";
import { OnlineService } from "./online.js";
import { MarketService } from "./market.js";
import { createLocalSnapshot } from "../../client/src/local/session.js";
import { reconcileLedger } from "./audit.js";
import { buildServer } from "./app.js";
import { parseServerConfig } from "./config.js";
const url = process.env.TEST_DATABASE_URL;
describe("market contracts and integer economics", () => {
  it("rounds 10% upward at minimal precision, rejects ruby, forged payloads and invalid amounts", () => {
    expect(marketFee("11")).toBe(2n);
    expect(marketFee("10000")).toBe(1000n);
    expect(marketFee("999999999999999999999999999999")).toBe(
      100000000000000000000000000000n,
    );
    for (const price of ["-1", "0", "1.2", "1e3", "0002", "9".repeat(31)])
      expect(
        MarketActionSchema.safeParse({
          type: "list.resource",
          resource: "iron",
          quantity: "1000",
          price,
          currency: "coin",
        }).success,
      ).toBe(false);
    expect(
      MarketActionSchema.safeParse({
        type: "list.resource",
        resource: "iron",
        quantity: "1000",
        price: "1000",
        currency: "ruby",
      }).success,
    ).toBe(false);
    expect(
      MarketActionSchema.safeParse({
        type: "buy",
        listingId: randomUUID(),
        seller: randomUUID(),
      }).success,
    ).toBe(false);
  });
});
describe.skipIf(!url)("market real PostgreSQL", () => {
  const base = new Database(url!),
    schema = "f7_" + randomUUID().replaceAll("-", "");
  let db: Database,
    dbUrl: string,
    online: OnlineService,
    market: MarketService,
    now = 1800000000000;
  beforeAll(async () => {
    await base.pool.query("CREATE SCHEMA " + schema);
    const u = new URL(url!);
    u.searchParams.set("options", "-csearch_path=" + schema);
    dbUrl = u.toString();
    db = new Database(dbUrl);
    await db.migrate();
    online = new OnlineService(db, () => now);
    market = new MarketService(online);
  });
  beforeEach(async () => {
    await db.pool.query(
      "TRUNCATE akai_accounts,akai_market_audit,akai_auth_limits CASCADE",
    );
    now = 1800000000000;
  });
  afterAll(async () => {
    await db?.close();
    await base.pool.query("DROP SCHEMA " + schema + " CASCADE");
    await base.close();
  });
  const cmd = (token: string, action: MarketAction, commandId = randomUUID()) =>
    market.command(token, { commandId, action });
  async function user() {
    const u = await online.guest(),
      s = createLocalSnapshot(now);
    s.battle.highest = 10;
    s.battle.paused = true;
    s.balances.coin = "1000000000";
    s.balances.iron = "10000000";
    s.balances.coal = "10000000";
    s.rpg.inventory.push(createEquipment(s, "sword", 5, "rare"));
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      u.accountId,
      s,
    ]);
    for (const r of ["coin", "iron", "coal"] as const)
      await db.pool.query(
        "INSERT INTO akai_ledger(account_id,sequence,resource,delta,balance,reason) VALUES($1,0,$2,$3,$3,'fixture')",
        [u.accountId, r, s.balances[r]],
      );
    return u;
  }
  async function snapshot(id: string): Promise<LocalSnapshot> {
    return (
      await db.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [
        id,
      ])
    ).rows[0].snapshot;
  }
  async function item(
    u: Awaited<ReturnType<typeof user>>,
    price = "10000",
    currency: "coin" | "iron" | "coal" = "coin",
  ) {
    const id = (await snapshot(u.accountId)).rpg.inventory[0]!.id;
    const r = await cmd(u.token, {
      type: "list.item",
      itemId: id,
      price,
      currency,
    });
    expect(r.code).toBe("OK");
    return r.listingId!;
  }
  async function resource(u: Awaited<ReturnType<typeof user>>) {
    const r = await cmd(u.token, {
      type: "list.resource",
      resource: "iron",
      quantity: "1000",
      price: "11001",
      currency: "coin",
    });
    expect(r.code).toBe("OK");
    return r.listingId!;
  }
  it("migrates existing 001/002 state and re-runs migration without changing balance/session", async () => {
    const u = await user(),
      before = await snapshot(u.accountId);
    await db.migrate();
    expect(await snapshot(u.accountId)).toEqual(before);
    expect((await market.read(u.token)).accountId).toBe(u.accountId);
    const fresh = "migration_" + randomUUID().replaceAll("-", "");
    await base.pool.query("CREATE SCHEMA " + fresh);
    const uurl = new URL(url!);
    uurl.searchParams.set("options", "-csearch_path=" + fresh);
    const old = new Database(uurl.toString());
    try {
      await old.pool.query(
        await readFile(
          new URL("../migrations/001_online.sql", import.meta.url),
          "utf8",
        ),
      );
      await old.pool.query(
        await readFile(
          new URL("../migrations/002_community.sql", import.meta.url),
          "utf8",
        ),
      );
      const oldOnline = new OnlineService(old, () => now);
      const account = await oldOnline.guest();
      const initial = await oldOnline.state(account.token);
      await old.migrate();
      expect((await oldOnline.state(account.token)).snapshot.balances).toEqual(
        initial.snapshot.balances,
      );
      expect(
        (
          await old.pool.query(
            "SELECT to_regclass('akai_market_listings') name",
          )
        ).rows[0].name,
      ).toBe("akai_market_listings");
    } finally {
      await old.close();
      await base.pool.query("DROP SCHEMA " + fresh + " CASCADE");
    }
  });
  it("escrows equipment, charges listing once across concurrent replays and prevents use/relisting", async () => {
    const u = await user(),
      id = (await snapshot(u.accountId)).rpg.inventory[0]!.id,
      commandId = randomUUID(),
      action: MarketAction = {
        type: "list.item",
        itemId: id,
        price: "1000",
        currency: "coin",
      };
    const results = await Promise.all(
      Array.from({ length: 20 }, () => cmd(u.token, action, commandId)),
    );
    expect(new Set(results.map((r) => r.listingId)).size).toBe(1);
    expect((await snapshot(u.accountId)).balances.coin).toBe("900000000");
    expect((await snapshot(u.accountId)).rpg.inventory).toHaveLength(0);
    expect((await cmd(u.token, action)).code).toBe("ITEM_NOT_FOUND");
    await expect(
      cmd(u.token, { ...action, price: "2000" }, commandId),
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    const state = await online.state(u.token);
    const res = await online.command(u.token, {
      commandId: randomUUID(),
      expectedVersion: state.commandVersion,
      action: { type: "rpg", command: { type: "equip", id, slot: "weapon" } },
    });
    expect(res.status).toBe("rejected");
  });
  it("races two buyers and same-command replays: one item, one trade, conserved balances minus fee", async () => {
    const s = await user(),
      b = await user(),
      d = await user(),
      listingId = await item(s, "11001"),
      id = randomUUID();
    const results = await Promise.all([
      cmd(b.token, { type: "buy", listingId }, id),
      cmd(d.token, { type: "buy", listingId }),
      ...Array.from({ length: 15 }, () =>
        cmd(b.token, { type: "buy", listingId }, id),
      ),
    ]);
    expect(
      (await db.pool.query("SELECT * FROM akai_market_trades")).rows,
    ).toHaveLength(1);
    expect(
      results.filter((r) => r.code === "LISTING_CLOSED").length,
    ).toBeGreaterThan(0);
    const sold = await snapshot(s.accountId),
      bs = await snapshot(b.accountId),
      ds = await snapshot(d.accountId);
    expect(bs.rpg.inventory.length + ds.rpg.inventory.length).toBe(3);
    expect(
      BigInt(sold.balances.coin) +
        BigInt(bs.balances.coin) +
        BigInt(ds.balances.coin),
    ).toBe(3000000000n - 100000000n - 1101n);
    expect(await reconcileLedger(db)).toEqual([]);
  });
  it("uses fee in the offered currency, preserves equipment stats and allocates collision-free IDs", async () => {
    const s = await user(),
      b = await user(),
      original = (await snapshot(s.accountId)).rpg.inventory[0]!,
      listingId = await item(s, "11001", "iron");
    expect((await cmd(b.token, { type: "buy", listingId })).code).toBe("OK");
    const r = await snapshot(b.accountId);
    expect(r.rpg.inventory).toHaveLength(2);
    expect(r.rpg.inventory[1]).toEqual({ ...original, id: "item-2" });
    expect(r.balances.iron).toBe("9988999");
    expect((await snapshot(s.accountId)).balances.iron).toBe("10009900");
  });
  it("transfers resource quantities exactly with fractional precision and never touches rubies", async () => {
    const s = await user(),
      b = await user(),
      listingId = await resource(s);
    expect((await snapshot(s.accountId)).balances.iron).toBe("9999000");
    expect((await cmd(b.token, { type: "buy", listingId })).code).toBe("OK");
    expect((await snapshot(b.accountId)).balances.iron).toBe("10001000");
    expect((await snapshot(s.accountId)).balances.ruby).toBe("0");
  });
  it("rejects equipped, own, unavailable, same-resource, too-low and insufficient listings without fees", async () => {
    const s = await user(),
      b = await user();
    const snapshotS = await snapshot(s.accountId);
    snapshotS.rpg.equipped.weapon = "item-1";
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      s.accountId,
      snapshotS,
    ]);
    expect(
      (
        await cmd(s.token, {
          type: "list.item",
          itemId: "item-1",
          price: "1000",
          currency: "coin",
        })
      ).code,
    ).toBe("ITEM_EQUIPPED");
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "1000",
          price: "1000",
          currency: "iron",
        })
      ).code,
    ).toBe("SAME_RESOURCE");
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "1000",
          price: "1",
          currency: "coin",
        })
      ).code,
    ).toBe("PRICE_TOO_LOW");
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "10000001",
          price: "10",
          currency: "coin",
        })
      ).code,
    ).toBe("INSUFFICIENT_ASSET");
    expect((await snapshot(s.accountId)).balances.coin).toBe("1000000000");
    const listingId = await resource(s);
    expect((await cmd(s.token, { type: "buy", listingId })).code).toBe(
      "SELF_TRADE",
    );
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,coin}','\"0\"') WHERE id=$1",
      [b.accountId],
    );
    expect((await cmd(b.token, { type: "buy", listingId })).code).toBe(
      "INSUFFICIENT_FUNDS",
    );
    expect((await market.read(s.token)).mine[0]!.status).toBe("active");
  });
  it("enforces floor, listing fee and twenty outstanding escrow entries", async () => {
    const s = await user();
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{battle,highest}','9') WHERE id=$1",
      [s.accountId],
    );
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "1",
          price: "10",
          currency: "coin",
        })
      ).code,
    ).toBe("COMPLETE_FLOOR_TEN");
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(jsonb_set(snapshot,'{battle,highest}','10'),'{balances,coin}','\"99999999\"') WHERE id=$1",
      [s.accountId],
    );
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "1",
          price: "10",
          currency: "coin",
        })
      ).code,
    ).toBe("LISTING_FEE_REQUIRED");
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,coin}','\"9000000000\"') WHERE id=$1",
      [s.accountId],
    );
    for (let i = 0; i < 20; i++) await resource(s);
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "1",
          price: "10",
          currency: "coin",
        })
      ).code,
    ).toBe("LISTING_LIMIT");
  });
  it("cancel/claim persists same equipment lineage across new local IDs and exact cooldown boundary", async () => {
    const s = await user(),
      listingId = await item(s),
      commandId = randomUUID();
    await cmd(s.token, { type: "cancel", listingId });
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        cmd(s.token, { type: "claim", listingId }, commandId),
      ),
    );
    expect(results.every((r) => r.code === "OK")).toBe(true);
    expect((await snapshot(s.accountId)).rpg.inventory).toHaveLength(1);
    const newId = (await snapshot(s.accountId)).rpg.inventory[0]!.id;
    expect(newId).toBe("item-2");
    expect(
      (
        await cmd(s.token, {
          type: "list.item",
          itemId: newId,
          price: "1000",
          currency: "coin",
        })
      ).code,
    ).toBe("RELIST_COOLDOWN");
    now += 86400000;
    expect(
      (
        await cmd(s.token, {
          type: "list.item",
          itemId: newId,
          price: "1000",
          currency: "coin",
        })
      ).code,
    ).toBe("OK");
  });
  it("resource cooldown covers splits, merged balances and newly mined units", async () => {
    const s = await user(),
      listingId = await resource(s);
    await cmd(s.token, { type: "cancel", listingId });
    await cmd(s.token, { type: "claim", listingId });
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "iron",
          quantity: "1",
          price: "1000",
          currency: "coin",
        })
      ).code,
    ).toBe("RELIST_COOLDOWN");
    expect(
      (
        await cmd(s.token, {
          type: "list.resource",
          resource: "coal",
          quantity: "1",
          price: "1000",
          currency: "coin",
        })
      ).code,
    ).toBe("OK");
  });
  it("expires at three days, no sale at deadline, keeps escrow through restart and allows immediate relist after natural expiry", async () => {
    const s = await user(),
      b = await user(),
      listingId = await item(s);
    now += 3 * 86400000;
    expect((await cmd(b.token, { type: "buy", listingId })).code).toBe(
      "LISTING_CLOSED",
    );
    const restarted = new MarketService(new OnlineService(db, () => now));
    expect((await restarted.read(s.token)).mine[0]!.status).toBe("expired");
    await restarted.command(s.token, {
      commandId: randomUUID(),
      action: { type: "claim", listingId },
    });
    expect((await snapshot(s.accountId)).balances.coin).toBe("900000000");
    expect(await item(s)).toBeTruthy();
  });
  it("full bag blocks buy and return without debit or destruction, then allows claim after freeing a slot", async () => {
    const s = await user(),
      b = await user(),
      listingId = await item(s);
    for (const u of [s, b]) {
      const v = await snapshot(u.accountId);
      while (v.rpg.inventory.length < 120)
        v.rpg.inventory.push(createEquipment(v, "dagger", 1, "common"));
      await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
        u.accountId,
        v,
      ]);
    }
    expect((await cmd(b.token, { type: "buy", listingId })).code).toBe(
      "BAG_FULL",
    );
    expect((await snapshot(b.accountId)).balances.coin).toBe("1000000000");
    await cmd(s.token, { type: "cancel", listingId });
    expect((await cmd(s.token, { type: "claim", listingId })).code).toBe(
      "BAG_FULL",
    );
    expect((await market.read(s.token)).mine[0]!.claimed).toBe(false);
    const v = await snapshot(s.accountId);
    v.rpg.inventory.pop();
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      s.accountId,
      v,
    ]);
    expect((await cmd(s.token, { type: "claim", listingId })).code).toBe("OK");
    expect((await snapshot(s.accountId)).rpg.inventory).toHaveLength(120);
  });
  it("offers reserve no funds and revalidate changed balance, close siblings on accept", async () => {
    const s = await user(),
      b = await user(),
      d = await user(),
      listingId = await item(s);
    await cmd(b.token, {
      type: "offer",
      listingId,
      price: "5000",
      currency: "coal",
    });
    await cmd(d.token, {
      type: "offer",
      listingId,
      price: "6000",
      currency: "iron",
    });
    expect((await snapshot(b.accountId)).balances.coal).toBe("10000000");
    const o = (await market.read(s.token)).offers.find(
      (x) => x.buyer === b.accountId,
    )!;
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,coal}','\"0\"') WHERE id=$1",
      [b.accountId],
    );
    expect(
      (await cmd(s.token, { type: "offer.accept", offerId: o.id })).code,
    ).toBe("INSUFFICIENT_FUNDS");
    expect((await market.read(s.token)).offers).toHaveLength(2);
    const other = (await market.read(s.token)).offers.find(
      (x) => x.buyer === d.accountId,
    )!;
    expect(
      (await cmd(s.token, { type: "offer.accept", offerId: other.id })).code,
    ).toBe("OK");
    expect((await market.read(s.token)).offers).toHaveLength(0);
    expect(
      (
        await db.pool.query(
          "SELECT status FROM akai_market_offers WHERE id=$1",
          [o.id],
        )
      ).rows[0].status,
    ).toBe("closed");
  });
  it("races direct purchase versus offer acceptance and produces exactly one transfer", async () => {
    const s = await user(),
      b = await user(),
      d = await user(),
      listingId = await item(s);
    await cmd(b.token, {
      type: "offer",
      listingId,
      price: "5000",
      currency: "coin",
    });
    const o = (await market.read(s.token)).offers[0]!;
    const r = await Promise.all([
      cmd(s.token, { type: "offer.accept", offerId: o.id }),
      cmd(d.token, { type: "buy", listingId }),
    ]);
    expect(r.filter((x) => x.status === "applied")).toHaveLength(1);
    expect(
      (await db.pool.query("SELECT * FROM akai_market_trades")).rowCount,
    ).toBe(1);
  });
  it("private offer permissions, expiry, withdrawal and rejection require correct owner", async () => {
    const s = await user(),
      b = await user(),
      d = await user(),
      listingId = await item(s);
    await cmd(b.token, {
      type: "offer",
      listingId,
      price: "5000",
      currency: "coin",
    });
    const o = (await market.read(s.token)).offers[0]!;
    for (const type of [
      "offer.accept",
      "offer.reject",
      "offer.withdraw",
    ] as const)
      expect((await cmd(d.token, { type, offerId: o.id })).code).toBe(
        "FORBIDDEN",
      );
    expect((await market.read(d.token)).offers).toHaveLength(0);
    expect((await cmd(b.token, { type: "cancel", listingId })).code).toBe(
      "FORBIDDEN",
    );
    expect((await cmd(b.token, { type: "claim", listingId })).code).toBe(
      "FORBIDDEN",
    );
    await cmd(b.token, { type: "offer.withdraw", offerId: o.id });
    await cmd(b.token, {
      type: "offer",
      listingId,
      price: "5000",
      currency: "coin",
    });
    const o2 = (await market.read(s.token)).offers[0]!;
    await cmd(s.token, { type: "offer.reject", offerId: o2.id });
    await cmd(b.token, {
      type: "offer",
      listingId,
      price: "5000",
      currency: "coin",
    });
    const o3 = (await market.read(s.token)).offers[0]!;
    now += 86400000;
    expect(
      (await cmd(s.token, { type: "offer.accept", offerId: o3.id })).code,
    ).toBe("OFFER_CLOSED");
  });
  it("rolls back both accounts, escrow, trade, ledger and outbox if second outbox insert fails", async () => {
    const s = await user(),
      b = await user(),
      listingId = await item(s),
      beforeS = await snapshot(s.accountId),
      beforeB = await snapshot(b.accountId),
      commandId = randomUUID();
    await db.pool.query(
      `CREATE FUNCTION fail_market_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.account_id='${b.accountId}'::uuid AND NEW.payload->>'reason' LIKE 'market:trade:%' THEN RAISE EXCEPTION 'market-outbox-test'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_market_event BEFORE INSERT ON akai_events FOR EACH ROW EXECUTE FUNCTION fail_market_event()`,
    );
    try {
      await expect(
        cmd(b.token, { type: "buy", listingId }, commandId),
      ).rejects.toThrow("market-outbox-test");
      expect(await snapshot(s.accountId)).toEqual(beforeS);
      expect(await snapshot(b.accountId)).toEqual(beforeB);
      expect(
        (await db.pool.query("SELECT * FROM akai_market_trades")).rowCount,
      ).toBe(0);
      expect((await market.read(s.token)).mine[0]!.status).toBe("active");
    } finally {
      await db.pool.query(
        "DROP TRIGGER fail_market_event ON akai_events; DROP FUNCTION fail_market_event()",
      );
    }
    expect(
      (await cmd(b.token, { type: "buy", listingId }, commandId)).code,
    ).toBe("OK");
    expect(await reconcileLedger(db)).toEqual([]);
  });
  it("suspended parties cannot transact, listings hidden and privileged removal remains claimable", async () => {
    const s = await user(),
      b = await user(),
      listingId = await item(s);
    await db.pool.query(
      "UPDATE akai_profiles SET suspended=true WHERE account_id=$1",
      [s.accountId],
    );
    expect((await market.read(b.token)).listings).toHaveLength(0);
    expect((await cmd(b.token, { type: "buy", listingId })).code).toBe(
      "ACCOUNT_SUSPENDED",
    );
    await expect(market.read(s.token)).rejects.toThrow("UNAUTHENTICATED");
    await market.moderate(
      "operator-test",
      listingId,
      "Invalid listing under review",
    );
    expect(
      (await db.pool.query("SELECT status FROM akai_market_listings")).rows[0]
        .status,
    ).toBe("removed");
    await db.pool.query(
      "UPDATE akai_profiles SET suspended=false WHERE account_id=$1",
      [s.accountId],
    );
    expect((await cmd(s.token, { type: "claim", listingId })).code).toBe("OK");
    expect(
      (
        await db.pool.query(
          "SELECT * FROM akai_market_audit WHERE action='moderation:remove'",
        )
      ).rowCount,
    ).toBe(1);
  });
  it("HTTP auth/origin/rate-limit and strict payload; no public moderation route", async () => {
    const s = await user(),
      app = buildServer(
        parseServerConfig({
          NODE_ENV: "test",
          PORT: "3000",
          PUBLIC_ORIGIN: "http://localhost:5173",
        }),
        false,
        { service: online },
      );
    await app.ready();
    try {
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/api/v1/market",
            headers: { "x-akai-client": "1" },
          })
        ).statusCode,
      ).toBe(401);
      const headers = {
        "x-akai-client": "1",
        origin: "http://localhost:5173",
        cookie: "akai_session=" + s.token,
      };
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/api/v1/market?currency=ruby",
            headers,
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/market/commands",
            headers: { ...headers, origin: "http://evil.invalid" },
            payload: {},
          })
        ).statusCode,
      ).toBe(403);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/market/admin",
            headers,
            payload: {},
          })
        ).statusCode,
      ).toBe(404);
      for (let i = 0; i < 30; i++)
        expect(
          (
            await app.inject({
              method: "POST",
              url: "/api/v1/market/commands",
              headers,
              payload: {
                commandId: randomUUID(),
                action: { type: "buy", listingId: randomUUID() },
              },
            })
          ).statusCode,
        ).toBe(422);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/market/commands",
            headers,
            payload: {},
          })
        ).statusCode,
      ).toBe(429);
    } finally {
      await app.close();
    }
  });
  it("cancel versus buy leaves exactly one legal escrow outcome", async () => {
    const seller = await user(),
      buyer = await user(),
      listingId = await item(seller);
    const result = await Promise.all([
      cmd(seller.token, { type: "cancel", listingId }),
      cmd(buyer.token, { type: "buy", listingId }),
    ]);
    expect(result.filter((r) => r.status === "applied")).toHaveLength(1);
    const listing = (
      await db.pool.query("SELECT * FROM akai_market_listings WHERE id=$1", [
        listingId,
      ])
    ).rows[0];
    if (listing.status === "cancelled") {
      expect((await snapshot(buyer.accountId)).rpg.inventory).toHaveLength(1);
      await cmd(seller.token, { type: "claim", listingId });
      expect((await snapshot(seller.accountId)).rpg.inventory).toHaveLength(1);
    } else {
      expect(listing.status).toBe("sold");
      expect((await snapshot(buyer.accountId)).rpg.inventory).toHaveLength(2);
    }
  });
  it("seller overflow rolls back item transfer and debit; rejected command remains rejected after funds change", async () => {
    const seller = await user(),
      buyer = await user(),
      listingId = await item(seller, "1000", "iron");
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,iron}',to_jsonb($2::text)) WHERE id=$1",
      [seller.accountId, String(10n ** 38n - 1n)],
    );
    const commandId = randomUUID();
    expect(
      (await cmd(buyer.token, { type: "buy", listingId }, commandId)).code,
    ).toBe("BALANCE_LIMIT");
    expect((await snapshot(buyer.accountId)).balances.iron).toBe("10000000");
    expect((await snapshot(buyer.accountId)).rpg.inventory).toHaveLength(1);
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,iron}','\"0\"') WHERE id=$1",
      [seller.accountId],
    );
    expect(
      (await cmd(buyer.token, { type: "buy", listingId }, commandId)).code,
    ).toBe("BALANCE_LIMIT");
    expect((await cmd(buyer.token, { type: "buy", listingId })).code).toBe(
      "OK",
    );
  });
  it("filters and pages public listings, keeps private history isolated and never exposes account RNG", async () => {
    const seller = await user(),
      buyer = await user();
    await item(seller);
    await resource(seller);
    expect(
      (await market.read(buyer.token, { kind: "item" })).listings,
    ).toHaveLength(1);
    expect(
      (await market.read(buyer.token, { kind: "resource", currency: "coin" }))
        .listings,
    ).toHaveLength(1);
    expect(
      (await market.read(buyer.token, { currency: "jade" })).listings,
    ).toHaveLength(0);
    expect(
      (await market.read(buyer.token, { offset: 50 })).listings,
    ).toHaveLength(0);
    expect(JSON.stringify(await market.read(buyer.token))).not.toContain(
      '"rng"',
    );
    expect((await market.read(buyer.token)).mine).toHaveLength(0);
    await expect(market.read(buyer.token, { offset: 5001 })).rejects.toThrow();
  });
  it("offer TTL is capped by listing expiry and buyer suspension blocks acceptance", async () => {
    const seller = await user(),
      buyer = await user(),
      listingId = await item(seller);
    now += 3 * 86400000 - 1000;
    await cmd(buyer.token, {
      type: "offer",
      listingId,
      price: "1000",
      currency: "coin",
    });
    const offer = (await market.read(seller.token)).offers[0]!;
    expect(offer.expiresAt).toBe(now + 1000);
    await db.pool.query(
      "UPDATE akai_profiles SET suspended=true WHERE account_id=$1",
      [buyer.accountId],
    );
    expect(
      (await cmd(seller.token, { type: "offer.accept", offerId: offer.id }))
        .code,
    ).toBe("ACCOUNT_SUSPENDED");
    now += 1000;
    expect(
      (await cmd(seller.token, { type: "offer.accept", offerId: offer.id }))
        .code,
    ).toBe("OFFER_CLOSED");
    expect(
      (
        await db.pool.query(
          "SELECT * FROM akai_market_audit WHERE action='listing.expired'",
        )
      ).rowCount,
    ).toBe(1);
  });
  it("runs audited operator CLI and immutable audit/trade guards", async () => {
    const s = await user(),
      listingId = await resource(s);
    execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "apps/server/src/market-admin.ts",
        "operator-fixture",
        listingId,
        "Fixture removal test",
      ],
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: dbUrl },
        stdio: "pipe",
      },
    );
    expect((await market.read(s.token)).mine[0]!.status).toBe("removed");
    await expect(
      db.pool.query("UPDATE akai_market_audit SET actor='changed'"),
    ).rejects.toThrow();
  });
});
