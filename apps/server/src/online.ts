import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  CONFIG_VERSION,
  LocalSnapshotSchema,
  newLoopState,
  OnlineCommandSchema,
  advanceCombat,
  applyRpgCommand,
  buyUpgrade,
  heroStats,
  LOOP,
  mineIron,
  ironPerClick,
  addResource,
  produce,
  reconcileBossAbsence,
  retryBattle,
  trainBattle,
  type LocalSnapshot,
  type OnlineState,
  type OnlineSnapshot,
  type CommandResult,
} from "@akai/shared";
import { Database } from "./database.js";
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const secret = () => randomBytes(32).toString("base64url");
export class OnlineError extends Error {
  constructor(
    readonly code: string,
    readonly status = 422,
  ) {
    super(code);
  }
}
export interface Account {
  id: string;
  snapshot: LocalSnapshot;
  state_version: string;
  command_version: string;
  last_at: string;
  presence_until: string;
  click_tokens: number;
  click_at: string;
}
export class OnlineService {
  constructor(
    readonly db: Database,
    readonly clock = () => Date.now(),
  ) {}
  async authLimit(key: string, max = 20): Promise<void> {
    const now = this.clock();
    const r = await this.db.pool.query(
      `INSERT INTO akai_auth_limits(key,window_at,count) VALUES($1,$2,1)
      ON CONFLICT(key) DO UPDATE SET window_at=CASE WHEN akai_auth_limits.window_at<=$2-60000 THEN $2 ELSE akai_auth_limits.window_at END,
      count=CASE WHEN akai_auth_limits.window_at<=$2-60000 THEN 1 ELSE akai_auth_limits.count+1 END RETURNING count`,
      [digest(key), now],
    );
    if (r.rows[0].count > max) throw new OnlineError("RATE_LIMITED", 429);
  }
  async issue(c: PoolClient, id: string) {
    const token = secret();
    await c.query("UPDATE akai_sessions SET revoked=true WHERE account_id=$1", [
      id,
    ]);
    await c.query(
      "INSERT INTO akai_sessions(token_hash,account_id,expires_at) VALUES($1,$2,$3)",
      [digest(token), id, this.clock() + 7 * 86400000],
    );
    return token;
  }
  async guest() {
    return this.db.transaction(async (c) => {
      const id = randomUUID(),
        recoveryKey = secret(),
        now = this.clock();
      const snapshot = LocalSnapshotSchema.parse({
        ...newLoopState(),
        schemaVersion: 3,
        configVersion: CONFIG_VERSION,
        mode: "local",
        generation: 0,
        savedAt: now,
        lastReconciledAt: now,
        profile: { id: "local-test", name: "Reino online" },
        screen: "battle",
        activeMs: 0,
        balances: {
          coin: "0",
          iron: "0",
          coal: "0",
          gold: "0",
          jade: "0",
          ruby: "0",
        },
      });
      snapshot.battle.enemies.forEach(e => e.templateId = "slime-green");
      await c.query(
        "INSERT INTO akai_accounts(id,recovery_hash,snapshot,last_at,click_at,created_at) VALUES($1,$2,$3,$4::bigint,$4::bigint,to_timestamp(($4::bigint)::double precision/1000))",
        [id, digest(recoveryKey), snapshot, now],
      );
      return { accountId: id, recoveryKey, token: await this.issue(c, id) };
    });
  }
  async recover(key: string) {
    return this.db.transaction(async (c) => {
      const r = await c.query(
        "SELECT id FROM akai_accounts WHERE recovery_hash=$1 FOR UPDATE",
        [digest(key)],
      );
      if (!r.rowCount) throw new OnlineError("INVALID_CREDENTIAL", 401);
      const id = r.rows[0].id as string,
        recoveryKey = secret();
      await c.query(
        "UPDATE akai_accounts SET recovery_hash=$2,presence_until=0 WHERE id=$1",
        [id, digest(recoveryKey)],
      );
      return { accountId: id, recoveryKey, token: await this.issue(c, id) };
    });
  }
  async identity(token: string, c: PoolClient) {
    const r = await c.query(
      "SELECT s.account_id FROM akai_sessions s LEFT JOIN akai_profiles p ON p.account_id=s.account_id WHERE token_hash=$1 AND NOT revoked AND expires_at>$2 AND NOT COALESCE(p.suspended,false)",
      [digest(token), this.clock()],
    );
    if (!r.rowCount) throw new OnlineError("UNAUTHENTICATED", 401);
    return r.rows[0].account_id as string;
  }
  async lock(c: PoolClient, token: string): Promise<Account> {
    const id = await this.identity(token, c);
    const row = (
      await c.query("SELECT * FROM akai_accounts WHERE id=$1 FOR UPDATE", [id])
    ).rows[0] as Account;
    await this.identity(token, c); // recheck after waiting for a recovery/logout transaction
    row.snapshot = LocalSnapshotSchema.parse(row.snapshot);
    return row;
  }
  private view(a: Account): OnlineState {
    const { rng: _rng, ...rpg } = a.snapshot.rpg;
    const snapshot: OnlineSnapshot = {
      ...a.snapshot,
      mode: "online",
      profile: { id: a.id, name: a.snapshot.profile.name },
      rpg,
    };
    return {
      snapshot,
      stateVersion: Number(a.state_version),
      commandVersion: Number(a.command_version),
      serverTime: this.clock(),
    };
  }
  async lockAccount(c: PoolClient, id: string): Promise<Account> {
    const row = (
      await c.query("SELECT * FROM akai_accounts WHERE id=$1 FOR UPDATE", [id])
    ).rows[0] as Account | undefined;
    if (!row) throw new OnlineError("NOT_FOUND", 404);
    row.snapshot = LocalSnapshotSchema.parse(row.snapshot);
    return row;
  }
  async settle(c: PoolClient, a: Account): Promise<void> {
    const now = Math.max(this.clock(), Number(a.last_at)),
      start = Number(a.last_at),
      elapsed = now - start,
      s = a.snapshot;
    if (elapsed) {
      const active = Math.min(
        elapsed,
        Math.max(0, Number(a.presence_until) - start),
        5000,
      );
      if (active) {
        const windows = (
          await c.query(
            "SELECT start_at,end_at,bp FROM akai_xp_windows WHERE start_at<$2 AND end_at>$1",
            [start, start + active],
          )
        ).rows;
        const guild = (
          await c.query(
            "SELECT g.bonus_bp,g.bonus_until,m.joined_at FROM akai_members m JOIN akai_guilds g ON g.id=m.guild_id WHERE m.account_id=$1 AND g.active AND g.bonus_until>$2",
            [a.id, start],
          )
        ).rows[0];
        const benefits = (
          await c.query(
            "SELECT kind,start_at,end_at FROM akai_ad_benefits WHERE account_id=$1 AND start_at<$3 AND end_at>$2",
            [a.id, start, start + active],
          )
        ).rows;
        const guildEdges = guild
          ? [
              Number(guild.bonus_until),
              Number(guild.joined_at) + 86400000,
            ].filter((at) => at > start && at < start + active)
          : [];
        const edges = [
          ...new Set([
            start,
            start + active,
            ...guildEdges,
            ...benefits.flatMap((w) => [
              Math.max(start, Number(w.start_at)),
              Math.min(start + active, Number(w.end_at)),
            ]),
            ...windows.flatMap((w) => [
              Math.max(start, Number(w.start_at)),
              Math.min(start + active, Number(w.end_at)),
            ]),
          ]),
        ].sort((x, y) => x - y);
        for (let i = 0; i < edges.length - 1; i++) {
          const at = edges[i]!,
            end = edges[i + 1]!;
          const bp =
            10000 +
            Math.max(
              0,
              ...windows
                .filter(
                  (w) => Number(w.start_at) <= at && Number(w.end_at) > at,
                )
                .map((w) => Number(w.bp)),
            ) +
            (guild &&
            Number(guild.bonus_until) > at &&
            Number(guild.joined_at) + 86400000 <= at
              ? Number(guild.bonus_bp)
              : 0);
          const benefit = (kind: string) =>
            benefits.find(
              (w) =>
                w.kind === kind &&
                Number(w.start_at) <= at &&
                Number(w.end_at) > at,
            );
          const rewards = benefit("battle_rewards") ? 2 : 1;
          advanceCombat(
            s,
            end - at,
            at,
            randomInt,
            bp * rewards,
            benefit("battle_damage") ? 20000 : 10000,
            rewards * 10000,
            (instant) => {
              const has = (kind: string) =>
                benefits.some(
                  (w) =>
                    w.kind === kind &&
                    Number(w.start_at) <= instant &&
                    Number(w.end_at) > instant,
                );
              const eventBp =
                10000 +
                Math.max(
                  0,
                  ...windows
                    .filter(
                      (w) =>
                        Number(w.start_at) <= instant &&
                        Number(w.end_at) > instant,
                    )
                    .map((w) => Number(w.bp)),
                ) +
                (guild &&
                Number(guild.bonus_until) > instant &&
                Number(guild.joined_at) + 86400000 <= instant
                  ? Number(guild.bonus_bp)
                  : 0);
              return {
                xpBp: eventBp * (has("battle_rewards") ? 2 : 1),
                damageBp: has("battle_damage") ? 20000 : 10000,
                coinBp: has("battle_rewards") ? 20000 : 10000,
              };
            },
          );
          const auto = benefit("autoclick");
          if (auto) {
            const anchor = Number(auto.start_at),
              clicks =
                Math.floor(((end - anchor) * 3) / 1000) -
                Math.floor(((at - anchor) * 3) / 1000);
            if (clicks) {
              addResource(s, "iron", ironPerClick(s) * BigInt(clicks));
              s.tutorial.mined = true;
            }
          }
        }
        produce(s, active);
        s.activeMs += active;
        s.lastReconciledAt += active;
      }
      const absent = elapsed - active;
      if (absent) {
        reconcileBossAbsence(s, absent);
        produce(s, Math.min(absent, LOOP.offlineMs));
      }
      s.lastReconciledAt = now;
      s.savedAt = now;
    }
    a.last_at = String(now);
  }
  async presence(c: PoolClient, a: Account, present: boolean) {
    const now = this.clock();
    const last = (
      await c.query(
        "SELECT * FROM akai_presence WHERE account_id=$1 ORDER BY end_at DESC LIMIT 1",
        [a.id],
      )
    ).rows[0];
    if (!present) {
      if (last && Number(last.end_at) > now)
        await c.query("UPDATE akai_presence SET end_at=$2 WHERE id=$1", [
          last.id,
          now,
        ]);
      return;
    }
    const eligible =
      !!(
        await c.query(
          "SELECT 1 FROM akai_accounts a JOIN akai_profiles p ON p.account_id=a.id WHERE a.id=$1 AND a.google_sub IS NOT NULL AND NOT p.suspended AND a.created_at<=to_timestamp($2::double precision/1000)",
          [a.id, now - 600000],
        )
      ).rowCount && a.snapshot.battle.highest >= 10;
    if (last && Number(last.end_at) >= now && last.eligible === eligible)
      await c.query("UPDATE akai_presence SET end_at=$2 WHERE id=$1", [
        last.id,
        now + 3000,
      ]);
    else {
      if (last && Number(last.end_at) > now)
        await c.query("UPDATE akai_presence SET end_at=$2 WHERE id=$1", [
          last.id,
          now,
        ]);
      await c.query(
        "INSERT INTO akai_presence(id,account_id,start_at,end_at,eligible) VALUES($1,$2,$3,$4,$5)",
        [randomUUID(), a.id, now, now + 3000, eligible],
      );
    }
  }
  async save(c: PoolClient, a: Account, before: LocalSnapshot, reason: string) {
    a.snapshot = LocalSnapshotSchema.parse(a.snapshot);
    a.state_version = String(Number(a.state_version) + 1);
    const sequence = Number(a.state_version);
    for (const resource of [
      "coin",
      "iron",
      "coal",
      "gold",
      "jade",
      "ruby",
      "castIron",
    ] as const) {
      const old =
        resource === "castIron"
          ? before.rpg.castIron
          : before.balances[resource];
      const balance =
        resource === "castIron"
          ? a.snapshot.rpg.castIron
          : a.snapshot.balances[resource];
      const delta = BigInt(balance) - BigInt(old);
      if (delta)
        await c.query(
          "INSERT INTO akai_ledger(account_id,sequence,resource,delta,balance,reason) VALUES($1,$2,$3,$4,$5,$6)",
          [a.id, sequence, resource, String(delta), balance, reason],
        );
    }
    await c.query(
      `UPDATE akai_accounts SET snapshot=$2,state_version=$3,command_version=$4,last_at=$5,presence_until=$6,click_tokens=$7,click_at=$8 WHERE id=$1`,
      [
        a.id,
        a.snapshot,
        sequence,
        a.command_version,
        a.last_at,
        a.presence_until,
        a.click_tokens,
        a.click_at,
      ],
    );
    // Durable outbox is also the reconnect stream. Never grants on delivery.
    await c.query(
      "INSERT INTO akai_events(account_id,sequence,event_id,payload) VALUES($1,$2,$3,$4)",
      [
        a.id,
        sequence,
        randomUUID(),
        {
          type: "state.committed",
          stateVersion: sequence,
          commandVersion: Number(a.command_version),
          reason,
        },
      ],
    );
  }
  async state(token: string, present = true): Promise<OnlineState> {
    return this.db.transaction(async (c) => {
      const a = await this.lock(c, token),
        before = structuredClone(a.snapshot);
      await this.settle(c, a);
      a.presence_until = String(present ? this.clock() + 3000 : 0);
      await this.presence(c, a, present);
      await this.save(c, a, before, present ? "sync" : "absence");
      return this.view(a);
    });
  }
  async command(token: string, input: unknown): Promise<CommandResult> {
    const cmd = OnlineCommandSchema.parse(input),
      hash = digest(JSON.stringify(cmd));
    return this.db.transaction(async (c) => {
      const a = await this.lock(c, token);
      const previous = (
        await c.query(
          "SELECT payload_hash,result FROM akai_commands WHERE account_id=$1 AND command_id=$2",
          [a.id, cmd.commandId],
        )
      ).rows[0];
      if (previous) {
        if (previous.payload_hash !== hash)
          throw new OnlineError("IDEMPOTENCY_CONFLICT", 409);
        return previous.result as CommandResult;
      }
      const before = structuredClone(a.snapshot);
      await this.settle(c, a);
      let code = "OK",
        ok = false;
      if (cmd.expectedVersion !== Number(a.command_version))
        code = "VERSION_CONFLICT";
      else {
        const draft = structuredClone(a.snapshot),
          action = cmd.action;
        if (action.type === "mining.click") {
          const now = Math.max(this.clock(), Number(a.click_at));
          a.click_tokens = Math.min(
            10,
            a.click_tokens + (now - Number(a.click_at)) / 100,
          );
          a.click_at = String(now);
          if (a.click_tokens < 1) code = "RATE_LIMITED";
          else {
            a.click_tokens--;
            mineIron(draft);
            ok = true;
          }
        } else if (action.type === "upgrade")
          ok = buyUpgrade(draft, action.kind);
        else if (action.type === "rpg")
          ok = applyRpgCommand(draft, action.command, randomInt);
        else if (action.action === "retry") ok = retryBattle(draft);
        else if (action.action === "train") ok = trainBattle(draft);
        else if (
          draft.battle.phase !== "failed" &&
          draft.battle.phase !== "complete"
        ) {
          draft.battle.paused = action.action === "pause";
          ok = true;
        }
        if (ok) {
          draft.battle.heroHp = Math.min(
            draft.battle.heroHp,
            heroStats(draft).hp,
          );
          a.snapshot = draft;
          a.command_version = String(Number(a.command_version) + 1);
        } else if (code === "OK") code = "PRECONDITION_FAILED";
      }
      await this.save(c, a, before, ok ? cmd.action.type : `rejected:${code}`);
      const result: CommandResult = {
        commandId: cmd.commandId,
        status: ok ? "applied" : "rejected",
        code,
        stateVersion: Number(a.state_version),
        commandVersion: Number(a.command_version),
      };
      await c.query(
        "INSERT INTO akai_commands(account_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4)",
        [a.id, cmd.commandId, hash, result],
      );
      return result;
    });
  }
  async result(token: string, id: string) {
    return this.db.transaction(async (c) => {
      const account = await this.identity(token, c);
      const row = (
        await c.query(
          "SELECT result FROM akai_commands WHERE account_id=$1 AND command_id=$2",
          [account, id],
        )
      ).rows[0];
      if (!row) throw new OnlineError("NOT_FOUND", 404);
      return row.result as CommandResult;
    });
  }
  async events(token: string, cursor: number) {
    return this.db.transaction(async (c) => {
      const id = await this.identity(token, c);
      return (
        await c.query(
          "SELECT sequence,event_id,payload FROM akai_events WHERE account_id=$1 AND sequence>$2 ORDER BY sequence LIMIT 100",
          [id, cursor],
        )
      ).rows;
    });
  }
  async openStream(token: string) {
    return this.db.transaction(async (c) => {
      const a = await this.lock(c, token),
        now = this.clock();
      await c.query(
        "DELETE FROM akai_streams WHERE account_id=$1 AND expires_at<=$2",
        [a.id, now],
      );
      const count = Number(
        (
          await c.query(
            "SELECT count(*) FROM akai_streams WHERE account_id=$1",
            [a.id],
          )
        ).rows[0].count,
      );
      if (count >= 2) throw new OnlineError("TOO_MANY_STREAMS", 429);
      const id = randomUUID();
      await c.query(
        "INSERT INTO akai_streams(id,account_id,expires_at) VALUES($1,$2,$3)",
        [id, a.id, now + 10000],
      );
      return id;
    });
  }
  async renewStream(id: string) {
    const r = await this.db.pool.query(
      "UPDATE akai_streams SET expires_at=$2 WHERE id=$1 AND expires_at>$3",
      [id, this.clock() + 10000, this.clock()],
    );
    if (!r.rowCount) throw new OnlineError("STREAM_EXPIRED", 401);
  }
  async closeStream(id: string) {
    await this.db.pool.query("DELETE FROM akai_streams WHERE id=$1", [id]);
  }
  async logout(token: string) {
    return this.db.transaction(async (c) => {
      const a = await this.lock(c, token),
        before = structuredClone(a.snapshot);
      await this.settle(c, a);
      a.presence_until = "0";
      await this.presence(c, a, false);
      await this.save(c, a, before, "logout");
      await c.query(
        "UPDATE akai_sessions SET revoked=true WHERE token_hash=$1",
        [digest(token)],
      );
    });
  }
}
