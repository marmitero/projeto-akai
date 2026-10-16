import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign, randomUUID } from "node:crypto";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  encryptToken,
  decryptToken,
  GooglePlayTestProvider,
  verifyAdMobSSV,
} from "./premium-providers.js";
import { parseServerConfig } from "./config.js";
import { PremiumCommandSchema } from "@akai/shared";
const key = "ab".repeat(32);
describe("premium validation adapters", () => {
  it("authenticates encrypted receipts and rejects ciphertext tampering", () => {
    const x = encryptToken("sensitive-purchase-token", key);
    expect(x).not.toContain("sensitive");
    expect(decryptToken(x, key)).toBe("sensitive-purchase-token");
    expect(encryptToken("sensitive-purchase-token", key)).not.toBe(x);
    expect(() => decryptToken(x, "cd".repeat(32))).toThrow();
  });
  it("default off; sandbox requires nonproduction, isolated database and loopback", () => {
    expect(parseServerConfig({}).MONETIZATION_MODE).toBe("off");
    for (const override of [
      { NODE_ENV: "production" },
      { PUBLIC_ORIGIN: "https://example.com", COOKIE_SECURE: "true" },
      { HOST: "0.0.0.0" },
      { MONETIZATION_TEST_DATABASE: "false" },
    ])
      expect(() =>
        parseServerConfig({
          MONETIZATION_MODE: "sandbox",
          MONETIZATION_TEST_DATABASE: "true",
          MONETIZATION_KEY: key,
          ...override,
        }),
      ).toThrow();
  });
  it("rejects client-granted balances, untyped booleans and unknown products", () => {
    expect(
      PremiumCommandSchema.safeParse({
        type: "purchase.intent",
        commandId: randomUUID(),
        productId: "ruby_handful",
        rubies: 9999,
      }).success,
    ).toBe(false);
    expect(
      PremiumCommandSchema.safeParse({
        type: "ad.complete",
        commandId: randomUUID(),
        watched: true,
      }).success,
    ).toBe(false);
    expect(
      PremiumCommandSchema.safeParse({
        type: "purchase.intent",
        commandId: randomUUID(),
        productId: "permanent_damage",
      }).success,
    ).toBe(false);
  });
  it("verifies AdMob DER ECDSA over original raw query; rejects changes, duplicates and unknown key", async () => {
    const pair = generateKeyPairSync("ec", { namedCurve: "prime256v1" }),
      pub = pair.publicKey.export({ format: "pem", type: "spki" }).toString(),
      keys = new Map([["123", pub]]),
      intent = randomUUID();
    const signed = `ad_unit=test-unit&custom_data=${intent}&reward_amount=1&reward_item=akai_reward&timestamp=1800000000000&transaction_id=unique-1`;
    const query =
      signed +
      "&signature=" +
      sign("sha256", Buffer.from(signed), pair.privateKey).toString(
        "base64url",
      ) +
      "&key_id=123";
    expect((await verifyAdMobSSV(query, keys)).custom_data).toBe(intent);
    await expect(
      verifyAdMobSSV(query.replace("reward_amount=1", "reward_amount=9"), keys),
    ).rejects.toThrow();
    await expect(verifyAdMobSSV(query, new Map())).rejects.toThrow();
    await expect(verifyAdMobSSV(query + "&key_id=123", keys)).rejects.toThrow();
  });
  it("queries trusted Play API with service-account OAuth, requires test context/quantity and finalizes by product type", async () => {
    const dir = await mkdtemp(join(tmpdir(), "akai-f8-")),
      pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const path = join(dir, "credentials.json");
    await writeFile(
      path,
      JSON.stringify({
        client_email: "service@example.com",
        private_key: pair.privateKey
          .export({ type: "pkcs8", format: "pem" })
          .toString(),
      }),
    );
    let body: any = {
      productLineItem: [
        {
          productId: "ruby_handful",
          productOfferDetails: {
            quantity: 1,
            refundableQuantity: 1,
            consumptionState: "CONSUMPTION_STATE_YET_TO_BE_CONSUMED",
          },
        },
      ],
      purchaseStateContext: { purchaseState: "PURCHASED" },
      testPurchaseContext: { fopType: "TEST" },
      obfuscatedExternalAccountId: "bound-account-hash-123456",
      acknowledgementState: "ACKNOWLEDGEMENT_STATE_PENDING",
    };
    const urls: string[] = [];
    let available = true;
    const request: typeof fetch = async (input, init) => {
      const url = String(input);
      urls.push(url);
      if (url === "https://oauth2.googleapis.com/token") {
        expect(String(init?.body)).toContain("assertion=");
        return Response.json({
          access_token: "server-oauth-only-token",
          expires_in: 3600,
        });
      }
      expect((init?.headers as any).Authorization).toBe(
        "Bearer server-oauth-only-token",
      );
      if (!available) return new Response("", { status: 503 });
      if (init?.method === "POST") return new Response(null, { status: 204 });
      return Response.json(body);
    };
    try {
      const config = parseServerConfig({
        NODE_ENV: "test",
        MONETIZATION_MODE: "google-play-test",
        MONETIZATION_TEST_DATABASE: "true",
        MONETIZATION_KEY: key,
        PLAY_PACKAGE_NAME: "com.example.akai",
        PLAY_SERVICE_ACCOUNT_FILE: path,
      });
      const provider = new GooglePlayTestProvider(config, request);
      const p = await provider.verify("opaque-token-1234567890");
      expect(p.state).toBe("PURCHASED");
      expect(p.test).toBe(true);
      await provider.finalize("opaque-token-1234567890", "ruby_handful", true);
      expect(urls.some((u) => u.endsWith(":consume"))).toBe(true);
      body.productLineItem[0].productId = "title_miner";
      await provider.finalize("opaque-token-1234567890", "title_miner", false);
      body.productLineItem[0].productId = "ruby_handful";
      expect(urls.some((u) => u.endsWith(":acknowledge"))).toBe(true);
      const original = structuredClone(body);
      delete body.testPurchaseContext;
      await expect(provider.verify("opaque-token-1234567890")).rejects.toThrow(
        "NON_TEST_OR_INVALID_PURCHASE",
      );
      body = structuredClone(original);
      body.productLineItem[0].productOfferDetails.quantity = 2;
      await expect(provider.verify("opaque-token-1234567890")).rejects.toThrow(
        "UNSUPPORTED_PURCHASE_QUANTITY",
      );
      body = structuredClone(original);
      body.productLineItem[0].productOfferDetails.refundableQuantity = 0;
      expect((await provider.verify("opaque-token-1234567890")).state).toBe(
        "CANCELLED",
      );
      body.purchaseStateContext.purchaseState = "PENDING";
      expect((await provider.verify("opaque-token-1234567890")).state).toBe(
        "PENDING",
      );
      available = false;
      await expect(provider.verify("opaque-token-1234567890")).rejects.toThrow(
        "PROVIDER_UNAVAILABLE",
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
