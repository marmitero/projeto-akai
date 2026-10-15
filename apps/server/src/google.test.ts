import { describe, it, expect } from "vitest";
import { generateKeyPair, exportJWK, createLocalJWKSet, SignJWT } from "jose";
import { googleVerifier } from "./google.js";
describe("Google ID token verification", () => {
  it("verifies signature, audience, issuer, expiry, nonce and token age", async () => {
    const { privateKey, publicKey } = await generateKeyPair("RS256");
    const jwk = await exportJWK(publicKey);
    jwk.kid = "test";
    const verify = googleVerifier(createLocalJWKSet({ keys: [jwk] }));
    const sign = (
      aud = "akai-test",
      iss = "https://accounts.google.com",
      exp = "5m",
      nonce: string | undefined = "nonce",
    ) =>
      new SignJWT({ ...(nonce ? { nonce } : {}) })
        .setProtectedHeader({ alg: "RS256", kid: "test" })
        .setSubject("google-user")
        .setAudience(aud)
        .setIssuer(iss)
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(privateKey);
    expect(await verify(await sign(), "akai-test")).toEqual({
      sub: "google-user",
      nonce: "nonce",
    });
    await expect(verify(await sign("other"), "akai-test")).rejects.toThrow();
    await expect(
      verify(await sign("akai-test", "https://evil.example"), "akai-test"),
    ).rejects.toThrow();
    await expect(
      verify(
        await sign("akai-test", "https://accounts.google.com", "-1s"),
        "akai-test",
      ),
    ).rejects.toThrow();
    await expect(
      verify(
        await sign("akai-test", "https://accounts.google.com", "5m", ""),
        "akai-test",
      ),
    ).rejects.toThrow();
    const noExpiry = await new SignJWT({ nonce: "nonce" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setSubject("google-user")
      .setAudience("akai-test")
      .setIssuer("https://accounts.google.com")
      .setIssuedAt()
      .sign(privateKey);
    await expect(verify(noExpiry, "akai-test")).rejects.toThrow();
    const old = await new SignJWT({ nonce: "nonce" })
      .setProtectedHeader({ alg: "RS256", kid: "test" })
      .setSubject("google-user")
      .setAudience("akai-test")
      .setIssuer("https://accounts.google.com")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 600)
      .setExpirationTime("5m")
      .sign(privateKey);
    await expect(verify(old, "akai-test")).rejects.toThrow();
    const token = await sign();
    await expect(
      verify(token.slice(0, -8) + "AAAAAAAA", "akai-test"),
    ).rejects.toThrow();
  });
});
