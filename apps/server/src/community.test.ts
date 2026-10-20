import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { Database } from "./database.js";
import { OnlineService, digest } from "./online.js";
import { CommunityService } from "./community.js";
import {
  calendar,
  zonedDate,
  duel,
  competitiveStats,
  power,
} from "./community-domain.js";
import { createLocalSnapshot } from "../../client/src/local/session.js";
import { reconcileLedger } from "./audit.js";
import { buildServer } from "./app.js";
import { parseServerConfig } from "./config.js";
import type { CommunityAction } from "@akai/shared";
const url = process.env.TEST_DATABASE_URL;
describe("community pure rules", () => {
  it("uses Brasilia calendar, Monday seasons and 22h boss across UTC dates", () => {
    const now = zonedDate(2026, 10, 15, 22),
      k = calendar(now);
    expect(new Date(now).toISOString()).toBe("2026-10-16T01:00:00.000Z");
    expect(k.date).toBe("2026-10-15");
    expect(k.season.id).toBe("2026-10-12");
    expect(new Date(k.season.start).toISOString()).toBe(
      "2026-10-12T03:00:00.000Z",
    );
    expect(k.bossStart).toBe(now);
    expect(k.season.end - k.season.start).toBe(7 * 86400000);
  });
  it("ties and timeouts favor defense; temporary tonics cannot affect competitive power", () => {
    const s = createLocalSnapshot(0),
      stats = competitiveStats(s);
    expect(duel(stats, stats).won).toBe(false);
    s.rpg.attackBuffUntil = Number.MAX_SAFE_INTEGER;
    expect(competitiveStats(s)).toEqual(stats);
    expect(power(s)).toBe(stats.attack * 10 + stats.hp + stats.defense * 20);
  });
});
describe.skipIf(!url)("community real PostgreSQL", () => {
  const base = new Database(url!),
    schema = "f6_" + randomUUID().replaceAll("-", "");
  let dbUrl: string,
    db: Database,
    online: OnlineService,
    social: CommunityService,
    now = zonedDate(2026, 10, 15, 9),
    n = 0;
  beforeAll(async () => {
    await base.pool.query(`CREATE SCHEMA ${schema}`);
    const u = new URL(url!);
    u.searchParams.set("options", "-csearch_path=" + schema);
    dbUrl = u.toString();
    db = new Database(dbUrl);
    await db.migrate();
    online = new OnlineService(db, () => now);
    social = new CommunityService(online);
  });
  beforeEach(async () => {
    await db.pool.query(
      "TRUNCATE akai_accounts,akai_seasons,akai_bosses,akai_xp_windows,akai_lotteries,akai_social_audit,akai_auth_limits CASCADE",
    );
    now = zonedDate(2026, 10, 15, 9);
    n = 0;
  });
  afterAll(async () => {
    await db?.close();
    await base.pool.query(`DROP SCHEMA ${schema} CASCADE`);
    await base.close();
  });
  const command = (token: string, action: CommunityAction, id = randomUUID()) =>
    social.command(token, { commandId: id, action });
  async function user(attack = 0, floor = 10) {
    const u = await online.guest(),
      s = createLocalSnapshot(now);
    s.battle.paused = true;
    s.battle.highest = floor;
    s.upgrades.attack = attack;
    s.balances.coin = "50000000";
    await db.transaction(async (c) => {
      await c.query(
        "UPDATE akai_accounts SET snapshot=$2,created_at=to_timestamp($3::double precision/1000) WHERE id=$1",
        [u.accountId, s, now - 86400000],
      );
      await c.query(
        "INSERT INTO akai_ledger(account_id,sequence,resource,delta,balance,reason) VALUES($1,0,'coin',50000000,50000000,'test-fixture')",
        [u.accountId],
      );
    });
    await social.read(u.token);
    await db.pool.query(
      "UPDATE akai_profiles SET name=$2 WHERE account_id=$1",
      [u.accountId, "Player " + ++n],
    );
    await online.state(u.token);
    return u;
  }
  it("reads bounded global chat without renewing event presence or settling the account", async () => {
    const a = await user(), b = await user(), beginner = await user(0, 0);
    await command(a.token, { type: "chat", scope: "global", text: "<img src=x> literal" });
    const before = (await db.pool.query("SELECT snapshot,presence_until,state_version FROM akai_accounts WHERE id=$1", [b.accountId])).rows[0];
    expect((await social.globalChat(b.token)).messages.map(x => x.text)).toEqual(["<img src=x> literal"]);
    expect((await social.globalChat(beginner.token)).canChat).toBe(false);
    expect((await db.pool.query("SELECT snapshot,presence_until,state_version FROM akai_accounts WHERE id=$1", [b.accountId])).rows[0]).toEqual(before);
    await command(b.token, { type: "block", accountId: a.accountId, blocked: true });
    expect((await social.globalChat(b.token)).messages).toEqual([]);
    await command(b.token, { type: "block", accountId: a.accountId, blocked: false });
    await db.pool.query("UPDATE akai_chat SET removed=true WHERE author=$1", [a.accountId]);
    expect((await social.globalChat(b.token)).messages).toEqual([]);
    await db.pool.query("UPDATE akai_profiles SET suspended=true WHERE account_id=$1", [b.accountId]);
    await expect(social.globalChat(b.token)).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
  });
  it("announces only confirmed v2 last-hit records and leaves state unchanged", async () => {
    const a=await user(),b=await user();
    expect(await social.bossBroadcast(a.token)).toBeNull();
    await db.pool.query("INSERT INTO akai_social_rewards(source,account_id,description,at) VALUES($1,$2,$3,$4)",['boss:2026-10-15:last-hit',b.accountId,'Legacy Coins',now]);
    expect(await social.bossBroadcast(a.token)).toBeNull();
    const before=(await db.pool.query('SELECT snapshot,state_version,presence_until FROM akai_accounts WHERE id=$1',[a.accountId])).rows[0];
    await db.pool.query("INSERT INTO akai_social_rewards(source,account_id,description,at) VALUES($1,$2,$3,$4)",['boss:2026-10-15:v2:last-hit',b.accountId,'TEST FIXTURE: v2 reward read path',now]);
    const broadcast=await social.bossBroadcast(a.token);
    expect(broadcast).toMatchObject({accountId:b.accountId,jade:250});expect(broadcast!.text).toContain('250 jade');
    expect((await db.pool.query('SELECT snapshot,state_version,presence_until FROM akai_accounts WHERE id=$1',[a.accountId])).rows[0]).toEqual(before);
    now+=86400001;expect(await social.bossBroadcast(a.token)).toBeNull();
  });
  async function guild(
    u: Awaited<ReturnType<typeof user>>,
    name = "Guild " + n,
  ) {
    expect(
      (await command(u.token, { type: "guild.create", name })).status,
    ).toBe("applied");
    return (await social.read(u.token)).guild!.id;
  }
  async function member(
    leader: Awaited<ReturnType<typeof user>>,
    u: Awaited<ReturnType<typeof user>>,
    id: string,
  ) {
    await command(leader.token, {
      type: "guild.invite",
      accountId: u.accountId,
    });
    expect(
      (await command(u.token, { type: "guild.accept", guildId: id })).status,
    ).toBe("applied");
  }
  it("uses strict schemas and persistent idempotency for chat across service instances", async () => {
    const u = await user(),
      id = randomUUID(),
      body = {
        commandId: id,
        action: {
          type: "chat" as const,
          scope: "global" as const,
          text: "Hello <script>alert(1)</script>",
        },
      };
    const other = new CommunityService(online);
    const results = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        (i % 2 ? other : social).command(u.token, body),
      ),
    );
    expect(results.every((r) => r.status === "applied")).toBe(true);
    expect((await social.read(u.token)).chat).toHaveLength(1);
    await expect(
      social.command(u.token, {
        ...body,
        action: { ...body.action, text: "changed" },
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      social.command(u.token, { ...body, damage: 9999 }),
    ).rejects.toThrow();
  });
  it("enforces cooldown, floor, mute, blocking/unblocking and literal text", async () => {
    const a = await user(),
      b = await user(),
      newbie = await user(0, 0);
    expect(
      (
        await command(newbie.token, {
          type: "chat",
          scope: "global",
          text: "x",
        })
      ).code,
    ).toBe("COMPLETE_FLOOR_ONE");
    await command(a.token, {
      type: "chat",
      scope: "global",
      text: "<img src=x onerror=alert(1)>",
    });
    expect(
      (await command(a.token, { type: "chat", scope: "global", text: "spam" }))
        .code,
    ).toBe("CHAT_COOLDOWN");
    expect((await social.read(b.token)).chat[0]!.text).toContain("<img");
    await command(b.token, {
      type: "block",
      accountId: a.accountId,
      blocked: true,
    });
    expect((await social.read(b.token)).chat).toHaveLength(0);
    await command(b.token, {
      type: "block",
      accountId: a.accountId,
      blocked: false,
    });
    expect((await social.read(b.token)).chat).toHaveLength(1);
    await db.pool.query(
      "UPDATE akai_profiles SET muted_until=$2 WHERE account_id=$1",
      [a.accountId, now + 86400000],
    );
    now += 3001;
    expect(
      (await command(a.token, { type: "chat", scope: "global", text: "muted" }))
        .code,
    ).toBe("CHAT_MUTED");
  });
  it("rejects unsafe names, duplicate names and invalid pixel payloads before effects", async () => {
    const a = await user(),
      b = await user();
    await command(a.token, { type: "profile", name: "Cavaleiro" });
    expect(
      (await command(b.token, { type: "profile", name: "cavaleiro" })).status,
    ).toBe("rejected");
    await expect(
      command(a.token, { type: "profile", name: "<script>" }),
    ).rejects.toThrow();
    await expect(
      command(a.token, { type: "guild.emblem", pixels: Array(256).fill(99) }),
    ).rejects.toThrow();
  });
  it("guild creation debits atomically once and preserves ledger reconciliation", async () => {
    const a = await user(),
      id = randomUUID();
    const before = (await online.state(a.token)).snapshot.balances.coin;
    await command(a.token, { type: "guild.create", name: "Guardioes" }, id);
    await command(a.token, { type: "guild.create", name: "Guardioes" }, id);
    expect(
      BigInt(before) -
        BigInt((await online.state(a.token)).snapshot.balances.coin),
    ).toBe(500000n);
    expect(await reconcileLedger(db)).toEqual([]);
    expect(
      (await command(a.token, { type: "guild.create", name: "Other" })).status,
    ).toBe("rejected");
  });
  it("invites expire and membership changes never expose foreign guild chat/report", async () => {
    const a = await user(),
      b = await user(),
      c = await user(),
      id = await guild(a);
    await member(a, b, id);
    await command(a.token, { type: "chat", scope: "guild", text: "private" });
    const message = (await social.read(b.token)).guildChat[0]!;
    expect((await social.read(c.token)).guildChat).toHaveLength(0);
    expect(
      (
        await command(c.token, {
          type: "report",
          messageId: message.id,
          reason: "test report",
        })
      ).code,
    ).toBe("NOT_FOUND");
    await command(b.token, {
      type: "report",
      messageId: message.id,
      reason: "test report",
    });
    await command(b.token, {
      type: "report",
      messageId: message.id,
      reason: "duplicate",
    });
    expect(
      (await db.pool.query("SELECT count(*) FROM akai_reports")).rows[0].count,
    ).toBe("1");
    await command(a.token, { type: "guild.invite", accountId: c.accountId });
    now += 86400001;
    expect(
      (await command(c.token, { type: "guild.accept", guildId: id })).code,
    ).toBe("INVITE_EXPIRED");
  });
  it("enforces guild roles, leadership transfer and pixel ownership", async () => {
    const a = await user(),
      b = await user(),
      id = await guild(a);
    await member(a, b, id);
    expect(
      (
        await command(b.token, {
          type: "guild.role",
          accountId: a.accountId,
          role: "kick",
        })
      ).code,
    ).toBe("FORBIDDEN");
    expect((await command(a.token, { type: "guild.leave" })).code).toBe(
      "TRANSFER_LEADERSHIP_FIRST",
    );
    expect(
      (
        await command(b.token, {
          type: "guild.emblem",
          pixels: Array(256).fill(1),
        })
      ).status,
    ).toBe("rejected");
    await command(a.token, {
      type: "guild.emblem",
      pixels: Array(256).fill(3),
    });
    expect((await social.read(b.token)).guild!.emblem).toEqual(
      Array(256).fill(3),
    );
    await command(a.token, {
      type: "guild.role",
      accountId: b.accountId,
      role: "leader",
    });
    await command(a.token, { type: "guild.leave" });
    expect((await social.read(b.token)).guild!.members).toEqual([
      expect.objectContaining({ id: b.accountId, role: "leader" }),
    ]);
  });
  it("capacity serializes competing accepts; guild upgrade checks XP and currency", async () => {
    const a = await user(),
      id = await guild(a);
    const users = await Promise.all(Array.from({ length: 20 }, () => user()));
    for (let i = 0; i < 18; i++)
      await db.pool.query(
        "INSERT INTO akai_members(account_id,guild_id,role,joined_at) VALUES($1,$2,'member',$3)",
        [users[i]!.accountId, id, now],
      );
    for (const u of users.slice(18))
      await command(a.token, { type: "guild.invite", accountId: u.accountId });
    const results = await Promise.all(
      users
        .slice(18)
        .map((u) => command(u.token, { type: "guild.accept", guildId: id })),
    );
    expect(results.filter((r) => r.status === "applied")).toHaveLength(1);
    expect((await social.read(a.token)).guild!.members).toHaveLength(20);
    expect((await command(a.token, { type: "guild.upgrade" })).code).toBe(
      "GUILD_LEVEL_REQUIREMENTS",
    );
    await db.pool.query("UPDATE akai_guilds SET xp=100 WHERE id=$1", [id]);
    expect((await command(a.token, { type: "guild.upgrade" })).status).toBe(
      "applied",
    );
    expect((await social.read(a.token)).guild!.capacity).toBe(22);
  }, 30000);
  it("arena only offers real nearest five; authoritative wins swap unique positions once", async () => {
    const weak = await user(),
      strong = await user(100);
    const before = await social.read(strong.token);
    expect(before.arena.opponents.map((p) => p.id)).toEqual([weak.accountId]);
    const id = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        command(
          strong.token,
          { type: "arena", opponentId: weak.accountId },
          id,
        ),
      ),
    );
    expect(results.every((r) => r.status === "applied")).toBe(true);
    const after = await social.read(strong.token);
    expect(after.arena.position).toBe(1);
    expect(after.arena.trophies).toBe(20);
    expect(after.arena.matches).toHaveLength(1);
    expect((await social.read(weak.token)).arena.position).toBe(2);
    expect(
      (
        await command(strong.token, {
          type: "arena",
          opponentId: strong.accountId,
        })
      ).status,
    ).toBe("rejected");
  });
  it("defender wins ties, defeat preserves position and floors trophies; cooldown persists", async () => {
    const a = await user(),
      b = await user();
    await command(b.token, { type: "arena", opponentId: a.accountId });
    const s = await social.read(b.token);
    expect(s.arena.position).toBe(2);
    expect(s.arena.trophies).toBe(0);
    expect(s.arena.matches[0]!.won).toBe(false);
    expect(
      (await command(b.token, { type: "arena", opponentId: a.accountId })).code,
    ).toBe("ARENA_COOLDOWN_OR_LEVEL");
  });
  it("suspension blocks all authenticated commands and hides public ranking", async () => {
    const a = await user(),
      b = await user();
    await db.pool.query(
      "UPDATE akai_profiles SET suspended=true WHERE account_id=$1",
      [a.accountId],
    );
    await expect(online.state(a.token)).rejects.toMatchObject({ status: 401 });
    expect(
      (await social.read(b.token)).rankings.power.some(
        (p) => p.id === a.accountId,
      ),
    ).toBe(false);
  });
  it("boss runs only at official time; duplicates cannot create another edition or final blow", async () => {
    now = zonedDate(2026, 10, 15, 22);
    const a = await user(100),
      b = await user(100),
      edition = "boss:" + calendar(now).date;
    await db.pool.query(
      "UPDATE akai_bosses SET hp=200,max_hp=200 WHERE id=$1",
      [edition],
    );
    await command(a.token, { type: "boss", join: true });
    await command(b.token, { type: "boss", join: true });
    now += 1000;
    await Promise.all([
      social.tick(),
      new CommunityService(online).tick(),
      social.tick(),
    ]);
    const state = await social.read(a.token);
    expect(state.boss.status).toBe("closed");
    expect(state.boss.hp).toBe(0);
    expect(state.boss.lastHit).not.toBeNull();
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM akai_social_rewards WHERE source=$1",
          [edition + ":last-hit"],
        )
      ).rows[0].count,
    ).toBe("1");
    const balances = (await online.state(a.token)).snapshot.balances;
    await social.tick();
    expect((await online.state(a.token)).snapshot.balances).toEqual(balances);
    expect(await reconcileLedger(db)).toEqual([]);
  });
  it("boss leave and disconnected presence prevent damage and renewal exploits", async () => {
    const a = await user(100);
    expect((await command(a.token, { type: "boss", join: true })).code).toBe(
      "EVENT_NOT_ACTIVE",
    );
    now = zonedDate(2026, 10, 15, 22);
    await online.state(a.token);
    await social.read(a.token);
    await command(a.token, { type: "boss", join: true });
    await command(a.token, { type: "boss", join: false });
    await social.read(a.token);
    now += 3000;
    await social.tick();
    expect((await social.read(a.token)).boss.damage).toBe(0);
    await online.state(a.token);
    await command(a.token, { type: "boss", join: true });
    now += 60000;
    await social.tick();
    const damage = (await social.read(a.token)).boss.damage;
    expect(damage).toBeGreaterThan(0);
    expect(damage).toBeLessThanOrEqual(
      competitiveStats((await online.state(a.token)).snapshot as never).attack *
        3,
    );
  });
  it("lottery snapshots verified eligibility at the draw and grants exactly100 rubies after restart", async () => {
    now = zonedDate(2026, 10, 15, 18) - 1000;
    const a = await user(),
      b = await user();
    await db.pool.query("UPDATE akai_accounts SET google_sub=$2 WHERE id=$1", [
      a.accountId,
      "google-" + a.accountId,
    ]);
    await online.state(a.token);
    now += 2000;
    await Promise.all([social.tick(), social.tick()]);
    expect((await online.state(a.token)).snapshot.balances.ruby).toBe("100000");
    expect((await online.state(b.token)).snapshot.balances.ruby).toBe("0");
    const draw = (await db.pool.query("SELECT * FROM akai_lotteries")).rows[0];
    expect(draw.eligible).toEqual([a.accountId]);
    await social.tick();
    expect((await online.state(a.token)).snapshot.balances.ruby).toBe("100000");
  });
  it("lottery with no proven participants closes without fabricating a winner", async () => {
    now = zonedDate(2026, 10, 15, 18) + 1000;
    await social.tick();
    expect(
      (await db.pool.query("SELECT winner,closed FROM akai_lotteries")).rows[0],
    ).toEqual({ winner: null, closed: true });
  });
  it("raid credits one rolled chest and never rolls again on repeated state/restart", async () => {
    now = zonedDate(2026, 10, 15, 20);
    const a = await user(100);
    expect((await command(a.token, { type: "raid" })).status).toBe("applied");
    now += 2000;
    await social.tick();
    const items = (await online.state(a.token)).snapshot.rpg.inventory;
    expect(items).toHaveLength(1);
    expect(items[0]!.rarity).not.toBe("common");
    await social.tick();
    expect((await online.state(a.token)).snapshot.rpg.inventory).toEqual(items);
    expect((await command(a.token, { type: "raid" })).code).toBe(
      "RAID_ALREADY_PLAYED",
    );
  });
  it("raid expiration yields no chest; absence cannot simulate an entire fight", async () => {
    now = zonedDate(2026, 10, 15, 20);
    const a = await user();
    await command(a.token, { type: "raid" });
    now += 3600001;
    await social.tick();
    expect((await online.state(a.token)).snapshot.rpg.inventory).toHaveLength(
      0,
    );
    expect((await social.read(a.token)).flash.raid.status).toBe("expired");
  });
  it("XP30% is applied exactly across a window boundary; local snapshots remain unchanged", async () => {
    now = zonedDate(2026, 10, 15, 12) - 2000;
    const a = await user();
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{battle,paused}','false') WHERE id=$1",
      [a.accountId],
    );
    await online.state(a.token);
    now += 3000;
    const state = await online.state(a.token);
    expect(state.snapshot.rpg.heroXp).toBe(13);
  });
  it("season rollover archives results and pays once; positions/trophies restart for real accounts", async () => {
    const a = await user(),
      b = await user(100);
    await command(b.token, { type: "arena", opponentId: a.accountId });
    const old = calendar(now).season.id;
    const before = BigInt((await online.state(b.token)).snapshot.balances.coin);
    now = calendar(now).season.end + 1;
    await Promise.all([social.tick(), social.tick()]);
    const state = await social.read(b.token);
    expect(state.season.id).not.toBe(old);
    expect(state.arena.trophies).toBe(0);
    expect(
      (
        await db.pool.query(
          "SELECT closed,archive FROM akai_seasons WHERE id=$1",
          [old],
        )
      ).rows[0],
    ).toMatchObject({ closed: true, archive: { arena: expect.any(Array) } });
    expect(
      BigInt((await online.state(b.token)).snapshot.balances.coin) - before,
    ).toBe(500000n);
    await social.tick();
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM akai_social_rewards WHERE source=$1",
          ["season:" + old + ":arena"],
        )
      ).rows[0].count,
    ).toBe("2");
  });
  it("war enrollment freezes trusted rosters; one attack and one payout survive retries", async () => {
    const a = await user(100),
      b = await user(),
      c = await user(),
      d = await user();
    const ga = await guild(a, "Alfa"),
      gb = await guild(c, "Beta");
    await member(a, b, ga);
    await member(c, d, gb);
    expect((await command(a.token, { type: "war.enroll" })).code).toBe(
      "TWO_ESTABLISHED_MEMBERS_REQUIRED",
    );
    await db.pool.query("UPDATE akai_members SET joined_at=$1", [
      now - 2 * 86400000,
    ]);
    await command(a.token, { type: "war.enroll" });
    await command(c.token, { type: "war.enroll" });
    now = calendar(now).warStart;
    await social.tick();
    const war = (await social.read(a.token)).wars[0]!;
    expect(war).toBeDefined();
    const action = { type: "war.attack" as const, warId: war.id },
      id = randomUUID();
    await command(a.token, action, id);
    await command(a.token, action, id);
    expect((await command(a.token, action)).code).toBe("ALREADY_ATTACKED");
    expect(
      (await db.pool.query("SELECT count(*) FROM akai_war_attacks")).rows[0]
        .count,
    ).toBe("1");
    now = war.end + 1;
    await social.tick();
    expect((await social.read(a.token)).wars[0]!.status).not.toBe("active");
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM akai_social_rewards WHERE source=$1",
          ["war:" + war.id],
        )
      ).rows[0].count,
    ).toBe("1");
    await social.tick();
    expect(
      (
        await db.pool.query(
          "SELECT count(*) FROM akai_social_rewards WHERE source=$1",
          ["war:" + war.id],
        )
      ).rows[0].count,
    ).toBe("1");
  });
  it("offers exactly five actual opponents when enough players exist", async () => {
    const users = [];
    for (let i = 0; i < 7; i++) users.push(await user());
    const s = await social.read(users[6]!.token);
    expect(s.arena.opponents.map((p) => p.id)).toEqual(
      users
        .slice(1, 6)
        .reverse()
        .map((u) => u.accountId),
    );
  });
  it("limits challenges across the weekly boundary using rolling24h history", async () => {
    now = calendar(now).season.start + 3600000;
    const a = await user(),
      b = await user(),
      k = calendar(now),
      old = "previous";
    await db.pool.query(
      "INSERT INTO akai_seasons(id,start_at,end_at,closed) VALUES($1,$2,$3,true)",
      [old, k.season.start - 7 * 86400000, k.season.start],
    );
    for (let i = 0; i < 20; i++)
      await db.pool.query(
        "INSERT INTO akai_matches(id,season_id,attacker,defender,won,at,result) VALUES($1,$2,$3,$4,false,$5,$6)",
        [randomUUID(), old, b.accountId, a.accountId, now - 2 * 3600000, {}],
      );
    expect(
      (await command(b.token, { type: "arena", opponentId: a.accountId })).code,
    ).toBe("DAILY_CHALLENGE_LIMIT");
  });
  it("guild XP bonus expiration inside an active interval is segmented precisely", async () => {
    const a = await user(),
      g = await guild(a);
    await db.pool.query(
      "UPDATE akai_guilds SET bonus_bp=1000,bonus_until=$2 WHERE id=$1",
      [g, now + 2000],
    );
    await db.pool.query(
      "UPDATE akai_members SET joined_at=$2 WHERE account_id=$1",
      [a.accountId, now - 2 * 86400000],
    );
    await db.pool.query(
      "UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{battle,paused}','false') WHERE id=$1",
      [a.accountId],
    );
    await online.state(a.token);
    now += 3000;
    expect((await online.state(a.token)).snapshot.rpg.heroXp).toBe(10);
  });
  it("lottery rollback after an outbox failure preserves draw/grant atomicity", async () => {
    now = zonedDate(2026, 10, 15, 18) - 1000;
    const a = await user();
    await db.pool.query("UPDATE akai_accounts SET google_sub=$2 WHERE id=$1", [
      a.accountId,
      "verified",
    ]);
    await online.state(a.token);
    await db.pool.query(
      "CREATE FUNCTION f6_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.payload->>'reason' LIKE 'lottery:%' THEN RAISE EXCEPTION 'outbox failed'; END IF; RETURN NEW; END $$",
    );
    await db.pool.query(
      "CREATE TRIGGER f6_fail BEFORE INSERT ON akai_events FOR EACH ROW EXECUTE FUNCTION f6_fail()",
    );
    now += 2000;
    try {
      await expect(social.tick()).rejects.toThrow("outbox failed");
    } finally {
      await db.pool.query("DROP TRIGGER f6_fail ON akai_events");
      await db.pool.query("DROP FUNCTION f6_fail()");
    }
    expect(
      (await db.pool.query("SELECT closed FROM akai_lotteries")).rows[0].closed,
    ).toBe(false);
    expect((await online.state(a.token)).snapshot.balances.ruby).toBe("0");
    await social.tick();
    expect((await online.state(a.token)).snapshot.balances.ruby).toBe("100000");
    expect(await reconcileLedger(db)).toEqual([]);
  });
  it("operator CLI mutes with audit and is not a player-facing permission", async () => {
    const a = await user();
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "apps/server/src/community-admin.ts",
        "test-operator",
        "mute",
        a.accountId,
        "Integration test report",
      ],
      { env: { ...process.env, DATABASE_URL: dbUrl }, encoding: "utf8" },
    );
    expect(output).toContain("Moderation recorded");
    expect(
      (await command(a.token, { type: "chat", scope: "global", text: "muted" }))
        .code,
    ).toBe("CHAT_MUTED");
    expect(
      (
        await db.pool.query(
          "SELECT actor FROM akai_social_audit WHERE action='moderation:mute'",
        )
      ).rows[0].actor,
    ).toBe("test-operator");
  });
  it("migration002 preserves a real schema001 account/session/snapshot", async () => {
    const sub = "old_" + randomUUID().replaceAll("-", "");
    await base.pool.query("CREATE SCHEMA " + sub);
    const u = new URL(url!);
    u.searchParams.set("options", "-csearch_path=" + sub);
    const legacy = new Database(u.toString());
    try {
      await legacy.pool.query(
        await readFile(
          new URL("../migrations/001_online.sql", import.meta.url),
          "utf8",
        ),
      );
      const id = randomUUID(),
        snapshot = createLocalSnapshot(now),
        token = "x".repeat(43);
      await legacy.pool.query(
        "INSERT INTO akai_accounts(id,recovery_hash,snapshot,last_at,click_at) VALUES($1,$2,$3,$4,$4)",
        [id, digest("recovery"), snapshot, now],
      );
      await legacy.pool.query(
        "INSERT INTO akai_sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)",
        [digest(token), id, now + 86400000],
      );
      await legacy.migrate();
      const state = await new OnlineService(legacy, () => now).state(token);
      expect(state.snapshot.profile.id).toBe(id);
      expect(state.snapshot.balances).toEqual(snapshot.balances);
      expect(state.snapshot.rpg.inventory).toEqual(snapshot.rpg.inventory);
    } finally {
      await legacy.close();
      await base.pool.query("DROP SCHEMA " + sub + " CASCADE");
    }
  });
  it("HUD identity reads neither advance combat nor renew boss participation", async () => {
    const a = await user();
    await command(a.token, { type: "guild.create", name: "Guilda HUD" });
    now = zonedDate(2026, 10, 15, 22);
    await online.state(a.token);
    await social.read(a.token);
    await command(a.token, { type: "boss", join: true });
    const account = async () =>
      (
        await db.pool.query(
          "SELECT snapshot,last_at,state_version,presence_until FROM akai_accounts WHERE id=$1",
          [a.accountId],
        )
      ).rows[0];
    const participation = async () =>
      (
        await db.pool.query(
          "SELECT next_at,present_until,engaged FROM akai_boss_members WHERE account_id=$1",
          [a.accountId],
        )
      ).rows[0];
    const before = await account(),
      member = await participation();
    now += 1000;
    for (let i = 0; i < 3; i++)
      expect(await social.identity(a.token)).toEqual({
        name: "Player 1",
        guild: "Guilda HUD",
      });
    expect(await account()).toEqual(before);
    expect(await participation()).toEqual(member);
    await expect(social.identity("invalid")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
  it("HTTP community enforces auth/CSRF and exposes no admin/event-start route", async () => {
    const app = buildServer(parseServerConfig({}), false, { service: online });
    try {
      await app.ready();
      expect(
        (
          await app.inject({
            url: "/api/v1/community",
            headers: { "x-akai-client": "1" },
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (
          await app.inject({
            url: "/api/v1/community/identity",
            headers: { "x-akai-client": "1" },
          })
        ).statusCode,
      ).toBe(401);
      const a = await user();
      const headers = {
        origin: "http://localhost:5173",
        "x-akai-client": "1",
        cookie: "akai_session=" + a.token,
      };
      expect(
        (await app.inject({ url: "/api/v1/community/identity", headers }))
          .statusCode,
      ).toBe(200);
      expect(
        (await app.inject({ url: "/api/v1/community", headers })).statusCode,
      ).toBe(200);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/community/commands",
            headers,
            payload: {
              commandId: randomUUID(),
              action: { type: "boss.start" },
            },
          })
        ).statusCode,
      ).toBe(400);
      expect(
        (
          await app.inject({
            method: "POST",
            url: "/api/v1/admin/event-start",
            headers,
            payload: {},
          })
        ).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });
});
