import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  CommunityCommandSchema,
  COMMUNITY_VERSION,
  addResource,
  LocalSnapshotSchema,
  type CommunityAction,
  type CommunityResult,
  type CommunitySnapshot,
  type CommunityIdentity,
  type GlobalChatSnapshot,
  type PublicPlayer,
} from "@akai/shared";
import { OnlineService, OnlineError, digest, type Account } from "./online.js";
import { CommunityEvents, type Fighter } from "./community-events.js";
import { calendar, competitiveStats, duel, power } from "./community-domain.js";
const requireRule = (
  ok: unknown,
  code = "PRECONDITION_FAILED",
  status = 422,
) => {
  if (!ok) throw new OnlineError(code, status);
};
export class CommunityService {
  readonly events: CommunityEvents;
  constructor(readonly online: OnlineService) {
    this.events = new CommunityEvents(online);
  }
  async global(c: PoolClient) {
    await c.query("SELECT pg_advisory_xact_lock(41652006)");
  }
  async tick() {
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      await this.events.sync(c, this.online.clock());
    });
  }
  async profile(c: PoolClient, id: string) {
    if (
      !(await c.query("SELECT 1 FROM akai_profiles WHERE account_id=$1", [id]))
        .rowCount
    ) {
      const n = Number(
        (await c.query("SELECT count(*) FROM akai_profiles")).rows[0].count,
      );
      requireRule(n < 5000, "COMMUNITY_CAPACITY");
    }
    await c.query(
      "INSERT INTO akai_profiles(account_id,name,joined_at) VALUES($1,$2,$3) ON CONFLICT(account_id) DO NOTHING",
      [id, "Rei-" + id.replace(/-/g, "").slice(0, 20), this.online.clock()],
    );
    return (
      await c.query("SELECT * FROM akai_profiles WHERE account_id=$1", [id])
    ).rows[0];
  }
  async membership(c: PoolClient, id: string) {
    return (
      await c.query(
        "SELECT m.*,g.name,g.level,g.xp,g.emblem,g.bonus_bp,g.bonus_until FROM akai_members m JOIN akai_guilds g ON g.id=m.guild_id WHERE m.account_id=$1 AND g.active",
        [id],
      )
    ).rows[0];
  }
  async command(token: string, input: unknown): Promise<CommunityResult> {
    const cmd = CommunityCommandSchema.parse(input),
      hash = digest(JSON.stringify(cmd));
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      const id = await this.online.identity(token, c);
      await this.profile(c, id);
      const previous = (
        await c.query(
          "SELECT * FROM akai_social_commands WHERE account_id=$1 AND command_id=$2",
          [id, cmd.commandId],
        )
      ).rows[0];
      if (previous) {
        requireRule(
          previous.payload_hash === hash,
          "IDEMPOTENCY_CONFLICT",
          409,
        );
        return previous.result as CommunityResult;
      }
      await this.events.sync(c, this.online.clock());
      const account = await this.online.lock(c, token),
        before = structuredClone(account.snapshot);
      await this.online.settle(c, account);
      let status: "applied" | "rejected" = "applied",
        code = "OK";
      await c.query("SAVEPOINT social_action");
      const settled = structuredClone(account.snapshot);
      try {
        await this.apply(c, account, cmd.action);
      } catch (error) {
        await c.query("ROLLBACK TO SAVEPOINT social_action");
        account.snapshot = settled;
        if (error instanceof OnlineError) {
          status = "rejected";
          code = error.code;
        } else if ((error as { code?: string }).code === "23505") {
          status = "rejected";
          code = "NAME_OR_ACTION_CONFLICT";
        } else throw error;
      }
      await c.query("RELEASE SAVEPOINT social_action");
      await this.online.save(
        c,
        account,
        before,
        "community:" + cmd.action.type + ":" + code,
      );
      const result: CommunityResult = {
        commandId: cmd.commandId,
        status,
        code,
      };
      await c.query(
        "INSERT INTO akai_social_commands(account_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4)",
        [id, cmd.commandId, hash, result],
      );
      await c.query(
        "INSERT INTO akai_social_audit(id,actor,action,payload,at) VALUES($1,$2,$3,$4,$5)",
        [
          randomUUID(),
          id,
          cmd.action.type,
          { commandId: cmd.commandId, status, code },
          this.online.clock(),
        ],
      );
      return result;
    });
  }
  async apply(c: PoolClient, a: Account, action: CommunityAction) {
    const now = this.online.clock(),
      p = await this.profile(c, a.id),
      m = await this.membership(c, a.id),
      k = calendar(now);
    const spend = (coins: number) => {
      requireRule(
        BigInt(a.snapshot.balances.coin) >= BigInt(coins) * 1000n,
        "INSUFFICIENT_COINS",
      );
      addResource(a.snapshot, "coin", -BigInt(coins) * 1000n);
    };
    switch (action.type) {
      case "profile":
        a.snapshot.profile.name = action.name;
        await c.query("UPDATE akai_profiles SET name=$2 WHERE account_id=$1", [
          a.id,
          action.name,
        ]);
        return;
      case "block":
        requireRule(action.accountId !== a.id, "INVALID_TARGET");
        requireRule(
          (
            await c.query("SELECT 1 FROM akai_profiles WHERE account_id=$1", [
              action.accountId,
            ])
          ).rowCount,
          "NOT_FOUND",
          404,
        );
        if (action.blocked)
          await c.query(
            "INSERT INTO akai_blocks(owner,target) VALUES($1,$2) ON CONFLICT DO NOTHING",
            [a.id, action.accountId],
          );
        else
          await c.query(
            "DELETE FROM akai_blocks WHERE owner=$1 AND target=$2",
            [a.id, action.accountId],
          );
        return;
      case "report": {
        const msg = (
          await c.query("SELECT * FROM akai_chat WHERE id=$1 AND NOT removed", [
            action.messageId,
          ])
        ).rows[0];
        requireRule(
          msg &&
            (!msg.guild_id ||
              (m?.guild_id === msg.guild_id &&
                Number(m.joined_at) <= Number(msg.at))),
          "NOT_FOUND",
          404,
        );
        await c.query(
          "INSERT INTO akai_reports(id,reporter,message_id,reason,at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(reporter,message_id) DO NOTHING",
          [randomUUID(), a.id, action.messageId, action.reason, now],
        );
        return;
      }
      case "chat":
        requireRule(a.snapshot.battle.highest >= 1, "COMPLETE_FLOOR_ONE");
        requireRule(Number(p.muted_until) <= now, "CHAT_MUTED", 403);
        requireRule(now - Number(p.last_chat) >= 3000, "CHAT_COOLDOWN", 429);
        requireRule(action.scope === "global" || m, "GUILD_REQUIRED");
        await c.query(
          "INSERT INTO akai_chat(author,guild_id,text,at) VALUES($1,$2,$3,$4)",
          [
            a.id,
            action.scope === "guild" ? m.guild_id : null,
            action.text,
            now,
          ],
        );
        await c.query(
          "UPDATE akai_profiles SET last_chat=$2 WHERE account_id=$1",
          [a.id, now],
        );
        return;
      case "guild.create":
        requireRule(!m && a.snapshot.battle.highest >= 5, "GUILD_REQUIREMENTS");
        spend(500);
        {
          const id = randomUUID();
          await c.query(
            "INSERT INTO akai_guilds(id,name,leader,emblem) VALUES($1,$2,$3,$4)",
            [id, action.name, a.id, JSON.stringify(Array(256).fill(0))],
          );
          await c.query(
            "INSERT INTO akai_members(account_id,guild_id,role,joined_at) VALUES($1,$2,'leader',$3)",
            [a.id, id, now],
          );
        }
        return;
      case "guild.invite":
        requireRule(
          m && ["leader", "officer"].includes(m.role),
          "FORBIDDEN",
          403,
        );
        requireRule(action.accountId !== a.id, "INVALID_TARGET");
        requireRule(
          (
            await c.query(
              "SELECT 1 FROM akai_profiles WHERE account_id=$1 AND NOT suspended",
              [action.accountId],
            )
          ).rowCount,
          "NOT_FOUND",
          404,
        );
        requireRule(
          !(await this.membership(c, action.accountId)),
          "ALREADY_IN_GUILD",
        );
        await c.query(
          "INSERT INTO akai_invites(guild_id,account_id,expires_at) VALUES($1,$2,$3) ON CONFLICT(guild_id,account_id) DO UPDATE SET expires_at=$3",
          [m.guild_id, action.accountId, now + 86400000],
        );
        return;
      case "guild.accept": {
        requireRule(!m, "ALREADY_IN_GUILD");
        const invite = (
          await c.query(
            "SELECT i.*,g.level FROM akai_invites i JOIN akai_guilds g ON g.id=i.guild_id WHERE i.account_id=$1 AND i.guild_id=$2 AND i.expires_at>$3 AND g.active",
            [a.id, action.guildId, now],
          )
        ).rows[0];
        requireRule(invite, "INVITE_EXPIRED");
        const count = Number(
          (
            await c.query(
              "SELECT count(*) FROM akai_members WHERE guild_id=$1",
              [action.guildId],
            )
          ).rows[0].count,
        );
        requireRule(count < 20 + 2 * (Number(invite.level) - 1), "GUILD_FULL");
        await c.query(
          "INSERT INTO akai_members(account_id,guild_id,role,joined_at) VALUES($1,$2,'member',$3)",
          [a.id, action.guildId, now],
        );
        await c.query("DELETE FROM akai_invites WHERE account_id=$1", [a.id]);
        return;
      }
      case "guild.leave":
        requireRule(m, "GUILD_REQUIRED");
        if (m.role === "leader") {
          const count = Number(
            (
              await c.query(
                "SELECT count(*) FROM akai_members WHERE guild_id=$1",
                [m.guild_id],
              )
            ).rows[0].count,
          );
          requireRule(count === 1, "TRANSFER_LEADERSHIP_FIRST");
          await c.query("UPDATE akai_guilds SET active=false WHERE id=$1", [
            m.guild_id,
          ]);
        }
        await c.query("DELETE FROM akai_members WHERE account_id=$1", [a.id]);
        return;
      case "guild.role": {
        requireRule(
          m && ["leader", "officer"].includes(m.role),
          "FORBIDDEN",
          403,
        );
        const target = await this.membership(c, action.accountId);
        requireRule(
          target && target.guild_id === m.guild_id && action.accountId !== a.id,
          "INVALID_TARGET",
        );
        requireRule(
          m.role === "leader" ||
            (action.role === "kick" && target.role === "member"),
          "FORBIDDEN",
          403,
        );
        if (action.role === "kick") {
          await c.query("DELETE FROM akai_members WHERE account_id=$1", [
            action.accountId,
          ]);
          return;
        }
        requireRule(m.role === "leader", "FORBIDDEN", 403);
        if (action.role === "leader") {
          await c.query(
            "UPDATE akai_members SET role='officer' WHERE account_id=$1",
            [a.id],
          );
          await c.query("UPDATE akai_guilds SET leader=$2 WHERE id=$1", [
            m.guild_id,
            action.accountId,
          ]);
        }
        await c.query("UPDATE akai_members SET role=$2 WHERE account_id=$1", [
          action.accountId,
          action.role,
        ]);
        return;
      }
      case "guild.emblem":
        requireRule(m && m.role === "leader", "FORBIDDEN", 403);
        await c.query("UPDATE akai_guilds SET emblem=$2 WHERE id=$1", [
          m.guild_id,
          JSON.stringify(action.pixels),
        ]);
        return;
      case "guild.upgrade":
        requireRule(m && m.role === "leader", "FORBIDDEN", 403);
        requireRule(
          Number(m.level) < 10 && Number(m.xp) >= Number(m.level) * 100,
          "GUILD_LEVEL_REQUIREMENTS",
        );
        spend(Number(m.level) * 1000);
        await c.query("UPDATE akai_guilds SET level=level+1 WHERE id=$1", [
          m.guild_id,
        ]);
        return;
      case "war.enroll": {
        requireRule(m && m.role === "leader", "FORBIDDEN", 403);
        requireRule(now < k.warStart, "REGISTRATION_CLOSED");
        const roster = (
          await c.query(
            "SELECT m.account_id,p.name,a.snapshot FROM akai_members m JOIN akai_profiles p ON p.account_id=m.account_id JOIN akai_accounts a ON a.id=m.account_id WHERE m.guild_id=$1 AND m.joined_at<=$2 AND NOT p.suspended ORDER BY m.account_id",
            [m.guild_id, now - 86400000],
          )
        ).rows.map((r) => ({
          id: r.account_id,
          name: r.name,
          stats: competitiveStats(r.snapshot),
        }));
        requireRule(roster.length >= 2, "TWO_ESTABLISHED_MEMBERS_REQUIRED");
        await c.query(
          "INSERT INTO akai_war_enrollments(season_id,guild_id,roster) VALUES($1,$2,$3) ON CONFLICT(season_id,guild_id) DO UPDATE SET roster=$3",
          [k.season.id, m.guild_id, JSON.stringify(roster)],
        );
        return;
      }
      case "war.attack": {
        const war = (
          await c.query(
            "SELECT * FROM akai_wars WHERE id=$1 AND status='active' AND start_at<=$2 AND end_at>$2",
            [action.warId, now],
          )
        ).rows[0];
        requireRule(war && m, "WAR_UNAVAILABLE");
        const side =
          m.guild_id === war.guild_a
            ? "a"
            : m.guild_id === war.guild_b
              ? "b"
              : null;
        requireRule(side, "FORBIDDEN", 403);
        const own = war[side === "a" ? "roster_a" : "roster_b"] as Fighter[],
          other = war[side === "a" ? "roster_b" : "roster_a"] as Fighter[];
        const index = own.findIndex((r) => r.id === a.id);
        requireRule(index >= 0, "NOT_IN_ROSTER", 403);
        requireRule(
          !(
            await c.query(
              "SELECT 1 FROM akai_war_attacks WHERE war_id=$1 AND account_id=$2",
              [war.id, a.id],
            )
          ).rowCount,
          "ALREADY_ATTACKED",
        );
        const result = duel(
          own[index]!.stats,
          other[index % other.length]!.stats,
        );
        await c.query(
          "INSERT INTO akai_war_attacks(war_id,account_id,side,won,damage) VALUES($1,$2,$3,$4,$5)",
          [war.id, a.id, side, result.won, result.damageBp],
        );
        await c.query(
          `UPDATE akai_wars SET ${side === "a" ? "score_a=score_a+$2,damage_a=damage_a+$3" : "score_b=score_b+$2,damage_b=damage_b+$3"} WHERE id=$1`,
          [war.id, result.won ? 3 : 0, result.damageBp],
        );
        return;
      }
      case "arena": {
        requireRule(
          a.snapshot.battle.highest >= 5 && Number(p.arena_next) <= now,
          "ARENA_COOLDOWN_OR_LEVEL",
        );
        await this.events.arenaEntries(c, k.season.id);
        const own = (
          await c.query(
            "SELECT * FROM akai_arena WHERE season_id=$1 AND account_id=$2",
            [k.season.id, a.id],
          )
        ).rows[0];
        const targets = (
          await c.query(
            "SELECT r.account_id,r.position FROM akai_arena r JOIN akai_profiles p ON p.account_id=r.account_id WHERE r.season_id=$1 AND r.position<$2 AND NOT p.suspended ORDER BY r.position DESC LIMIT 5",
            [k.season.id, own.position],
          )
        ).rows;
        const target = targets.find((r) => r.account_id === action.opponentId);
        requireRule(target, "OPPONENT_NOT_ELIGIBLE");
        const count = Number(
          (
            await c.query(
              "SELECT count(*) FROM akai_matches WHERE attacker=$1 AND at>=$2",
              [a.id, now - 86400000],
            )
          ).rows[0].count,
        );
        requireRule(count < 20, "DAILY_CHALLENGE_LIMIT");
        const defender = await this.online.lockAccount(c, target.account_id);
        const result = duel(
          competitiveStats(a.snapshot),
          competitiveStats(defender.snapshot),
        );
        if (result.won) {
          await c.query(
            "UPDATE akai_arena SET position=CASE WHEN account_id=$2 THEN $4::integer ELSE $5::integer END,trophies=trophies+CASE WHEN account_id=$2 THEN 20 ELSE 0 END WHERE season_id=$1 AND account_id IN ($2,$3)",
            [
              k.season.id,
              a.id,
              target.account_id,
              target.position,
              own.position,
            ],
          );
          if (m && Number(m.joined_at) <= now - 86400000)
            await this.events.points(c, k.season.id, m.guild_id, 1);
        } else
          await c.query(
            "UPDATE akai_arena SET trophies=GREATEST(0,trophies-10) WHERE season_id=$1 AND account_id=$2",
            [k.season.id, a.id],
          );
        await c.query(
          "UPDATE akai_profiles SET arena_next=$2 WHERE account_id=$1",
          [a.id, now + 60000],
        );
        await c.query(
          "INSERT INTO akai_matches(id,season_id,attacker,defender,won,at,result) VALUES($1,$2,$3,$4,$5,$6,$7)",
          [
            randomUUID(),
            k.season.id,
            a.id,
            target.account_id,
            result.won,
            now,
            {
              ...result,
              attackerPosition: own.position,
              defenderPosition: target.position,
              attackerStats: competitiveStats(a.snapshot),
              defenderStats: competitiveStats(defender.snapshot),
            },
          ],
        );
        return;
      }
      case "boss": {
        const event = (
          await c.query(
            "SELECT * FROM akai_bosses WHERE id=$1 AND status='active' AND start_at<=$2 AND end_at>$2",
            ["boss:" + k.date, now],
          )
        ).rows[0];
        requireRule(event, "EVENT_NOT_ACTIVE");
        if (!action.join) {
          await c.query(
            "UPDATE akai_boss_members SET present_until=0,engaged=false WHERE edition=$1 AND account_id=$2",
            [event.id, a.id],
          );
          return;
        }
        requireRule(
          a.snapshot.battle.highest >= 10 && Number(a.presence_until) >= now,
          "COMPLETE_FLOOR_TEN_AND_CONNECT",
        );
        const count = Number(
          (
            await c.query(
              "SELECT count(*) FROM akai_boss_members WHERE edition=$1",
              [event.id],
            )
          ).rows[0].count,
        );
        requireRule(
          count < 200 ||
            (
              await c.query(
                "SELECT 1 FROM akai_boss_members WHERE edition=$1 AND account_id=$2",
                [event.id, a.id],
              )
            ).rowCount,
          "EVENT_CAPACITY",
        );
        await c.query(
          "INSERT INTO akai_boss_members(edition,account_id,next_at,present_until) VALUES($1,$2,$3,$4) ON CONFLICT(edition,account_id) DO UPDATE SET engaged=true,present_until=$4,next_at=GREATEST(akai_boss_members.next_at,$3)",
          [event.id, a.id, now + 1000, now + 3000],
        );
        return;
      }
      case "raid": {
        requireRule(
          now >= k.raidStart &&
            now < k.raidEnd &&
            a.snapshot.battle.highest >= 10,
          "RAID_NOT_AVAILABLE",
        );
        requireRule(
          !(
            await c.query(
              "SELECT 1 FROM akai_raids WHERE edition=$1 AND account_id=$2",
              ["raid:" + k.date, a.id],
            )
          ).rowCount,
          "RAID_ALREADY_PLAYED",
        );
        const hero = competitiveStats(a.snapshot),
          hp = Math.max(100, a.snapshot.battle.highest * 20),
          enemy = {
            attack: Math.max(5, a.snapshot.battle.highest + 3),
            hp,
            defense: 5,
            miningBp: 0,
            productionBp: 0,
          };
        await c.query(
          "INSERT INTO akai_raids(edition,account_id,start_at,end_at,next_at,present_until,state,status) VALUES($1,$2,$3,$4,$5,$6,$7,'active')",
          [
            "raid:" + k.date,
            a.id,
            now,
            k.raidEnd,
            now + 1000,
            now + 3000,
            { heroHp: hero.hp, hp, maxHp: hp, hero, enemy },
          ],
        );
        return;
      }
    }
  }
  /** Header-only read: never settles combat or renews boss/raid presence. */
  async identity(token: string): Promise<CommunityIdentity> {
    return this.online.db.transaction(async (c) => {
      const id = await this.online.identity(token, c);
      const row = (
        await c.query(
          `SELECT COALESCE(p.name,a.snapshot->'profile'->>'name') AS name,g.name AS guild
         FROM akai_accounts a LEFT JOIN akai_profiles p ON p.account_id=a.id
         LEFT JOIN akai_members m ON m.account_id=a.id
         LEFT JOIN akai_guilds g ON g.id=m.guild_id AND g.active WHERE a.id=$1`,
          [id],
        )
      ).rows[0];
      return { name: row.name, ...(row.guild ? { guild: row.guild } : {}) };
    });
  }
  /** Chat-only read: does not settle combat, tick events or renew raid/boss presence. */
  async globalChat(token: string): Promise<GlobalChatSnapshot> {
    return this.online.db.transaction(async (c) => {
      const id = await this.online.identity(token, c);
      const account = (await c.query(`SELECT a.snapshot,p.muted_until,p.suspended
        FROM akai_accounts a LEFT JOIN akai_profiles p ON p.account_id=a.id WHERE a.id=$1`, [id])).rows[0];
      requireRule(!account.suspended, "COMMUNITY_FORBIDDEN", 403);
      const rows = (await c.query(`SELECT x.id::text,x.author,p.name,x.text,x.at,g.emblem
        FROM akai_chat x JOIN akai_profiles p ON p.account_id=x.author
        LEFT JOIN akai_members m ON m.account_id=x.author LEFT JOIN akai_guilds g ON g.id=m.guild_id
        WHERE x.guild_id IS NULL AND NOT x.removed AND NOT p.suspended
        AND NOT EXISTS(SELECT 1 FROM akai_blocks b WHERE b.owner=$1 AND b.target=x.author)
        ORDER BY x.id DESC LIMIT 50`, [id])).rows;
      return { accountId: id, canChat: account.snapshot.battle.highest >= 1,
        mutedUntil: Number(account.muted_until ?? 0), messages: rows.reverse().map(r => ({
          id: r.id, authorId: r.author, name: r.name, text: r.text, at: Number(r.at), emblem: r.emblem ?? null,
        })) };
    });
  }
  async read(token: string): Promise<CommunitySnapshot> {
    return this.online.db.transaction(async (c) => {
      await this.global(c);
      const id = await this.online.identity(token, c);
      const p = await this.profile(c, id),
        now = this.online.clock(),
        k = await this.events.sync(c, now);
      const a = await this.online.lock(c, token),
        before = structuredClone(a.snapshot);
      await this.online.settle(c, a);
      await this.online.save(c, a, before, "community:read");
      const m = await this.membership(c, id);
      if (Number(a.presence_until) >= now) {
        await c.query(
          "UPDATE akai_boss_members SET next_at=CASE WHEN present_until<$3 THEN GREATEST(next_at,$3+1000) ELSE next_at END,present_until=$4 WHERE edition=$1 AND account_id=$2 AND engaged",
          ["boss:" + k.date, id, now, now + 3000],
        );
        await c.query(
          "UPDATE akai_raids SET next_at=CASE WHEN present_until<$3 THEN GREATEST(next_at,$3+1000) ELSE next_at END,present_until=$4 WHERE account_id=$1 AND edition=$2 AND status='active'",
          [id, "raid:" + k.date, now, now + 3000],
        );
      }
      const players = (
        await c.query(
          "SELECT a.id,p.name,a.snapshot FROM akai_accounts a JOIN akai_profiles p ON p.account_id=a.id WHERE NOT p.suspended ORDER BY a.id LIMIT 5000",
        )
      ).rows.map((r) => ({
        id: r.id,
        name: r.name,
        power: power(LocalSnapshotSchema.parse(r.snapshot)),
        floor: Number(r.snapshot.battle.highest),
        coins: String(r.snapshot.balances.coin),
      })) as PublicPlayer[];
      const player = (accountId: string) =>
        players.find((p) => p.id === accountId) ?? {
          id: accountId,
          name: "Aventureiro indisponível",
          power: 0,
          floor: 0,
          coins: "0",
        };
      const chat = async (guild: string | null) => {
        const rows = (
          await c.query(
            `SELECT x.id::text,x.author,p.name,x.text,x.at,g.emblem FROM akai_chat x JOIN akai_profiles p ON p.account_id=x.author LEFT JOIN akai_members m ON m.account_id=x.author LEFT JOIN akai_guilds g ON g.id=m.guild_id WHERE x.guild_id IS NOT DISTINCT FROM $1::uuid AND NOT x.removed AND NOT p.suspended AND x.at>=$3 AND NOT EXISTS(SELECT 1 FROM akai_blocks b WHERE b.owner=$2 AND b.target=x.author) ORDER BY x.id DESC LIMIT 50`,
            [guild, id, guild ? Number(m?.joined_at ?? now) : 0],
          )
        ).rows;
        return rows.reverse().map((r) => ({
          id: r.id,
          authorId: r.author,
          name: r.name,
          text: r.text,
          at: Number(r.at),
          emblem: r.emblem ?? null,
        }));
      };
      const guild = m
        ? {
            id: m.guild_id,
            name: m.name,
            level: Number(m.level),
            xp: Number(m.xp),
            capacity: 20 + 2 * (Number(m.level) - 1),
            emblem: m.emblem,
            members: (
              await c.query(
                "SELECT m.account_id AS id,p.name,m.role FROM akai_members m JOIN akai_profiles p ON p.account_id=m.account_id WHERE m.guild_id=$1 ORDER BY m.role,m.account_id",
                [m.guild_id],
              )
            ).rows,
            bonusBp: Number(m.bonus_until) > now ? Number(m.bonus_bp) : 0,
          }
        : null;
      const arena = (
        await c.query(
          "SELECT * FROM akai_arena WHERE season_id=$1 AND account_id=$2",
          [k.season.id, id],
        )
      ).rows[0];
      const opponents = arena
        ? (
            await c.query(
              "SELECT r.account_id,r.position FROM akai_arena r JOIN akai_profiles p ON p.account_id=r.account_id WHERE r.season_id=$1 AND r.position<$2 AND NOT p.suspended ORDER BY r.position DESC LIMIT 5",
              [k.season.id, arena.position],
            )
          ).rows.map((r) => ({
            ...player(r.account_id),
            position: Number(r.position),
          }))
        : [];
      const boss = (
          await c.query("SELECT * FROM akai_bosses WHERE id=$1", [
            "boss:" + k.date,
          ])
        ).rows[0],
        ownBoss = (
          await c.query(
            "SELECT * FROM akai_boss_members WHERE edition=$1 AND account_id=$2",
            [boss.id, id],
          )
        ).rows[0];
      const lottery = (
          await c.query("SELECT * FROM akai_lotteries WHERE id=$1", [
            "lottery:" + k.date,
          ])
        ).rows[0],
        raid = (
          await c.query(
            "SELECT * FROM akai_raids WHERE edition=$1 AND account_id=$2",
            ["raid:" + k.date, id],
          )
        ).rows[0];
      const board = async (sql: string, args: unknown[]) =>
        (await c.query(sql, args)).rows.map((r) => ({
          name: r.name,
          score: Number(r.score),
        }));
      const wars = m
        ? (
            await c.query(
              "SELECT w.*,ga.name AS name_a,gb.name AS name_b FROM akai_wars w JOIN akai_guilds ga ON ga.id=w.guild_a JOIN akai_guilds gb ON gb.id=w.guild_b WHERE w.season_id=$1 AND (guild_a=$2 OR guild_b=$2) ORDER BY start_at DESC LIMIT 10",
              [k.season.id, m.guild_id],
            )
          ).rows
        : [];
      const played = new Set(
        (
          await c.query(
            "SELECT war_id FROM akai_war_attacks WHERE account_id=$1",
            [id],
          )
        ).rows.map((r) => r.war_id),
      );
      return {
        version: COMMUNITY_VERSION,
        serverTime: now,
        accountId: id,
        name: p.name,
        mutedUntil: Number(p.muted_until),
        suspended: p.suspended,
        season: k.season,
        chat: await chat(null),
        guildChat: m ? await chat(m.guild_id) : [],
        guild,
        invites: (
          await c.query(
            "SELECT g.id,g.name FROM akai_invites i JOIN akai_guilds g ON g.id=i.guild_id WHERE i.account_id=$1 AND i.expires_at>$2 AND g.active ORDER BY g.name",
            [id, now],
          )
        ).rows,
        guilds: (
          await c.query(
            "SELECT id,name,level FROM akai_guilds WHERE active ORDER BY level DESC,name LIMIT 100",
          )
        ).rows,
        arena: {
          position: arena ? Number(arena.position) : null,
          trophies: Number(arena?.trophies ?? 0),
          nextAt: Number(p.arena_next),
          opponents,
          matches: (
            await c.query(
              "SELECT id,won,defender,at FROM akai_matches WHERE attacker=$1 ORDER BY at DESC LIMIT 10",
              [id],
            )
          ).rows.map((r) => ({
            id: r.id,
            won: r.won,
            opponent: player(r.defender).name,
            at: Number(r.at),
          })),
        },
        boss: {
          id: boss.id,
          start: Number(boss.start_at),
          end: Number(boss.end_at),
          hp: Number(boss.hp),
          maxHp: Number(boss.max_hp),
          status: boss.status,
          damage: Number(ownBoss?.damage ?? 0),
          joined:
            !!ownBoss?.engaged && Number(ownBoss?.present_until ?? 0) >= now,
          lastHit: boss.last_hit ? player(boss.last_hit).name : null,
          leaders: (
            await c.query(
              "SELECT b.account_id,b.damage FROM akai_boss_members b JOIN akai_profiles p ON p.account_id=b.account_id WHERE edition=$1 AND NOT p.suspended ORDER BY damage DESC,b.account_id LIMIT 10",
              [boss.id],
            )
          ).rows.map((r) => ({
            name: player(r.account_id).name,
            damage: Number(r.damage),
          })),
        },
        flash: {
          xp: { start: k.xpStart, end: k.xpEnd },
          lottery: {
            at: Number(lottery.at),
            status: lottery.closed ? "closed" : "scheduled",
            winner: lottery.winner ? player(lottery.winner).name : null,
          },
          raid: {
            start: k.raidStart,
            end: k.raidEnd,
            status:
              raid?.status ??
              (now < k.raidStart
                ? "scheduled"
                : now >= k.raidEnd
                  ? "expired"
                  : "available"),
            hp: Number(raid?.state.hp ?? 0),
            heroHp: Number(raid?.state.heroHp ?? 0),
          },
        },
        rankings: {
          power: [...players]
            .sort((a, b) => b.power - a.power || a.id.localeCompare(b.id))
            .slice(0, 20),
          floor: [...players]
            .sort((a, b) => b.floor - a.floor || a.id.localeCompare(b.id))
            .slice(0, 20),
          coins: [...players]
            .sort((a, b) =>
              BigInt(a.coins) === BigInt(b.coins)
                ? a.id.localeCompare(b.id)
                : BigInt(a.coins) > BigInt(b.coins)
                  ? -1
                  : 1,
            )
            .slice(0, 20),
          trophies: await board(
            "SELECT p.name,r.trophies AS score FROM akai_arena r JOIN akai_profiles p ON p.account_id=r.account_id WHERE season_id=$1 AND NOT p.suspended ORDER BY trophies DESC,position LIMIT 20",
            [k.season.id],
          ),
          guilds: await board(
            "SELECT g.name,s.score FROM akai_guild_scores s JOIN akai_guilds g ON g.id=s.guild_id WHERE season_id=$1 AND g.active ORDER BY score DESC,g.id LIMIT 20",
            [k.season.id],
          ),
          damage: await board(
            "SELECT p.name,SUM(m.damage) AS score FROM akai_boss_members m JOIN akai_profiles p ON p.account_id=m.account_id JOIN akai_bosses e ON e.id=m.edition WHERE e.start_at>=$1 AND e.start_at<$2 AND NOT p.suspended GROUP BY p.name,p.account_id ORDER BY SUM(m.damage) DESC,p.account_id LIMIT 20",
            [k.season.start, k.season.end],
          ),
          positions: (
            await c.query(
              "SELECT p.name,r.position FROM akai_arena r JOIN akai_profiles p ON p.account_id=r.account_id WHERE r.season_id=$1 AND NOT p.suspended ORDER BY r.position LIMIT 20",
              [k.season.id],
            )
          ).rows.map((r) => ({ name: r.name, position: Number(r.position) })),
          lastHits: (
            await c.query(
              "SELECT p.name,e.id AS edition FROM akai_bosses e JOIN akai_profiles p ON p.account_id=e.last_hit WHERE NOT p.suspended ORDER BY e.start_at DESC LIMIT 20",
            )
          ).rows,
        },
        wars: wars.map((w) => ({
          id: w.id,
          name: w.name_a + " × " + w.name_b,
          status: w.status,
          start: Number(w.start_at),
          end: Number(w.end_at),
          score: w.score_a + " : " + w.score_b,
          canAttack:
            w.status === "active" &&
            now >= Number(w.start_at) &&
            now < Number(w.end_at) &&
            !played.has(w.id) &&
            [...w.roster_a, ...w.roster_b].some((r: Fighter) => r.id === id),
        })),
        archives: (
          await c.query(
            "SELECT id,start_at,end_at,archive FROM akai_seasons WHERE closed ORDER BY end_at DESC LIMIT 8",
          )
        ).rows.map((r) => ({
          id: r.id,
          start: Number(r.start_at),
          end: Number(r.end_at),
          leaders: (r.archive?.arena ?? [])
            .slice(0, 3)
            .map((x: { name: string }) => x.name),
        })),
        rewards: (
          await c.query(
            "SELECT source,description FROM akai_social_rewards WHERE account_id=$1 ORDER BY at DESC,source LIMIT 20",
            [id],
          )
        ).rows,
      };
    });
  }
}
