import {
  randomUUID,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import { readFile } from "node:fs/promises";
import { SignJWT, jwtVerify, importPKCS8 } from "jose";
import { z } from "zod";
import type { Database } from "./database.js";
import { digest, OnlineError } from "./online.js";
import type { ServerConfig } from "./config.js";
export interface VerifiedPurchase {
  reference: string;
  accountBinding: string;
  productId: string;
  state: "PENDING" | "PURCHASED" | "CANCELLED";
  test: true;
  finalized: boolean;
}
export interface PurchaseProvider {
  readonly name: "sandbox" | "google-play-test";
  verify(token: string): Promise<VerifiedPurchase>;
  finalize(
    token: string,
    productId: string,
    consumable: boolean,
  ): Promise<void>;
}
export const accountBinding = (id: string) =>
  digest("akai-premium-test-v1:" + id);
export function encryptToken(token: string, key: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "hex"), iv);
  const bytes = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    bytes.toString("base64url"),
  ].join(".");
}
export function decryptToken(value: string, key: string) {
  const [iv, tag, data] = value.split(".");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "hex"),
    Buffer.from(iv!, "base64url"),
  );
  cipher.setAuthTag(Buffer.from(tag!, "base64url"));
  return Buffer.concat([
    cipher.update(Buffer.from(data!, "base64url")),
    cipher.final(),
  ]).toString("utf8");
}
export class SandboxProvider implements PurchaseProvider {
  readonly name = "sandbox";
  constructor(
    readonly db: Database,
    readonly key: string,
    readonly clock = Date.now,
  ) {}
  async issue(intent: {
    id: string;
    account_id: string;
    product_id: string;
    kind: string;
  }) {
    return this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(41652006)");
      const old = (
        await c.query(
          "SELECT token_cipher FROM akai_sandbox_receipts WHERE intent_id=$1",
          [intent.id],
        )
      ).rows[0];
      if (old) return decryptToken(old.token_cipher, this.key);
      const id = randomUUID();
      const token = await new SignJWT({
        test: true,
        product: intent.product_id,
        kind: intent.kind,
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuer("akai-explicit-sandbox")
        .setAudience("akai-test-backend")
        .setSubject(accountBinding(intent.account_id))
        .setJti(id)
        .sign(Buffer.from(this.key, "hex"));
      await c.query(
        "INSERT INTO akai_sandbox_receipts(id,account_id,intent_id,product_id,state,kind,token_cipher,at) VALUES($1,$2,$3,$4,'PURCHASED',$5,$6,$7)",
        [
          id,
          intent.account_id,
          intent.id,
          intent.product_id,
          intent.kind,
          encryptToken(token, this.key),
          this.clock(),
        ],
      );
      return token;
    });
  }
  async verify(token: string): Promise<VerifiedPurchase> {
    let p;
    try {
      p = (
        await jwtVerify(token, Buffer.from(this.key, "hex"), {
          algorithms: ["HS256"],
          issuer: "akai-explicit-sandbox",
          audience: "akai-test-backend",
          requiredClaims: ["jti", "sub"],
        })
      ).payload;
    } catch {
      throw new OnlineError("INVALID_PURCHASE_PROOF", 422);
    }
    const row = (
      await this.db.pool.query(
        "SELECT * FROM akai_sandbox_receipts WHERE id=$1",
        [z.uuid().parse(p.jti)],
      )
    ).rows[0];
    if (
      !row ||
      decryptToken(row.token_cipher, this.key) !== token ||
      p.test !== true ||
      p.sub !== accountBinding(row.account_id) ||
      p.product !== row.product_id
    )
      throw new OnlineError("INVALID_PURCHASE_PROOF");
    return {
      reference: row.id,
      accountBinding: p.sub,
      productId: row.product_id,
      state: row.state,
      test: true,
      finalized: row.finalized,
    };
  }
  async finalize(token: string) {
    const verified = await this.verify(token);
    await this.db.pool.query(
      "UPDATE akai_sandbox_receipts SET finalized=true WHERE id=$1",
      [verified.reference],
    );
  }
  async setState(
    reference: string,
    state: "PENDING" | "PURCHASED" | "CANCELLED",
    operator: string,
    reason: string,
  ) {
    z.uuid().parse(reference);
    z.string().min(3).max(80).parse(operator);
    z.string().min(5).max(300).parse(reason);
    await this.db.transaction(async (c) => {
      await c.query("SELECT pg_advisory_xact_lock(41652006)");
      const r = await c.query(
        "UPDATE akai_sandbox_receipts SET state=$2 WHERE id=$1 RETURNING id",
        [reference, state],
      );
      if (!r.rowCount) throw new OnlineError("NOT_FOUND");
      await c.query("INSERT INTO akai_premium_audit VALUES($1,$2,$3,$4,$5)", [
        randomUUID(),
        operator,
        "sandbox.provider-state",
        { reference, state, reason },
        this.clock(),
      ]);
    });
  }
}
const playResponse = z
  .object({
    productLineItem: z
      .array(
        z
          .object({
            productId: z.string(),
            productOfferDetails: z
              .object({
                quantity: z.number().int(),
                refundableQuantity: z.number().int().optional(),
                consumptionState: z.string().optional(),
              })
              .passthrough(),
          })
          .passthrough(),
      )
      .length(1),
    purchaseStateContext: z.object({
      purchaseState: z.enum(["PENDING", "PURCHASED", "CANCELLED"]),
    }),
    testPurchaseContext: z.object({ fopType: z.literal("TEST") }),
    obfuscatedExternalAccountId: z.string().min(20),
    acknowledgementState: z.string().optional(),
    orderId: z.string().optional(),
  })
  .passthrough();
export class GooglePlayTestProvider implements PurchaseProvider {
  readonly name = "google-play-test";
  private access?: { token: string; until: number };
  constructor(
    readonly config: ServerConfig,
    readonly request: typeof fetch = fetch,
    readonly clock = Date.now,
  ) {}
  async accessToken() {
    if (this.access && this.access.until > this.clock())
      return this.access.token;
    const credentials = z
      .object({ client_email: z.email(), private_key: z.string() })
      .parse(
        JSON.parse(
          await readFile(this.config.PLAY_SERVICE_ACCOUNT_FILE!, "utf8"),
        ),
      );
    const assertion = await new SignJWT({
      scope: "https://www.googleapis.com/auth/androidpublisher",
    })
      .setProtectedHeader({ alg: "RS256" })
      .setIssuer(credentials.client_email)
      .setAudience("https://oauth2.googleapis.com/token")
      .setIssuedAt(Math.floor(this.clock() / 1000))
      .setExpirationTime(Math.floor(this.clock() / 1000) + 3600)
      .sign(await importPKCS8(credentials.private_key, "RS256"));
    const r = await this.request("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw new OnlineError("PROVIDER_UNAVAILABLE", 503);
    const data = z
      .object({
        access_token: z.string().min(10),
        expires_in: z.number().positive(),
      })
      .parse(await r.json());
    this.access = {
      token: data.access_token,
      until: this.clock() + Math.min(data.expires_in * 1000 - 60000, 3300000),
    };
    return data.access_token;
  }
  async call(path: string, method = "GET", body?: string) {
    const r = await this.request(
      "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/" +
        encodeURIComponent(this.config.PLAY_PACKAGE_NAME!) +
        path,
      {
        method,
        headers: {
          Authorization: "Bearer " + (await this.accessToken()),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body } : {}),
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!r.ok)
      throw new OnlineError(
        r.status === 404 ? "INVALID_PURCHASE_PROOF" : "PROVIDER_UNAVAILABLE",
        r.status === 404 ? 422 : 503,
      );
    return r;
  }
  async verify(token: string): Promise<VerifiedPurchase> {
    const r = await this.call(
      "/purchases/productsv2/tokens/" + encodeURIComponent(token),
    );
    const p = playResponse.safeParse(await r.json());
    if (!p.success) throw new OnlineError("NON_TEST_OR_INVALID_PURCHASE");
    const v = p.data,
      line = v.productLineItem[0]!;
    if (
      line.productOfferDetails.quantity !== 1 ||
      (line.productOfferDetails.refundableQuantity !== undefined &&
        ![0, 1].includes(line.productOfferDetails.refundableQuantity))
    )
      throw new OnlineError("UNSUPPORTED_PURCHASE_QUANTITY");
    return {
      reference: digest("play:" + token),
      accountBinding: v.obfuscatedExternalAccountId,
      productId: line.productId,
      state:
        v.purchaseStateContext.purchaseState === "PURCHASED" &&
        line.productOfferDetails.refundableQuantity === 0
          ? "CANCELLED"
          : v.purchaseStateContext.purchaseState,
      test: true,
      finalized:
        v.acknowledgementState === "ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED" ||
        line.productOfferDetails.consumptionState ===
          "CONSUMPTION_STATE_CONSUMED",
    };
  }
  async finalize(token: string, productId: string, consumable: boolean) {
    const v = await this.verify(token);
    if (v.productId !== productId)
      throw new OnlineError("RECEIPT_BINDING_MISMATCH");
    if (v.state !== "PURCHASED" || v.finalized) return;
    await this.call(
      "/purchases/products/" +
        encodeURIComponent(productId) +
        "/tokens/" +
        encodeURIComponent(token) +
        (consumable ? ":consume" : ":acknowledge"),
      "POST",
      consumable ? undefined : "{}",
    );
  }
}
// Signature verifier for a future native AdMob transport. It grants nothing on its own.
export async function verifyAdMobSSV(
  rawQuery: string,
  keys: Map<string, string>,
) {
  if (rawQuery.length > 12000) throw new OnlineError("INVALID_SSV");
  const match = /^(.+)&signature=([A-Za-z0-9_%-]+)&key_id=(\d+)$/.exec(
    rawQuery,
  );
  if (!match) throw new OnlineError("INVALID_SSV");
  const signed = match[1]!,
    params = new URLSearchParams(rawQuery),
    all = [...params.keys()];
  if (new Set(all).size !== all.length) throw new OnlineError("INVALID_SSV");
  const pem = keys.get(match[3]!);
  if (
    !pem ||
    !verifySignature(
      "sha256",
      Buffer.from(signed),
      createPublicKey(pem),
      Buffer.from(decodeURIComponent(match[2]!), "base64url"),
    )
  )
    throw new OnlineError("INVALID_SSV");
  return z
    .object({
      custom_data: z.uuid(),
      transaction_id: z.string().min(1).max(200),
      ad_unit: z.string().min(1),
      timestamp: z.coerce.number().int().positive(),
      reward_amount: z.literal("1"),
      reward_item: z.literal("akai_reward"),
    })
    .parse(Object.fromEntries(params));
}
