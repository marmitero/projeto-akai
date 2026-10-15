import { createRemoteJWKSet, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import { digest, OnlineError, type OnlineService } from "./online.js";
const keys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
export function googleVerifier(
  keySet: Parameters<typeof jwtVerify>[1],
): GoogleVerifier {
  return async (token, audience) => {
    const { payload } = await jwtVerify(token, keySet, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
      algorithms: ["RS256"],
      maxTokenAge: "5m",
      requiredClaims: ["exp", "sub", "iat", "nonce"],
    });
    if (
      typeof payload.sub !== "string" ||
      !payload.sub ||
      typeof payload.nonce !== "string" ||
      !payload.nonce
    )
      throw new OnlineError("INVALID_CREDENTIAL", 401);
    return { sub: payload.sub, nonce: payload.nonce };
  };
}
export type GoogleVerifier = (
  token: string,
  audience: string,
) => Promise<{ sub: string; nonce: string }>;
export const verifyGoogle = googleVerifier(keys);
export async function googleNonce(service: OnlineService, token: string) {
  return service.db.transaction(async (c) => {
    const id = await service.identity(token, c),
      nonce = randomBytes(32).toString("base64url");
    await c.query(
      "INSERT INTO akai_nonces(hash,account_id,expires_at) VALUES($1,$2,$3)",
      [digest(nonce), id, service.clock() + 300000],
    );
    return nonce;
  });
}
// Linking requires proof of both identities. An identity already bound elsewhere never merges balances.
export async function linkGoogle(
  service: OnlineService,
  token: string,
  idToken: string,
  audience: string,
  verifier: GoogleVerifier = verifyGoogle,
) {
  let identity;
  try {
    identity = await verifier(idToken, audience);
  } catch {
    throw new OnlineError("INVALID_CREDENTIAL", 401);
  }
  return service.db
    .transaction(async (c) => {
      const id = await service.identity(token, c);
      await c.query("SELECT id FROM akai_accounts WHERE id=$1 FOR UPDATE", [
        id,
      ]);
      await service.identity(token, c);
      const nonce = await c.query(
        "DELETE FROM akai_nonces WHERE hash=$1 AND account_id=$2 AND expires_at>$3 RETURNING hash",
        [digest(identity.nonce), id, service.clock()],
      );
      if (!nonce.rowCount) throw new OnlineError("INVALID_NONCE", 401);
      const current = (
        await c.query("SELECT google_sub FROM akai_accounts WHERE id=$1", [id])
      ).rows[0];
      const existing = await c.query(
        "SELECT id FROM akai_accounts WHERE google_sub=$1",
        [identity.sub],
      );
      if (
        (current.google_sub && current.google_sub !== identity.sub) ||
        (existing.rowCount && existing.rows[0].id !== id)
      )
        throw new OnlineError("IDENTITY_ALREADY_LINKED", 409);
      await c.query("UPDATE akai_accounts SET google_sub=$2 WHERE id=$1", [
        id,
        identity.sub,
      ]);
      return { linked: true };
    })
    .catch((error) => {
      if (error?.code === "23505")
        throw new OnlineError("IDENTITY_ALREADY_LINKED", 409);
      throw error;
    });
}

export async function googleLoginNonce(service: OnlineService) {
  const nonce = randomBytes(32).toString("base64url");
  await service.db.pool.query(
    "INSERT INTO akai_nonces(hash,expires_at) VALUES($1,$2)",
    [digest(nonce), service.clock() + 300000],
  );
  return nonce;
}
export async function loginGoogle(
  service: OnlineService,
  idToken: string,
  audience: string,
  verifier: GoogleVerifier = verifyGoogle,
) {
  let proof;
  try {
    proof = await verifier(idToken, audience);
  } catch {
    throw new OnlineError("INVALID_CREDENTIAL", 401);
  }
  return service.db.transaction(async (c) => {
    const nonce = await c.query(
      "DELETE FROM akai_nonces WHERE hash=$1 AND account_id IS NULL AND expires_at>$2 RETURNING hash",
      [digest(proof.nonce), service.clock()],
    );
    if (!nonce.rowCount) throw new OnlineError("INVALID_NONCE", 401);
    const row = (
      await c.query(
        "SELECT id FROM akai_accounts WHERE google_sub=$1 FOR UPDATE",
        [proof.sub],
      )
    ).rows[0];
    if (!row) throw new OnlineError("IDENTITY_NOT_LINKED", 401);
    await c.query("UPDATE akai_accounts SET presence_until=0 WHERE id=$1", [
      row.id,
    ]);
    return { token: await service.issue(c, row.id) };
  });
}
