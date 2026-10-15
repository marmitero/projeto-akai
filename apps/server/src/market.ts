import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  MarketCommandSchema,
  MarketQuerySchema,
  MARKET_VERSION,
  marketFee,
  addResource,
  type MarketAction,
  type MarketAsset,
  type MarketListing,
  type MarketOffer,
  type MarketResult,
  type MarketSnapshot,
  type MarketCurrency,
  type LocalSnapshot,
} from "@akai/shared";
import { CommunityService } from "./community.js";
import { OnlineService, OnlineError, digest, type Account } from "./online.js";
function rule(ok: unknown, code: string): asserts ok {
  if (!ok) throw new OnlineError(code);
}
const DAY = 86400000;
const listingView = (r: any): MarketListing => ({
  id: r.id,
  seller: r.seller,
  sellerName: r.name ?? "Viajante",
  asset: r.asset,
  price: r.price,
  currency: r.currency,
  createdAt: Number(r.created_at),
  expiresAt: Number(r.expires_at),
  status: r.status,
  claimed: r.claimed,
});
const offerView = (r: any): MarketOffer => ({
  id: r.id,
  listingId: r.listing_id,
  buyer: r.buyer,
  price: r.price,
  currency: r.currency,
  expiresAt: Number(r.expires_at),
  status: r.status,
});
export class MarketService {
  constructor(readonly online: OnlineService) {}
  async global(c: PoolClient) {
    await c.query("SELECT pg_advisory_xact_lock(41652006)");
  }
  async sync(c: PoolClient) {
    const now = this.online.clock();
    await c.query(
      "WITH expired AS (UPDATE akai_market_listings SET status='expired',closed_at=$1 WHERE status='active' AND expires_at<=$1 RETURNING id,seller) INSERT INTO akai_market_audit(id,actor,action,payload,at) SELECT gen_random_uuid(),seller::text,'listing.expired',jsonb_build_object('listingId',id),$1 FROM expired",
      [now],
    );
    await c.query(
      "UPDATE akai_market_offers SET status=CASE WHEN expires_at<=$1 THEN 'expired' ELSE 'closed' END WHERE status='pending' AND (expires_at<=$1 OR listing_id IN (SELECT id FROM akai_market_listings WHERE status<>'active'))",
      [now],
    );
  }
  async tick() {
    await this.online.db.transaction(async (c) => {
      await this.global(c);
      await this.sync(c);
    });
  }
  async command(token: string, input: unknown): Promise<MarketResult> {
    const cmd = MarketCommandSchema.parse(input),
      hash = digest(JSON.stringify(cmd));
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      const id = await this.online.identity(token, c);
      await new CommunityService(this.online).profile(c, id);
      const previous = (
        await c.query(
          "SELECT * FROM akai_market_commands WHERE account_id=$1 AND command_id=$2",
          [id, cmd.commandId],
        )
      ).rows[0];
      if (previous) {
        if (previous.payload_hash !== hash)
          throw new OnlineError("IDEMPOTENCY_CONFLICT", 409);
        return previous.result;
      }
      await this.sync(c);
      await c.query("SAVEPOINT market_action");
      let result: MarketResult = {
        commandId: cmd.commandId,
        status: "applied",
        code: "OK",
      };
      try {
        const listingId = await this.apply(c, id, cmd.action);
        await this.online.identity(token, c);
        if (listingId) result.listingId = listingId;
      } catch (error) {
        await c.query("ROLLBACK TO SAVEPOINT market_action");
        if (error instanceof OnlineError)
          result = {
            commandId: cmd.commandId,
            status: "rejected",
            code: error.code,
          };
        else if (
          error instanceof Error &&
          ["BALANCE_LIMIT", "ITEM_ID_LIMIT"].includes(error.message)
        )
          result = {
            commandId: cmd.commandId,
            status: "rejected",
            code: error.message,
          };
        else throw error;
      }
      await c.query("RELEASE SAVEPOINT market_action");
      await c.query("INSERT INTO akai_market_commands VALUES($1,$2,$3,$4)", [
        id,
        cmd.commandId,
        hash,
        result,
      ]);
      await this.audit(c, id, cmd.action.type, {
        commandId: cmd.commandId,
        action: cmd.action,
        result,
      });
      return result;
    });
  }
  async audit(c: PoolClient, actor: string, action: string, payload: unknown) {
    await c.query("INSERT INTO akai_market_audit VALUES($1,$2,$3,$4,$5)", [
      randomUUID(),
      actor,
      action,
      payload,
      this.online.clock(),
    ]);
  }
  async accounts(c: PoolClient, ids: string[]) {
    const rows = new Map<string, { a: Account; before: LocalSnapshot }>();
    for (const id of [...new Set(ids)].sort()) {
      const a = await this.online.lockAccount(c, id);
      const before = structuredClone(a.snapshot);
      await this.online.settle(c, a);
      rows.set(id, { a, before });
    }
    return rows;
  }
  async persist(
    c: PoolClient,
    rows: Awaited<ReturnType<MarketService["accounts"]>>,
    reason: string,
  ) {
    for (const { a, before } of rows.values())
      await this.online.save(c, a, before, reason);
  }
  async available(c: PoolClient, id: string) {
    rule(
      !(
        await c.query(
          "SELECT 1 FROM akai_profiles WHERE account_id=$1 AND suspended",
          [id],
        )
      ).rowCount,
      "ACCOUNT_SUSPENDED",
    );
  }
  async load(c: PoolClient, id: string) {
    const r = (
      await c.query(
        "SELECT * FROM akai_market_listings WHERE id=$1 FOR UPDATE",
        [id],
      )
    ).rows[0];
    rule(r, "LISTING_NOT_FOUND");
    return r;
  }
  async deliver(c: PoolClient, a: Account, asset: MarketAsset) {
    if (asset.kind === "resource") {
      addResource(a.snapshot, asset.resource!, BigInt(asset.quantity));
      return;
    }
    rule(a.snapshot.rpg.inventory.length < 120, "BAG_FULL");
    rule(a.snapshot.rpg.nextItemId < 999999999999999, "ITEM_ID_LIMIT");
    const item = {
      ...structuredClone(asset.item!),
      id: `item-${a.snapshot.rpg.nextItemId++}`,
    };
    a.snapshot.rpg.inventory.push(item);
    await c.query("INSERT INTO akai_market_items VALUES($1,$2,$3)", [
      a.id,
      item.id,
      asset.key,
    ]);
  }
  async cooldown(c: PoolClient, id: string, key: string) {
    rule(
      !(
        await c.query(
          "SELECT 1 FROM akai_market_cooldowns WHERE account_id=$1 AND asset_key=$2 AND until_at>$3",
          [id, key, this.online.clock()],
        )
      ).rowCount,
      "RELIST_COOLDOWN",
    );
  }
  async apply(
    c: PoolClient,
    id: string,
    action: MarketAction,
  ): Promise<string | undefined> {
    const now = this.online.clock();
    if (action.type === "list.item" || action.type === "list.resource") {
      rule(BigInt(action.price) > marketFee(action.price), "PRICE_TOO_LOW");
      rule(
        Number(
          (
            await c.query(
              "SELECT count(*) FROM akai_market_listings WHERE seller=$1 AND (status='active' OR (status IN ('cancelled','expired','removed') AND NOT claimed))",
              [id],
            )
          ).rows[0].count,
        ) < 20,
        "LISTING_LIMIT",
      );
      rule(
        Number(
          (
            await c.query(
              "SELECT count(*) FROM akai_market_listings WHERE status='active'",
            )
          ).rows[0].count,
        ) < 5000,
        "MARKET_CAPACITY",
      );
      const rows = await this.accounts(c, [id]),
        a = rows.get(id)!.a;
      rule(a.snapshot.battle.highest >= 10, "COMPLETE_FLOOR_TEN");
      rule(
        BigInt(a.snapshot.balances.coin) >= 100000000n,
        "LISTING_FEE_REQUIRED",
      );
      let asset: MarketAsset;
      if (action.type === "list.item") {
        const i = a.snapshot.rpg.inventory.findIndex(
          (x) => x.id === action.itemId,
        );
        rule(i >= 0, "ITEM_NOT_FOUND");
        rule(
          !Object.values(a.snapshot.rpg.equipped).includes(action.itemId),
          "ITEM_EQUIPPED",
        );
        const old = (
          await c.query(
            "SELECT asset_key FROM akai_market_items WHERE account_id=$1 AND item_id=$2",
            [id, action.itemId],
          )
        ).rows[0];
        const key = old?.asset_key ?? "item:" + randomUUID();
        await this.cooldown(c, id, key);
        asset = {
          kind: "item",
          item: a.snapshot.rpg.inventory.splice(i, 1)[0]!,
          quantity: "1",
          key,
        };
        await c.query(
          "DELETE FROM akai_market_items WHERE account_id=$1 AND item_id=$2",
          [id, action.itemId],
        );
      } else {
        rule(action.resource !== action.currency, "SAME_RESOURCE");
        await this.cooldown(c, id, "resource:" + action.resource);
        rule(
          BigInt(a.snapshot.balances[action.resource]) >=
            BigInt(action.quantity),
          "INSUFFICIENT_ASSET",
        );
        asset = {
          kind: "resource",
          resource: action.resource,
          quantity: action.quantity,
          key: "resource:" + action.resource,
        };
        addResource(a.snapshot, action.resource, -BigInt(action.quantity));
      }
      addResource(a.snapshot, "coin", -100000000n);
      const listingId = randomUUID();
      await c.query(
        "INSERT INTO akai_market_listings(id,seller,asset,price,currency,created_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          listingId,
          id,
          asset,
          action.price,
          action.currency,
          now,
          now + 3 * DAY,
        ],
      );
      await this.persist(c, rows, "market:list:" + listingId);
      return listingId;
    }
    if (
      action.type === "offer.withdraw" ||
      action.type === "offer.reject" ||
      action.type === "offer.accept"
    ) {
      const o = (
        await c.query(
          "SELECT * FROM akai_market_offers WHERE id=$1 FOR UPDATE",
          [action.offerId],
        )
      ).rows[0];
      rule(o, "OFFER_NOT_FOUND");
      const l = await this.load(c, o.listing_id);
      rule(
        action.type === "offer.withdraw" ? o.buyer === id : l.seller === id,
        "FORBIDDEN",
      );
      rule(
        o.status === "pending" &&
          Number(o.expires_at) > now &&
          l.status === "active",
        "OFFER_CLOSED",
      );
      if (action.type === "offer.accept")
        await this.trade(c, l, o.buyer, o.price, o.currency, o.id);
      else
        await c.query("UPDATE akai_market_offers SET status=$2 WHERE id=$1", [
          o.id,
          action.type === "offer.withdraw" ? "withdrawn" : "rejected",
        ]);
      return l.id;
    }
    const l = await this.load(c, action.listingId);
    if (action.type === "claim") {
      rule(l.seller === id, "FORBIDDEN");
      rule(
        ["cancelled", "expired", "removed"].includes(l.status) && !l.claimed,
        "NOT_CLAIMABLE",
      );
      const rows = await this.accounts(c, [id]);
      await this.deliver(c, rows.get(id)!.a, l.asset);
      await c.query(
        "UPDATE akai_market_listings SET claimed=true WHERE id=$1",
        [l.id],
      );
      await this.persist(c, rows, "market:return:" + l.id);
      return l.id;
    }
    rule(l.status === "active" && Number(l.expires_at) > now, "LISTING_CLOSED");
    if (action.type === "cancel") {
      rule(l.seller === id, "FORBIDDEN");
      await this.close(c, l, "cancelled", true);
      return l.id;
    }
    rule(l.seller !== id, "SELF_TRADE");
    await this.available(c, l.seller);
    if (action.type === "buy") {
      await this.trade(c, l, id, l.price, l.currency);
      return l.id;
    }
    rule(action.type === "offer", "INVALID_ACTION");
    rule(BigInt(action.price) > marketFee(action.price), "PRICE_TOO_LOW");
    rule(
      l.asset.kind !== "resource" || l.asset.resource !== action.currency,
      "SAME_RESOURCE",
    );
    const rows = await this.accounts(c, [id]);
    const a = rows.get(id)!.a;
    rule(a.snapshot.battle.highest >= 10, "COMPLETE_FLOOR_TEN");
    rule(
      BigInt(a.snapshot.balances[action.currency]) >= BigInt(action.price),
      "INSUFFICIENT_FUNDS",
    );
    rule(
      Number(
        (
          await c.query(
            "SELECT count(*) FROM akai_market_offers WHERE buyer=$1 AND status='pending'",
            [id],
          )
        ).rows[0].count,
      ) < 20,
      "OFFER_LIMIT",
    );
    rule(
      !(
        await c.query(
          "SELECT 1 FROM akai_market_offers WHERE listing_id=$1 AND buyer=$2 AND status='pending'",
          [l.id, id],
        )
      ).rowCount,
      "OFFER_EXISTS",
    );
    await c.query(
      "INSERT INTO akai_market_offers(id,listing_id,buyer,price,currency,expires_at,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [
        randomUUID(),
        l.id,
        id,
        action.price,
        action.currency,
        Math.min(now + DAY, Number(l.expires_at)),
        now,
      ],
    );
    await this.persist(c, rows, "market:offer:" + l.id);
    return l.id;
  }
  async close(
    c: PoolClient,
    l: any,
    status: "cancelled" | "removed",
    cooldown: boolean,
  ) {
    const now = this.online.clock();
    await c.query(
      "UPDATE akai_market_listings SET status=$2,closed_at=$3 WHERE id=$1",
      [l.id, status, now],
    );
    await c.query(
      "UPDATE akai_market_offers SET status='closed' WHERE listing_id=$1 AND status='pending'",
      [l.id],
    );
    if (cooldown)
      await c.query(
        "INSERT INTO akai_market_cooldowns VALUES($1,$2,$3) ON CONFLICT(account_id,asset_key) DO UPDATE SET until_at=GREATEST(akai_market_cooldowns.until_at,excluded.until_at)",
        [l.seller, l.asset.key, now + DAY],
      );
  }
  async trade(
    c: PoolClient,
    l: any,
    buyer: string,
    price: string,
    currency: MarketCurrency,
    offerId?: string,
  ) {
    rule(l.seller !== buyer, "SELF_TRADE");
    await this.available(c, l.seller);
    await this.available(c, buyer);
    const rows = await this.accounts(c, [l.seller, buyer]),
      b = rows.get(buyer)!.a,
      s = rows.get(l.seller)!.a;
    rule(b.snapshot.battle.highest >= 10, "COMPLETE_FLOOR_TEN");
    rule(
      BigInt(b.snapshot.balances[currency]) >= BigInt(price),
      "INSUFFICIENT_FUNDS",
    );
    const fee = marketFee(price),
      net = BigInt(price) - fee;
    rule(net > 0n, "PRICE_TOO_LOW");
    await this.deliver(c, b, l.asset);
    addResource(b.snapshot, currency, -BigInt(price));
    addResource(s.snapshot, currency, net);
    const tradeId = randomUUID();
    await c.query(
      "INSERT INTO akai_market_trades VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        tradeId,
        l.id,
        buyer,
        l.seller,
        price,
        String(fee),
        String(net),
        currency,
        l.asset,
        this.online.clock(),
      ],
    );
    await c.query(
      "UPDATE akai_market_listings SET status='sold',claimed=true,closed_at=$2 WHERE id=$1",
      [l.id, this.online.clock()],
    );
    await c.query(
      "UPDATE akai_market_offers SET status=CASE WHEN id=$2 THEN 'accepted' ELSE 'closed' END WHERE listing_id=$1 AND status='pending'",
      [l.id, offerId ?? null],
    );
    await this.persist(c, rows, "market:trade:" + tradeId);
  }
  async moderate(operator: string, listingId: string, reason: string) {
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      await this.sync(c);
      const l = await this.load(c, listingId);
      rule(l.status === "active", "LISTING_CLOSED");
      await this.close(c, l, "removed", true);
      await this.audit(c, operator, "moderation:remove", { listingId, reason });
    });
  }
  async read(token: string, input: unknown = {}): Promise<MarketSnapshot> {
    const q = MarketQuerySchema.parse(input);
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      const id = await this.online.identity(token, c);
      await new CommunityService(this.online).profile(c, id);
      await this.sync(c);
      const a = await this.online.lockAccount(c, id);
      const publicRows = (
        await c.query(
          "SELECT l.*,p.name FROM akai_market_listings l LEFT JOIN akai_profiles p ON p.account_id=l.seller WHERE l.status='active' AND NOT COALESCE(p.suspended,false) AND ($1::text IS NULL OR l.asset->>'kind'=$1) AND ($2::text IS NULL OR l.currency=$2) ORDER BY l.created_at DESC,l.id LIMIT 51 OFFSET $3",
          [q.kind ?? null, q.currency ?? null, q.offset],
        )
      ).rows;
      const mine = (
        await c.query(
          "SELECT l.*,p.name FROM akai_market_listings l LEFT JOIN akai_profiles p ON p.account_id=l.seller WHERE l.seller=$1 AND (l.status='active' OR (l.status IN ('expired','cancelled','removed') AND NOT l.claimed)) ORDER BY l.created_at DESC,l.id LIMIT 20",
          [id],
        )
      ).rows;
      const offers = (
        await c.query(
          "SELECT o.* FROM akai_market_offers o JOIN akai_market_listings l ON l.id=o.listing_id WHERE (o.buyer=$1 OR l.seller=$1) AND o.status='pending' ORDER BY o.created_at DESC LIMIT 100",
          [id],
        )
      ).rows;
      const trades = (
        await c.query(
          "SELECT * FROM akai_market_trades WHERE buyer=$1 OR seller=$1 ORDER BY at DESC,id LIMIT 50",
          [id],
        )
      ).rows;
      const cooldowns = (
        await c.query(
          "SELECT asset_key,until_at FROM akai_market_cooldowns WHERE account_id=$1 AND until_at>$2",
          [id, this.online.clock()],
        )
      ).rows;
      return {
        version: MARKET_VERSION,
        accountId: id,
        serverTime: this.online.clock(),
        listings: publicRows.slice(0, 50).map(listingView),
        hasMore: publicRows.length > 50,
        mine: mine.map(listingView),
        offers: offers.map(offerView),
        history: trades.map((r) => ({
          id: r.id,
          listingId: r.listing_id,
          buyer: r.buyer,
          seller: r.seller,
          price: r.price,
          fee: r.fee,
          net: r.net,
          currency: r.currency,
          at: Number(r.at),
          asset: r.asset,
        })),
        inventory: a.snapshot.rpg.inventory.filter(
          (i) => !Object.values(a.snapshot.rpg.equipped).includes(i.id),
        ),
        balances: {
          coin: a.snapshot.balances.coin,
          iron: a.snapshot.balances.iron,
          coal: a.snapshot.balances.coal,
          gold: a.snapshot.balances.gold,
          jade: a.snapshot.balances.jade,
        },
        cooldowns: cooldowns.map((r) => ({
          key: r.asset_key,
          until: Number(r.until_at),
        })),
      };
    });
  }
}
