import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { OnlineService } from "./online.js";
import { Database } from "./database.js";
import { buildServer } from "./app.js";
import { parseServerConfig } from "./config.js";
import {
  googleNonce,
  linkGoogle,
  googleLoginNonce,
  loginGoogle,
} from "./google.js";
import { reconcileLedger } from "./audit.js";
import { createLocalSnapshot } from "../../client/src/local/session.js";
import { startEncounter } from "@akai/shared";
import type { OnlineCommand } from "@akai/shared";
const url = process.env.TEST_DATABASE_URL;
describe.skipIf(!url)("online PostgreSQL integration", () => {
  const db = new Database(url!);
  let now = 1000000;
  const service = new OnlineService(db, () => now);
  const app = buildServer(parseServerConfig({}), false, { service });
  const headers = { origin: "http://localhost:5173", "x-akai-client": "1" };
  const envelope = (
    version = 0,
    action: OnlineCommand["action"] = { type: "mining.click" },
  ): OnlineCommand => ({
    commandId: randomUUID(),
    expectedVersion: version,
    action,
  });
  beforeAll(async () => {
    await db.migrate();
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    await db.close();
  });
  it("starts an isolated online account and hides RNG", async () => {
    const user = await service.guest(),
      s = await service.state(user.token);
    expect(s.snapshot.mode).toBe("online");
    expect(s.snapshot.profile.id).toBe(user.accountId);
    expect(s.snapshot.balances.iron).toBe("0");
    expect("rng" in s.snapshot.rpg).toBe(false);
  });
  it("persists and exposes confirmed tower hit results without rerolling reads", async () => {
    const u = await service.guest();
    await service.state(u.token);
    now += 1000;
    const state = await service.state(u.token),
      hit = state.snapshot.battle.hits[0]!;
    expect(hit).toMatchObject({ strike: 1, attempt: 1, target: 0 });
    expect(hit.damage).toBe(hit.critical ? 9 : 6);
    expect(state.snapshot.battle.enemies[0]!.hp).toBe(18 - hit.damage);
    const stored = (
      await db.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [
        u.accountId,
      ])
    ).rows[0].snapshot;
    expect(stored.battle.hits).toEqual(state.snapshot.battle.hits);
    expect((await service.state(u.token)).snapshot.battle.hits).toEqual(
      state.snapshot.battle.hits,
    );
  });
  it("persists a legacy account journal with real rewards and no duplicate reads or service restart", async () => {
    const u = await service.guest();
    await service.state(u.token);
    const seeded = (await db.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [u.accountId])).rows[0].snapshot;
    delete seeded.battle.reports;
    delete seeded.battle.reportSerial;
    seeded.upgrades.attack = 100;
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [u.accountId, seeded]);
    now += 3000;
    const confirmed = await service.state(u.token);
    const reports = confirmed.snapshot.battle.reports;
    const rewards = reports.filter(r => r.kind === "reward");
    expect(rewards).toHaveLength(3);
    expect(reports.filter(r => r.kind === "victory")).toHaveLength(1);
    expect(rewards.reduce((n,r) => n + BigInt(r.coin),0n)).toBe(BigInt(confirmed.snapshot.balances.coin));
    expect(rewards.reduce((n,r) => n + r.heroXp,0)).toBe(confirmed.snapshot.rpg.heroXp);
    const stored = (await db.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [u.accountId])).rows[0].snapshot;
    expect(stored.battle.reports).toEqual(reports);
    const restarted = new OnlineService(db, () => now);
    expect((await restarted.state(u.token)).snapshot.battle.reports).toEqual(reports);
    expect((await service.state(u.token)).snapshot.battle.reports).toEqual(reports);
    expect(await reconcileLedger(db)).toEqual([]);
  });
  it("keeps the original boss floor in the persisted loss journal", async () => {
    const u = await service.guest();
    await service.state(u.token);
    const seeded = (await db.pool.query("SELECT snapshot FROM akai_accounts WHERE id=$1", [u.accountId])).rows[0].snapshot;
    startEncounter(seeded, 10);
    seeded.battle.heroHp = 1;
    seeded.battle.heroNextAt = 1000000;
    seeded.battle.enemies[0].nextAt = seeded.battle.time + 1;
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [u.accountId, seeded]);
    now += 1;
    const after = await service.state(u.token);
    expect(after.snapshot.battle.floor).toBe(9);
    expect(after.snapshot.battle.reports).toMatchObject([{kind:"defeat",floor:10,coin:"0",heroXp:0}]);
    expect((await service.state(u.token)).snapshot.battle.reports).toEqual(after.snapshot.battle.reports);
  });
  it("100 concurrent retries across two service instances create one grant, command, ledger and event", async () => {
    const user = await service.guest(),
      cmd = envelope();
    const otherDb = new Database(url!);
    const other = new OnlineService(otherDb, () => now);
    try {
      const results = await Promise.all(
        Array.from({ length: 100 }, (_, i) =>
          (i % 2 ? service : other).command(user.token, cmd),
        ),
      );
      expect(results.every((r) => r.commandVersion === 1)).toBe(true);
      expect(
        (
          await db.pool.query(
            "SELECT count(*) FROM akai_events WHERE account_id=$1",
            [user.accountId],
          )
        ).rows[0].count,
      ).toBe("1");
      expect((await service.state(user.token)).snapshot.balances.iron).toBe(
        "1000",
      );
      for (const table of ["akai_commands", "akai_ledger"])
        expect(
          (
            await db.pool.query(
              `SELECT count(*) FROM ${table} WHERE account_id=$1`,
              [user.accountId],
            )
          ).rows[0].count,
        ).toBe("1");
    } finally {
      await otherDb.close();
    }
  });
  it("rejects changed payload replay and stale competing commands", async () => {
    const u = await service.guest(),
      cmd = envelope();
    await service.command(u.token, cmd);
    await expect(
      service.command(u.token, {
        ...cmd,
        action: { type: "upgrade", kind: "attack" },
      }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const v = await service.guest();
    const outcomes = await Promise.all(
      Array.from({ length: 20 }, () => service.command(v.token, envelope())),
    );
    expect(outcomes.filter((r) => r.status === "applied")).toHaveLength(1);
    expect(outcomes.filter((r) => r.code === "VERSION_CONFLICT")).toHaveLength(
      19,
    );
  });
  it("enforces persisted mining bucket across reconnects and returns original rejected result", async () => {
    const u = await service.guest();
    for (let n = 0; n < 10; n++)
      expect((await service.command(u.token, envelope(n))).status).toBe(
        "applied",
      );
    const cmd = envelope(10);
    expect((await service.command(u.token, cmd)).code).toBe("RATE_LIMITED");
    now += 100;
    expect((await service.command(u.token, cmd)).code).toBe("RATE_LIMITED");
    expect((await service.command(u.token, envelope(10))).status).toBe(
      "applied",
    );
  });
  it("rejects client balances, damage, owner and clock; unauthenticated and cross-account result lookup fail", async () => {
    const a = await service.guest(),
      b = await service.guest(),
      cmd = envelope();
    await service.command(a.token, cmd);
    await expect(service.result(b.token, cmd.commandId)).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.state("x".repeat(43))).rejects.toMatchObject({
      status: 401,
    });
    for (const extra of [
      { amount: "999" },
      { elapsed: 99999 },
      { accountId: b.accountId },
      { damage: 9999 },
      { critical: true },
      { hits: [{ damage: 9999, critical: true }] },
    ])
      await expect(
        service.command(a.token, { ...envelope(1), ...extra }),
      ).rejects.toThrow();
  });
  it("does not partially debit a failed purchase and persists its rejection", async () => {
    const u = await service.guest(),
      cmd = envelope(0, { type: "upgrade", kind: "attack" });
    expect((await service.command(u.token, cmd)).code).toBe(
      "PRECONDITION_FAILED",
    );
    expect((await service.state(u.token)).snapshot.upgrades.attack).toBe(0);
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM akai_ledger WHERE account_id=$1",
          [u.accountId],
        )
      ).rows[0].count,
    ).toBe("0");
  });
  it("rolls back state, ledger, outbox and command on persistence failure", async () => {
    const u = await service.guest(),
      cmd = envelope();
    await db.pool.query(
      `CREATE OR REPLACE FUNCTION akai_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.account_id='${u.accountId}'::uuid THEN RAISE EXCEPTION 'test crash'; END IF; RETURN NEW; END $$`,
    );
    await db.pool.query(
      "CREATE TRIGGER akai_test_failure BEFORE INSERT ON akai_events FOR EACH ROW EXECUTE FUNCTION akai_test_failure()",
    );
    try {
      await expect(service.command(u.token, cmd)).rejects.toThrow("test crash");
    } finally {
      await db.pool.query("DROP TRIGGER akai_test_failure ON akai_events");
      await db.pool.query("DROP FUNCTION akai_test_failure()");
    }
    const state = await service.state(u.token);
    expect(state.commandVersion).toBe(0);
    expect(state.snapshot.balances.iron).toBe("0");
    for (const table of ["akai_ledger", "akai_commands"])
      expect(
        (
          await db.pool.query(
            `SELECT count(*) FROM ${table} WHERE account_id=$1`,
            [u.accountId],
          )
        ).rows[0].count,
      ).toBe("0");
    expect((await service.command(u.token, cmd)).status).toBe("applied");
  });
  it("reconciles bounded mines once after restart without offline combat", async () => {
    const u = await service.guest(),
      s = createLocalSnapshot(now);
    s.upgrades.coal = 1;
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      u.accountId,
      s,
    ]);
    now += 10 * 3600000;
    const a = await service.state(u.token, false),
      b = await service.state(u.token, false);
    expect(a.snapshot.balances.coal).toBe("2880000");
    expect(b.snapshot.balances).toEqual(a.snapshot.balances);
    expect(a.snapshot.battle.heroStrikes).toBe(0);
  });
  it("combat persists and two concurrent syncs cannot repeat kills/rewards", async () => {
    const u = await service.guest();
    await service.state(u.token);
    now += 3000;
    await Promise.all([service.state(u.token), service.state(u.token)]);
    const result = await service.state(u.token);
    expect(result.snapshot.battle.heroStrikes).toBe(3);
    expect(result.snapshot.balances.coin).toBe("3000");
  });
  it("keeps boss deadlines through absence and rejects client clock manipulation", async () => {
    const u = await service.guest(),
      s = createLocalSnapshot(now);
    startEncounter(s, 10);
    await db.pool.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
      u.accountId,
      s,
    ]);
    now += 120000;
    const failed = await service.state(u.token, false);
    expect(failed.snapshot.battle.failure).toBe("timeout");
    expect(failed.snapshot.balances.coin).toBe("0");
    expect(failed.snapshot.battle.heroStrikes).toBe(0);
    const watermark = failed.snapshot.lastReconciledAt;
    now -= 1000;
    expect(
      (await service.state(u.token, false)).snapshot.lastReconciledAt,
    ).toBe(watermark);
    now += 1000;
  });
  it("persists crafting, equipment and enhancement; foreign inventory commands cannot debit or transfer", async () => {
    const u = await service.guest(),
      other = await service.guest(),
      s = createLocalSnapshot(now);
    s.balances.iron = "10000000";
    s.balances.coal = "10000000";
    s.balances.coin = "10000000";
    s.rpg.castIron = "10000000";
    await db.transaction(async (c) => {
      await c.query("UPDATE akai_accounts SET snapshot=$2 WHERE id=$1", [
        u.accountId,
        s,
      ]);
      for (const resource of ["iron", "coal", "coin", "castIron"])
        await c.query(
          "INSERT INTO akai_ledger(account_id,sequence,resource,delta,balance,reason) VALUES($1,0,$2,10000000,10000000,'test-fixture')",
          [u.accountId, resource],
        );
    });
    const craft = envelope(0, {
      type: "rpg",
      command: { type: "craft", definitionId: "sword", level: 1 },
    });
    expect((await service.command(u.token, craft)).status).toBe("applied");
    await service.command(u.token, craft);
    const state = await service.state(u.token),
      item = state.snapshot.rpg.inventory[0]!;
    expect(state.snapshot.rpg.inventory).toHaveLength(1);
    expect(
      (
        await service.command(
          other.token,
          envelope(0, {
            type: "rpg",
            command: { type: "enhance", id: item.id },
          }),
        )
      ).status,
    ).toBe("rejected");
    expect(
      (
        await service.command(
          u.token,
          envelope(1, {
            type: "rpg",
            command: { type: "equip", id: item.id, slot: "weapon" },
          }),
        )
      ).status,
    ).toBe("applied");
    expect(
      (
        await service.command(
          u.token,
          envelope(2, {
            type: "rpg",
            command: { type: "enhance", id: item.id },
          }),
        )
      ).status,
    ).toBe("applied");
    const final = await service.state(u.token);
    expect(final.snapshot.rpg.inventory[0]!.enhancement).toBe(1);
    expect(final.snapshot.rpg.equipped.weapon).toBe(item.id);
    expect(
      (await reconcileLedger(db)).filter((x) => x.id === u.accountId),
    ).toHaveLength(0);
  });
  it("limits and expires concurrent stream leases in shared storage", async () => {
    const u = await service.guest(),
      a = await service.openStream(u.token),
      b = await service.openStream(u.token);
    await expect(service.openStream(u.token)).rejects.toMatchObject({
      code: "TOO_MANY_STREAMS",
    });
    await service.closeStream(a);
    const replacement = await service.openStream(u.token);
    now += 10001;
    await expect(service.renewStream(b)).rejects.toMatchObject({
      code: "STREAM_EXPIRED",
    });
    await service.closeStream(replacement);
    expect(await service.openStream(u.token)).toEqual(expect.any(String));
  });
  it("recovery rotates key, revokes old session and preserves account state", async () => {
    const u = await service.guest();
    await service.command(u.token, envelope());
    const fresh = await service.recover(u.recoveryKey);
    await expect(service.state(u.token)).rejects.toMatchObject({ status: 401 });
    await expect(service.recover(u.recoveryKey)).rejects.toMatchObject({
      status: 401,
    });
    expect((await service.state(fresh.token)).snapshot.balances.iron).toBe(
      "1000",
    );
    await service.logout(fresh.token);
    await expect(service.state(fresh.token)).rejects.toMatchObject({
      status: 401,
    });
  });
  it("validates Google proof, nonce ownership/replay, and refuses account merging", async () => {
    const a = await service.guest(),
      b = await service.guest();
    const nonce = await googleNonce(service, a.token);
    const proof = async () => ({ sub: "test-google-" + a.accountId, nonce });
    await expect(
      linkGoogle(service, b.token, "test", "client", proof),
    ).rejects.toMatchObject({ code: "INVALID_NONCE" });
    expect(await linkGoogle(service, a.token, "test", "client", proof)).toEqual(
      { linked: true },
    );
    await expect(
      linkGoogle(service, a.token, "test", "client", proof),
    ).rejects.toMatchObject({ code: "INVALID_NONCE" });
    const nonceB = await googleNonce(service, b.token);
    await expect(
      linkGoogle(service, b.token, "test", "client", async () => ({
        sub: "test-google-" + a.accountId,
        nonce: nonceB,
      })),
    ).rejects.toMatchObject({ code: "IDENTITY_ALREADY_LINKED" });
    await expect(
      linkGoogle(service, b.token, "bad", "client", async () => {
        throw Error("invalid signature");
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
  it("logs into a linked Google account with fresh proof and revokes the old session", async () => {
    const u = await service.guest(),
      sub = "login-" + u.accountId,
      nonce = await googleNonce(service, u.token);
    await linkGoogle(service, u.token, "test", "client", async () => ({
      sub,
      nonce,
    }));
    const loginNonce = await googleLoginNonce(service);
    const result = await loginGoogle(service, "test", "client", async () => ({
      sub,
      nonce: loginNonce,
    }));
    expect((await service.state(result.token)).snapshot.profile.id).toBe(
      u.accountId,
    );
    await expect(service.state(u.token)).rejects.toMatchObject({ status: 401 });
    await expect(
      loginGoogle(service, "test", "client", async () => ({
        sub,
        nonce: loginNonce,
      })),
    ).rejects.toMatchObject({ code: "INVALID_NONCE" });
  });
  it("rejects expired sessions and enforces auth rate windows in persistent storage", async () => {
    const u = await service.guest();
    await db.pool.query(
      "UPDATE akai_sessions SET expires_at=$2 WHERE account_id=$1",
      [u.accountId, now],
    );
    await expect(service.state(u.token)).rejects.toMatchObject({ status: 401 });
    const key = randomUUID();
    await service.authLimit(key, 1);
    await expect(service.authLimit(key, 1)).rejects.toMatchObject({
      status: 429,
    });
    now += 60000;
    await service.authLimit(key, 1);
  });
  it("prevents economic history edits and reconciles ledger against materialized balances", async () => {
    const u = await service.guest();
    await service.command(u.token, envelope());
    await expect(
      db.pool.query("UPDATE akai_ledger SET delta=2000 WHERE account_id=$1", [
        u.accountId,
      ]),
    ).rejects.toThrow("append only");
    expect(
      (await reconcileLedger(db)).filter((x) => x.id === u.accountId),
    ).toHaveLength(0);
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,iron}','\"2000\"') WHERE id=$1",
      [u.accountId],
    );
    expect(
      (await reconcileLedger(db)).filter((x) => x.id === u.accountId),
    ).toHaveLength(1);
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{balances,iron}','\"1000\"') WHERE id=$1",
      [u.accountId],
    );
  });
  it("uses scoped ordered durable events; delivery does not change balances", async () => {
    const a = await service.guest(),
      b = await service.guest();
    await service.command(a.token, envelope());
    const events = await service.events(a.token, 0);
    expect(events).toHaveLength(1);
    expect(await service.events(b.token, 0)).toHaveLength(0);
    expect(
      await service.events(a.token, Number(events[0].sequence)),
    ).toHaveLength(0);
    expect((await service.state(a.token)).snapshot.balances.iron).toBe("1000");
  });
  it("enforces CSRF, exact origin, secure cookie and route schemas over HTTP", async () => {
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/auth/guest",
          payload: {},
          headers: { origin: "https://evil.example", "x-akai-client": "1" },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/auth/guest",
          payload: {},
          headers: { origin: headers.origin },
        })
      ).statusCode,
    ).toBe(403);
    const created = await app.inject({
      method: "POST",
      url: "/api/v1/auth/guest",
      headers,
      payload: {},
    });
    expect(created.statusCode).toBe(200);
    expect(created.headers["set-cookie"]).toContain("HttpOnly");
    expect(created.headers["set-cookie"]).toContain("SameSite=Strict");
    const cookie = String(created.headers["set-cookie"]).split(";")[0]!;
    const state = await app.inject({
      url: "/api/v1/state",
      headers: { ...headers, cookie },
    });
    expect(state.statusCode).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/v1/commands",
          headers: { ...headers, cookie },
          payload: { ...envelope(), amount: 999 },
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (await app.inject({ url: "/api/v1/state", headers })).statusCode,
    ).toBe(401);
  });
  it("authenticates WebSocket and publishes confirmed snapshots", async () => {
    const u = await service.guest();
    const socket = await app.injectWS("/api/v1/stream", {
      headers: { origin: headers.origin, cookie: `akai_session=${u.token}` },
    });
    const msg = await new Promise<string>((resolve) =>
      socket.once("message", (x) => resolve(String(x))),
    );
    expect(JSON.parse(msg).snapshot.mode).toBe("online");
    socket.terminate();
  });
});
