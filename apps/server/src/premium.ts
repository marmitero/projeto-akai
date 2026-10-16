import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  PremiumCommandSchema,
  PREMIUM_PRODUCTS,
  MONETIZATION_VERSION,
  addResource,
  floorStats,
  type PremiumCommand,
  type PremiumResult,
  type PremiumView,
  RewardedTypeSchema,
} from "@akai/shared";
import { OnlineService, OnlineError, digest } from "./online.js";
import { CommunityService } from "./community.js";
import { type ServerConfig } from "./config.js";
import {
  SandboxProvider,
  GooglePlayTestProvider,
  accountBinding,
  encryptToken,
  decryptToken,
  type PurchaseProvider,
  type VerifiedPurchase,
} from "./premium-providers.js";
function rule(ok: unknown, code: string): asserts ok {
  if (!ok) throw new OnlineError(code);
}
const DAY = 86400000;
export class PremiumService {
  readonly provider: PurchaseProvider | undefined;
  constructor(
    readonly online: OnlineService,
    readonly config: ServerConfig,
    provider?: PurchaseProvider,
  ) {
    this.provider =
      provider ??
      (config.MONETIZATION_MODE === "sandbox"
        ? new SandboxProvider(online.db, config.MONETIZATION_KEY!, online.clock)
        : config.MONETIZATION_MODE === "google-play-test"
          ? new GooglePlayTestProvider(config)
          : undefined);
  }
  async guard() {
    await this.online.db.transaction(async (c) => {
      await this.global(c);
      const prior = (
        await c.query("SELECT mode FROM akai_monetization_environment")
      ).rows[0];
      if (prior && prior.mode !== this.config.MONETIZATION_MODE)
        throw Error(
          "TEST_DATABASE_MODE_MISMATCH: do not reuse a monetization test database for normal gameplay",
        );
      if (this.config.MONETIZATION_MODE !== "off")
        await c.query(
          "INSERT INTO akai_monetization_environment(id,mode) VALUES(true,$1) ON CONFLICT DO NOTHING",
          [this.config.MONETIZATION_MODE],
        );
    });
  }
  async global(c: PoolClient) {
    await c.query("SELECT pg_advisory_xact_lock(41652006)");
  }
  async audit(c: PoolClient, id: string, action: string, payload: unknown) {
    await c.query("INSERT INTO akai_premium_audit VALUES($1,$2,$3,$4,$5)", [
      randomUUID(),
      id,
      action,
      payload,
      this.online.clock(),
    ]);
  }
  async identity(token: string) {
    return this.online.db.transaction((c) => this.online.identity(token, c));
  }
  async command(token: string, input: unknown): Promise<PremiumResult> {
    const cmd = PremiumCommandSchema.parse(input);
    rule(this.provider, "MONETIZATION_DISABLED");
    const id = await this.identity(token),
      hash = digest(JSON.stringify(cmd));
    const old = (
      await this.online.db.pool.query(
        "SELECT * FROM akai_premium_commands WHERE account_id=$1 AND command_id=$2",
        [id, cmd.commandId],
      )
    ).rows[0];
    if (old) {
      if (old.payload_hash !== hash)
        throw new OnlineError("IDEMPOTENCY_CONFLICT", 409);
      return old.result;
    }
    let proof: VerifiedPurchase | undefined;
    if (cmd.type === "purchase.verify") {
      const i = (
        await this.online.db.pool.query(
          "SELECT * FROM akai_premium_intents WHERE id=$1 AND account_id=$2 AND kind='purchase'",
          [cmd.intentId, id],
        )
      ).rows[0];
      rule(i, "INTENT_NOT_FOUND");
      proof = await this.provider.verify(cmd.purchaseToken);
    }
    if (cmd.type === "restore") {
      await this.restore(id);
    }
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      await this.online.identity(token, c);
      await new CommunityService(this.online).profile(c, id);
      const previous = (
        await c.query(
          "SELECT * FROM akai_premium_commands WHERE account_id=$1 AND command_id=$2",
          [id, cmd.commandId],
        )
      ).rows[0];
      if (previous) {
        if (previous.payload_hash !== hash)
          throw new OnlineError("IDEMPOTENCY_CONFLICT", 409);
        return previous.result;
      }
      await c.query("SAVEPOINT premium_action");
      let r: PremiumResult = {
        commandId: cmd.commandId,
        status: "applied",
        code: "OK",
      };
      try {
        const intentId = await this.apply(c, id, cmd, proof);
        if (intentId) r.intentId = intentId;
        await this.online.identity(token, c);
      } catch (error) {
        await c.query("ROLLBACK TO SAVEPOINT premium_action");
        if (error instanceof OnlineError)
          r = {
            commandId: cmd.commandId,
            status: "rejected",
            code: error.code,
          };
        else if (error instanceof Error && error.message === "BALANCE_LIMIT")
          r = {
            commandId: cmd.commandId,
            status: "rejected",
            code: "BALANCE_LIMIT",
          };
        else throw error;
      }
      await c.query("RELEASE SAVEPOINT premium_action");
      await c.query("INSERT INTO akai_premium_commands VALUES($1,$2,$3,$4)", [
        id,
        cmd.commandId,
        hash,
        r,
      ]);
      await this.audit(c, id, cmd.type, {
        commandId: cmd.commandId,
        result: r,
      });
      return r;
    });
  }
  async adPolicy(c: PoolClient, id: string, reward: string) {
    const now = this.online.clock();
    const rows = (
      await c.query(
        "SELECT created_at,product_id FROM akai_premium_intents WHERE account_id=$1 AND kind='ad' AND created_at>$2 ORDER BY created_at DESC",
        [id, now - DAY],
      )
    ).rows;
    rule(rows.length < 8, "AD_DAILY_LIMIT");
    rule(
      !rows.length || now - Number(rows[0].created_at) >= 300000,
      "AD_COOLDOWN",
    );
    rule(
      !(
        await c.query(
          "SELECT 1 FROM akai_premium_intents WHERE account_id=$1 AND kind='ad' AND state='created' AND expires_at>$2",
          [id, now],
        )
      ).rowCount,
      "AD_ALREADY_PENDING",
    );
    rule(
      !(
        await c.query(
          "SELECT 1 FROM akai_ad_benefits WHERE account_id=$1 AND kind=$2 AND end_at>$3",
          [id, reward, now],
        )
      ).rowCount,
      "BONUS_ALREADY_ACTIVE",
    );
  }
  async apply(
    c: PoolClient,
    id: string,
    cmd: PremiumCommand,
    proof?: VerifiedPurchase,
  ): Promise<string | undefined> {
    const now = this.online.clock();
    if (cmd.type === "restore") return;
    if (cmd.type === "intent.cancel") {
      const r = await c.query(
        "UPDATE akai_premium_intents SET state='cancelled' WHERE id=$1 AND account_id=$2 AND state='created' RETURNING id",
        [cmd.intentId, id],
      );
      rule(r.rowCount, "INTENT_NOT_CANCELLABLE");
      return cmd.intentId;
    }
    if (cmd.type === "purchase.intent" || cmd.type === "ad.intent") {
      const a = await this.online.lockAccount(c, id),
        before = structuredClone(a.snapshot);
      await this.online.settle(c, a);
      rule(a.snapshot.battle.highest >= 1, "COMPLETE_FLOOR_ONE");
      let product: string,
        value = 0;
      if (cmd.type === "purchase.intent") {
        product = cmd.productId;
        rule(
          !(
            await c.query(
              "SELECT 1 FROM akai_premium_intents WHERE account_id=$1 AND kind='purchase' AND state IN ('created','pending') AND expires_at>$2",
              [id, now],
            )
          ).rowCount,
          "PURCHASE_ALREADY_PENDING",
        );
        if (product === "title_miner")
          rule(
            !(
              await c.query(
                "SELECT 1 FROM akai_entitlements WHERE account_id=$1 AND product_id=$2 AND active",
                [id, product],
              )
            ).rowCount,
            "ALREADY_OWNED",
          );
      } else {
        rule(
          this.config.MONETIZATION_MODE === "sandbox",
          "AD_NATIVE_PROVIDER_REQUIRED",
        );
        await this.adPolicy(c, id, cmd.reward);
        product = cmd.reward;
        if (product === "coins")
          value =
            Math.min(
              1000000,
              Math.max(
                30,
                floorStats(Math.max(1, a.snapshot.battle.highest)).coin * 10,
              ),
            ) * 1000;
      }
      const intentId = randomUUID();
      await c.query(
        "INSERT INTO akai_premium_intents(id,account_id,kind,product_id,created_at,expires_at,reward_value) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          intentId,
          id,
          cmd.type === "ad.intent" ? "ad" : "purchase",
          product,
          now,
          now + (cmd.type === "ad.intent" ? 600000 : 1800000),
          value,
        ],
      );
      await this.online.save(c, a, before, "premium:intent:" + intentId);
      return intentId;
    }
    const intent = (
      await c.query(
        "SELECT * FROM akai_premium_intents WHERE id=$1 AND account_id=$2 FOR UPDATE",
        [cmd.intentId, id],
      )
    ).rows[0];
    rule(intent && intent.kind === "purchase", "INTENT_NOT_FOUND");
    rule(
      proof &&
        proof.accountBinding === accountBinding(id) &&
        proof.productId === intent.product_id,
      "RECEIPT_BINDING_MISMATCH",
    );
    // An expired checkout can still deliver an authentic completed purchase. Never strand paid content.
    await this.accept(c, id, cmd.purchaseToken, proof, intent);
    return intent.id;
  }
  async accept(
    c: PoolClient,
    id: string,
    token: string,
    proof: VerifiedPurchase,
    intent?: any,
  ) {
    rule(
      proof.test && proof.accountBinding === accountBinding(id),
      "RECEIPT_BINDING_MISMATCH",
    );
    rule(
      !(
        await c.query(
          "SELECT 1 FROM akai_profiles WHERE account_id=$1 AND suspended",
          [id],
        )
      ).rowCount,
      "ACCOUNT_SUSPENDED",
    );
    const isAd = intent?.kind === "ad" || proof.productId.startsWith("ad:");
    const productId = isAd
      ? (intent?.product_id ?? proof.productId.slice(3))
      : proof.productId;
    if (!isAd)
      rule(
        PREMIUM_PRODUCTS.some((p) => p.id === productId),
        "UNKNOWN_PRODUCT",
      );
    else RewardedTypeSchema.parse(productId);
    const hash = digest(this.provider!.name + ":" + token),
      old = (
        await c.query(
          "SELECT * FROM akai_purchases WHERE token_hash=$1 FOR UPDATE",
          [hash],
        )
      ).rows[0];
    rule(!old || old.account_id === id, "RECEIPT_ALREADY_USED");
    rule(
      !old ||
        (old.product_id === productId && old.provider === this.provider!.name),
      "RECEIPT_BINDING_MISMATCH",
    );
    if (old?.state === "revoked") {
      await c.query("UPDATE akai_purchases SET verified_at=$2 WHERE id=$1", [
        old.id,
        this.online.clock(),
      ]);
      return;
    }
    const now = this.online.clock(),
      purchaseId = old?.id ?? randomUUID(),
      state = proof.state;
    if (!old) {
      await c.query(
        "INSERT INTO akai_purchases(id,intent_id,account_id,provider,token_hash,token_cipher,product_id,kind,state,created_at,verified_at) VALUES($1,$10,$2,$3,$4,$5,$6,$7,$8,$9,$9)",
        [
          purchaseId,
          id,
          this.provider!.name,
          hash,
          encryptToken(token, this.config.MONETIZATION_KEY!),
          productId,
          isAd ? "ad" : "purchase",
          state === "CANCELLED" ? "cancelled" : "pending",
          now,
          intent?.id ?? null,
        ],
      );
    }
    if (state === "PENDING") {
      if (intent)
        await c.query(
          "UPDATE akai_premium_intents SET state='pending' WHERE id=$1",
          [intent.id],
        );
      await c.query("UPDATE akai_purchases SET verified_at=$2 WHERE id=$1", [
        purchaseId,
        now,
      ]);
      return;
    }
    if (state === "CANCELLED") {
      if (old?.state === "granted") await this.revoke(c, old);
      else
        await c.query(
          "UPDATE akai_purchases SET state='cancelled',verified_at=$2 WHERE id=$1",
          [purchaseId, now],
        );
      if (intent)
        await c.query(
          "UPDATE akai_premium_intents SET state='cancelled' WHERE id=$1",
          [intent.id],
        );
      return;
    }
    if (old?.state === "granted") {
      await c.query("UPDATE akai_purchases SET verified_at=$2 WHERE id=$1", [
        purchaseId,
        now,
      ]);
      if (intent)
        await c.query(
          "UPDATE akai_premium_intents SET state='granted' WHERE id=$1",
          [intent.id],
        );
      return;
    }
    rule(old?.state !== "cancelled", "PURCHASE_CANCELLED");
    const a = await this.online.lockAccount(c, id),
      before = structuredClone(a.snapshot);
    await this.online.settle(c, a);
    let amount = 0n,
      grantKind = "entitlement";
    if (isAd) {
      rule(intent, "AD_INTENT_REQUIRED");
      rule(now < Number(intent.expires_at), "AD_EXPIRED");
      if (productId === "coins") {
        amount = BigInt(intent.reward_value);
        addResource(a.snapshot, "coin", amount);
        grantKind = "ad.coins";
      } else {
        await c.query("INSERT INTO akai_ad_benefits VALUES($1,$2,$3,$4,$5)", [
          purchaseId,
          id,
          productId,
          now,
          now + 120000,
        ]);
        grantKind = "ad." + productId;
      }
    } else {
      const product = PREMIUM_PRODUCTS.find((p) => p.id === productId)!;
      if (product.kind === "consumable") {
        amount = BigInt(product.rubies) * 1000n;
        const debt = BigInt(
          (
            await c.query(
              "SELECT ruby FROM akai_premium_debts WHERE account_id=$1",
              [id],
            )
          ).rows[0]?.ruby ?? 0,
        );
        const paid = debt < amount ? debt : amount;
        const ruby = BigInt(a.snapshot.balances.ruby) + amount - paid;
        rule(ruby < 10n ** 38n, "BALANCE_LIMIT");
        a.snapshot.balances.ruby = String(ruby);
        if (paid)
          await c.query(
            "UPDATE akai_premium_debts SET ruby=ruby-$2 WHERE account_id=$1",
            [id, String(paid)],
          );
        grantKind = "ruby";
      } else {
        rule(
          !(
            await c.query(
              "SELECT 1 FROM akai_entitlements WHERE account_id=$1 AND product_id=$2 AND active",
              [id, productId],
            )
          ).rowCount,
          "ALREADY_OWNED",
        );
        await c.query("INSERT INTO akai_entitlements VALUES($1,$2,$3,true)", [
          id,
          productId,
          purchaseId,
        ]);
      }
    }
    await c.query("INSERT INTO akai_premium_grants VALUES($1,$2,$3,$4,$5)", [
      purchaseId,
      id,
      grantKind,
      String(amount),
      now,
    ]);
    await c.query(
      "UPDATE akai_purchases SET state='granted',amount=$2,verified_at=$3 WHERE id=$1",
      [purchaseId, String(amount), now],
    );
    if (intent)
      await c.query(
        "UPDATE akai_premium_intents SET state='granted' WHERE id=$1",
        [intent.id],
      );
    await this.online.save(c, a, before, "premium:grant:" + purchaseId);
    await this.audit(c, id, "grant", {
      purchaseId,
      productId,
      kind: grantKind,
      amount: String(amount),
    });
  }
  async revoke(c: PoolClient, p: any) {
    const a = await this.online.lockAccount(c, p.account_id),
      before = structuredClone(a.snapshot);
    await this.online.settle(c, a);
    const now = this.online.clock();
    if (p.kind === "purchase" && p.product_id !== "title_miner") {
      const amount = BigInt(p.amount),
        available = BigInt(a.snapshot.balances.ruby),
        deduct = available < amount ? available : amount;
      a.snapshot.balances.ruby = String(available - deduct);
      await c.query(
        "INSERT INTO akai_premium_debts VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET ruby=akai_premium_debts.ruby+excluded.ruby",
        [p.account_id, String(amount - deduct)],
      );
      await c.query("INSERT INTO akai_premium_grants VALUES($1,$2,$3,$4,$5)", [
        p.id + ":revoked",
        p.account_id,
        "ruby.reversal",
        String(-amount),
        now,
      ]);
    }
    await c.query(
      "UPDATE akai_premium_intents SET state='revoked' WHERE id=$1",
      [p.intent_id],
    );
    await c.query("UPDATE akai_entitlements SET active=false WHERE source=$1", [
      p.id,
    ]);
    await c.query("DELETE FROM akai_ad_benefits WHERE source=$1", [p.id]);
    await c.query(
      "UPDATE akai_purchases SET state='revoked',verified_at=$2 WHERE id=$1",
      [p.id, now],
    );
    await this.online.save(c, a, before, "premium:revoke:" + p.id);
    await this.audit(c, p.account_id, "revoke", {
      purchaseId: p.id,
      amount: p.amount,
    });
  }
  async reconcileRow(row: any) {
    const token = decryptToken(row.token_cipher, this.config.MONETIZATION_KEY!),
      proof = await this.provider!.verify(token);
    await this.online.db.transaction(async (c) => {
      await this.global(c);
      const suspended = (
        await c.query(
          "SELECT suspended FROM akai_profiles WHERE account_id=$1",
          [row.account_id],
        )
      ).rows[0]?.suspended;
      if (suspended) return;
      const intent = (
        await c.query("SELECT * FROM akai_premium_intents WHERE id=$1", [
          row.intent_id,
        ])
      ).rows[0];
      await this.accept(c, row.account_id, token, proof, intent);
    });
    const current = (
      await this.online.db.pool.query(
        "SELECT * FROM akai_purchases WHERE id=$1",
        [row.id],
      )
    ).rows[0];
    if (current.state === "granted" && current.delivery !== "done") {
      await this.provider!.finalize(
        token,
        current.product_id,
        PREMIUM_PRODUCTS.find((p) => p.id === current.product_id)?.kind ===
          "consumable",
      );
      await this.online.db.pool.query(
        "UPDATE akai_purchases SET delivery='done' WHERE id=$1 AND state='granted'",
        [row.id],
      );
    }
  }
  async restore(id: string) {
    if (this.provider instanceof SandboxProvider) {
      const missing = (
        await this.online.db.pool.query(
          "SELECT s.* FROM akai_sandbox_receipts s LEFT JOIN akai_purchases p ON p.intent_id=s.intent_id WHERE s.account_id=$1 AND s.kind='purchase' AND p.id IS NULL ORDER BY s.at,s.id LIMIT 50",
          [id],
        )
      ).rows;
      for (const receipt of missing.slice(0, 50)) {
        const receiptToken = decryptToken(
          receipt.token_cipher,
          this.config.MONETIZATION_KEY!,
        );
        const proof = await this.provider.verify(receiptToken);
        await this.online.db.transaction(async (c) => {
          await this.global(c);
          const intent = (
            await c.query("SELECT * FROM akai_premium_intents WHERE id=$1", [
              receipt.intent_id,
            ])
          ).rows[0];
          await this.accept(c, id, receiptToken, proof, intent);
        });
      }
    }
    const rows = (
      await this.online.db.pool.query(
        "SELECT * FROM akai_purchases WHERE account_id=$1 AND state IN ('pending','granted') ORDER BY verified_at LIMIT 50",
        [id],
      )
    ).rows;
    for (const row of rows) await this.reconcileRow(row);
  }
  async tick() {
    if (!this.provider) return { processed: 0, failed: 0 };
    const rows = (
      await this.online.db.pool.query(
        "SELECT * FROM akai_purchases WHERE state IN ('pending','granted') AND next_retry_at<=$1 ORDER BY verified_at,id LIMIT 5",
        [this.online.clock()],
      )
    ).rows;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.reconcileRow(row);
        await this.online.db.pool.query(
          "UPDATE akai_purchases SET attempts=0,next_retry_at=0 WHERE id=$1",
          [row.id],
        );
      } catch {
        failed++;
        await this.online.db.transaction(async (c) => {
          await c.query(
            "UPDATE akai_purchases SET attempts=attempts+1,next_retry_at=$2 WHERE id=$1",
            [
              row.id,
              this.online.clock() +
                Math.min(
                  900000,
                  1000 * 2 ** Math.min(Number(row.attempts) + 1, 10),
                ),
            ],
          );
          await this.audit(c, row.account_id, "provider.retry", {
            purchaseId: row.id,
          });
        });
      }
    }
    return { processed: rows.length, failed };
  }
  async simulate(token: string, intentId: string) {
    rule(this.provider instanceof SandboxProvider, "SANDBOX_ONLY");
    const id = await this.identity(token);
    const i = (
      await this.online.db.pool.query(
        "SELECT * FROM akai_premium_intents WHERE id=$1 AND account_id=$2",
        [intentId, id],
      )
    ).rows[0];
    rule(i, "INTENT_NOT_FOUND");
    rule(i.state !== "cancelled", "INTENT_CANCELLED");
    rule(this.online.clock() < Number(i.expires_at), "INTENT_EXPIRED");
    if (i.kind === "ad")
      rule(
        this.online.clock() >= Number(i.created_at) + 5000,
        "SANDBOX_AD_NOT_FINISHED",
      );
    const proofToken = await this.provider.issue(i);
    if (i.kind === "purchase") return { purchaseToken: proofToken };
    const proof = await this.provider.verify(proofToken);
    await this.online.db.transaction(async (c) => {
      await this.global(c);
      await this.online.identity(token, c);
      await new CommunityService(this.online).profile(c, id);
      const intent = (
        await c.query(
          "SELECT * FROM akai_premium_intents WHERE id=$1 FOR UPDATE",
          [i.id],
        )
      ).rows[0];
      await this.accept(c, id, proofToken, proof, intent);
    });
    return { confirmed: true };
  }
  async read(token: string): Promise<PremiumView> {
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      const id = await this.online.identity(token, c);
      await new CommunityService(this.online).profile(c, id);
      const a = await this.online.lockAccount(c, id),
        now = this.online.clock();
      const intents = (
        await c.query(
          "SELECT * FROM akai_premium_intents WHERE account_id=$1 ORDER BY created_at DESC LIMIT 30",
          [id],
        )
      ).rows;
      const purchases = (
        await c.query(
          "SELECT id,product_id,state,delivery,created_at FROM akai_purchases WHERE account_id=$1 ORDER BY created_at DESC LIMIT 50",
          [id],
        )
      ).rows;
      const benefits = (
        await c.query(
          "SELECT * FROM akai_ad_benefits WHERE account_id=$1 AND end_at>$2",
          [id, now],
        )
      ).rows;
      const ads = (
        await c.query(
          "SELECT created_at FROM akai_premium_intents WHERE account_id=$1 AND kind='ad' AND created_at>$2 ORDER BY created_at DESC",
          [id, now - DAY],
        )
      ).rows;
      return {
        version: MONETIZATION_VERSION,
        mode: this.config.MONETIZATION_MODE,
        accountId: id,
        accountBinding: accountBinding(id),
        serverTime: now,
        catalog: PREMIUM_PRODUCTS,
        intents: intents.map((r) => ({
          id: r.id,
          kind: r.kind,
          productId: r.product_id,
          state: r.state,
          createdAt: Number(r.created_at),
          expiresAt: Number(r.expires_at),
        })),
        purchases: purchases.map((r) => ({
          id: r.id,
          productId: r.product_id,
          state: r.state,
          delivery: r.delivery,
          at: Number(r.created_at),
        })),
        entitlements: (
          await c.query(
            "SELECT DISTINCT product_id FROM akai_entitlements WHERE account_id=$1 AND active",
            [id],
          )
        ).rows.map((r) => r.product_id),
        benefits: benefits.map((r) => ({
          kind: r.kind,
          start: Number(r.start_at),
          end: Number(r.end_at),
        })),
        rubyBalance: a.snapshot.balances.ruby,
        rubyDebt: String(
          (
            await c.query(
              "SELECT ruby FROM akai_premium_debts WHERE account_id=$1",
              [id],
            )
          ).rows[0]?.ruby ?? 0,
        ),
        adNextAt: ads[0] ? Number(ads[0].created_at) + 300000 : 0,
        adUsed: ads.length,
      };
    });
  }
}
