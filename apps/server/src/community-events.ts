import { randomInt, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import {
  addResource,
  createEquipment,
  ITEM_IDS,
  type LocalSnapshot,
} from "@akai/shared";
import { OnlineService } from "./online.js";
import { calendar, competitiveStats } from "./community-domain.js";
export type Fighter = {
  id: string;
  name: string;
  stats: ReturnType<typeof competitiveStats>;
};
export class CommunityEvents {
  constructor(readonly online: OnlineService) {}
  async reward(
    c: PoolClient,
    source: string,
    id: string,
    description: string,
    apply: (s: LocalSnapshot) => void,
  ) {
    const inserted = await c.query(
      "INSERT INTO akai_social_rewards(source,account_id,description,at) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING source",
      [source, id, description, this.online.clock()],
    );
    if (!inserted.rowCount) return false;
    const account = await this.online.lockAccount(c, id),
      before = structuredClone(account.snapshot);
    await this.online.settle(c, account);
    apply(account.snapshot);
    await this.online.save(c, account, before, source);
    return true;
  }
  async coins(
    c: PoolClient,
    source: string,
    id: string,
    amount: number,
    description: string,
  ) {
    return this.reward(c, source, id, description, (s) =>
      addResource(s, "coin", BigInt(amount) * 1000n),
    );
  }
  async points(c: PoolClient, season: string, guild: string, points: number) {
    if (points <= 0) return;
    await c.query("UPDATE akai_guilds SET xp=xp+$2 WHERE id=$1", [
      guild,
      points,
    ]);
    await c.query(
      "INSERT INTO akai_guild_scores(season_id,guild_id,score) VALUES($1,$2,$3) ON CONFLICT(season_id,guild_id) DO UPDATE SET score=akai_guild_scores.score+$3",
      [season, guild, points],
    );
  }
  async ensure(c: PoolClient, now: number) {
    const k = calendar(now);
    await c.query(
      "INSERT INTO akai_seasons(id,start_at,end_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [k.season.id, k.season.start, k.season.end],
    );
    await c.query(
      "INSERT INTO akai_bosses(id,start_at,end_at,hp,max_hp,status) VALUES($1,$2,$3,1000000,1000000,'scheduled') ON CONFLICT DO NOTHING",
      ["boss:" + k.date, k.bossStart, k.bossEnd],
    );
    await c.query(
      "INSERT INTO akai_xp_windows(id,start_at,end_at,bp) VALUES($1,$2,$3,3000) ON CONFLICT DO NOTHING",
      ["xp:" + k.date, k.xpStart, k.xpEnd],
    );
    await c.query(
      "INSERT INTO akai_lotteries(id,at) VALUES($1,$2) ON CONFLICT DO NOTHING",
      ["lottery:" + k.date, k.lotteryAt],
    );
    return k;
  }
  async arenaEntries(c: PoolClient, season: string) {
    const players = (
      await c.query(
        `SELECT p.account_id FROM akai_profiles p JOIN akai_accounts a ON a.id=p.account_id WHERE NOT p.suspended AND (a.snapshot->'battle'->>'highest')::int>=5 AND NOT EXISTS(SELECT 1 FROM akai_arena r WHERE r.season_id=$1 AND r.account_id=p.account_id) ORDER BY p.joined_at,p.account_id`,
        [season],
      )
    ).rows;
    let next = Number(
      (
        await c.query(
          "SELECT COALESCE(MAX(position),0) AS n FROM akai_arena WHERE season_id=$1",
          [season],
        )
      ).rows[0].n,
    );
    for (const row of players)
      await c.query(
        "INSERT INTO akai_arena(season_id,account_id,position) VALUES($1,$2,$3)",
        [season, row.account_id, ++next],
      );
  }
  async bosses(c: PoolClient, now: number) {
    const bosses = (
      await c.query(
        "SELECT * FROM akai_bosses WHERE status<>'closed' AND start_at<=$1 ORDER BY start_at",
        [now],
      )
    ).rows;
    for (const boss of bosses) {
      let hp = Number(boss.hp);
      await c.query("UPDATE akai_bosses SET status='active' WHERE id=$1", [
        boss.id,
      ]);
      const rows = (
        await c.query(
          `SELECT b.*,a.snapshot,a.presence_until,m.guild_id,m.joined_at AS guild_joined,p.suspended FROM akai_boss_members b JOIN akai_accounts a ON a.id=b.account_id JOIN akai_profiles p ON p.account_id=a.id LEFT JOIN akai_members m ON m.account_id=a.id WHERE b.edition=$1 ORDER BY b.account_id`,
          [boss.id],
        )
      ).rows;
      let steps = 0;
      while (hp > 0 && steps < 10000) {
        const eligible = rows.filter(
          (r) =>
            !r.suspended &&
            Number(r.next_at) <=
              Math.min(
                now,
                Number(r.present_until),
                Number(r.presence_until),
                Number(boss.end_at),
              ),
        );
        eligible.sort(
          (a, b) =>
            Number(a.next_at) - Number(b.next_at) ||
            String(a.account_id).localeCompare(b.account_id),
        );
        const actor = eligible[0];
        if (!actor) break;
        steps++;
        const at = Number(actor.next_at),
          others =
            actor.guild_id &&
            Number(actor.guild_joined) <= Number(boss.start_at)
              ? rows.filter(
                  (r) =>
                    r.account_id !== actor.account_id &&
                    r.guild_id === actor.guild_id &&
                    Number(r.guild_joined) <= Number(boss.start_at) &&
                    !r.suspended &&
                    Number(r.present_until) >= at &&
                    Number(r.presence_until) >= at,
                ).length
              : 0;
        const damage = Math.min(
          hp,
          Math.max(
            1,
            Math.floor(
              (competitiveStats(actor.snapshot).attack *
                (100 + Math.min(20, others))) /
                100,
            ),
          ),
        );
        hp -= damage;
        actor.damage = Number(actor.damage) + damage;
        actor.next_at = at + 1000;
        if (hp === 0) {
          boss.last_hit = actor.account_id;
          break;
        }
      }
      for (const r of rows)
        await c.query(
          "UPDATE akai_boss_members SET damage=$3,next_at=$4 WHERE edition=$1 AND account_id=$2",
          [boss.id, r.account_id, r.damage, r.next_at],
        );
      const closed = hp === 0 || now >= Number(boss.end_at);
      await c.query(
        "UPDATE akai_bosses SET hp=$2,status=$3,last_hit=$4 WHERE id=$1",
        [boss.id, hp, closed ? "closed" : "active", boss.last_hit],
      );
      if (closed) {
        const contributors = rows
          .filter((r) => Number(r.damage) > 0 && !r.suspended)
          .sort(
            (a, b) =>
              Number(b.damage) - Number(a.damage) ||
              a.account_id.localeCompare(b.account_id),
          );
        for (let rank = 0; rank < contributors.length; rank++) {
          const r = contributors[rank]!,
            coins =
              50 +
              Math.floor((Number(r.damage) / Number(boss.max_hp)) * 1000) +
              (rank < 3 ? [200, 100, 50][rank]! : 0);
          await this.coins(
            c,
            boss.id + ":contribution",
            r.account_id,
            coins,
            `Boss diário: ${coins} Coins por contribuição.`,
          );
          if (r.guild_id && Number(r.guild_joined) <= Number(boss.start_at))
            await this.points(
              c,
              calendar(Number(boss.start_at)).season.id,
              r.guild_id,
              Math.max(1, Math.floor(Number(r.damage) / 100)),
            );
        }
        if (boss.last_hit)
          await this.coins(
            c,
            boss.id + ":last-hit",
            boss.last_hit,
            500,
            "Último golpe do boss: 500 Coins.",
          );
      }
    }
  }
  async lotteries(c: PoolClient, now: number) {
    for (const event of (
      await c.query(
        "SELECT * FROM akai_lotteries WHERE NOT closed AND at<=$1 ORDER BY at",
        [now],
      )
    ).rows) {
      const candidates = (
        await c.query(
          "SELECT DISTINCT h.account_id FROM akai_presence h JOIN akai_profiles p ON p.account_id=h.account_id WHERE h.eligible AND h.start_at<=$1 AND h.end_at>=$1 AND NOT p.suspended ORDER BY h.account_id",
          [event.at],
        )
      ).rows.map((r) => r.account_id as string);
      const winner = candidates.length
        ? candidates[randomInt(candidates.length)]!
        : null;
      await c.query(
        "UPDATE akai_lotteries SET closed=true,winner=$2,eligible=$3 WHERE id=$1",
        [event.id, winner, JSON.stringify(candidates)],
      );
      if (winner)
        await this.reward(c, event.id, winner, "Loteria: 100 Rubies.", (s) => {
          s.balances.ruby = String(BigInt(s.balances.ruby) + 100000n);
        });
    }
  }
  async raids(c: PoolClient, now: number) {
    for (const raid of (
      await c.query(
        "SELECT r.*,a.presence_until,p.suspended FROM akai_raids r JOIN akai_accounts a ON a.id=r.account_id JOIN akai_profiles p ON p.account_id=a.id WHERE r.status='active' ORDER BY r.account_id",
      )
    ).rows) {
      const state = raid.state as {
        heroHp: number;
        hp: number;
        maxHp: number;
        hero: ReturnType<typeof competitiveStats>;
        enemy: ReturnType<typeof competitiveStats>;
      };
      let next = Number(raid.next_at);
      const until = Math.min(
        now,
        Number(raid.end_at),
        Number(raid.present_until),
        Number(raid.presence_until),
      );
      while (
        !raid.suspended &&
        next <= until &&
        state.heroHp > 0 &&
        state.hp > 0
      ) {
        state.hp = Math.max(
          0,
          state.hp -
            Math.max(
              1,
              Math.floor(
                (state.hero.attack * 100) / (100 + state.enemy.defense),
              ),
            ),
        );
        if (state.hp > 0)
          state.heroHp = Math.max(
            0,
            state.heroHp -
              Math.max(
                1,
                Math.floor(
                  (state.enemy.attack * 100) / (100 + state.hero.defense),
                ),
              ),
          );
        next += 1000;
      }
      const status =
        state.hp === 0
          ? "won"
          : state.heroHp === 0
            ? "lost"
            : now >= Number(raid.end_at) || raid.suspended
              ? "expired"
              : "active";
      await c.query(
        "UPDATE akai_raids SET state=$3,next_at=$4,status=$5 WHERE edition=$1 AND account_id=$2",
        [raid.edition, raid.account_id, state, next, status],
      );
      if (status === "won")
        await this.reward(
          c,
          raid.edition,
          raid.account_id,
          "Raid vencida: baú de equipamento aberto.",
          (s) => {
            const r = randomInt(10000),
              rarity =
                r < 7000
                  ? "uncommon"
                  : r < 9500
                    ? "rare"
                    : r < 9950
                      ? "epic"
                      : "legendary";
            const item = createEquipment(
              s,
              ITEM_IDS[randomInt(ITEM_IDS.length)]!,
              Math.min(100, Math.max(1, Math.ceil(s.battle.highest / 10))),
              rarity,
              randomInt,
            );
            if (s.rpg.inventory.length < 120) s.rpg.inventory.push(item);
            else addResource(s, "iron", BigInt(item.level * 10) * 1000n);
            s.rpg.lootSerial++;
            s.rpg.lastLoot = "Baú da raid: " + rarity;
          },
        );
    }
  }
  async wars(c: PoolClient, now: number) {
    for (const season of (
      await c.query(
        "SELECT * FROM akai_seasons WHERE NOT closed ORDER BY start_at",
      )
    ).rows) {
      const k = calendar(Number(season.start_at)),
        start = k.warStart,
        end = k.warEnd;
      if (now < start) continue;
      const enrollments = (
        await c.query(
          `SELECT e.* FROM akai_war_enrollments e JOIN akai_guilds g ON g.id=e.guild_id WHERE e.season_id=$1 AND g.active ORDER BY g.level DESC,e.guild_id`,
          [season.id],
        )
      ).rows;
      const assigned = new Set(
        (
          await c.query(
            "SELECT guild_a,guild_b FROM akai_wars WHERE season_id=$1",
            [season.id],
          )
        ).rows.flatMap((r) => [r.guild_a, r.guild_b]),
      );
      const available = enrollments.filter((e) => !assigned.has(e.guild_id));
      for (let i = 0; i + 1 < available.length; i += 2) {
        const a = available[i]!,
          b = available[i + 1]!;
        const roster = async (g: typeof a) => {
          const ids = (
            await c.query(
              "SELECT m.account_id FROM akai_members m JOIN akai_profiles p ON p.account_id=m.account_id WHERE m.guild_id=$1 AND NOT p.suspended",
              [g.guild_id],
            )
          ).rows.map((r) => r.account_id);
          return (g.roster as Fighter[]).filter((r) => ids.includes(r.id));
        };
        const ra = await roster(a),
          rb = await roster(b);
        if (ra.length < 2 || rb.length < 2) continue;
        await c.query(
          "INSERT INTO akai_wars(id,season_id,guild_a,guild_b,start_at,end_at,status,roster_a,roster_b) VALUES($1,$2,$3,$4,$5,$6,'active',$7,$8)",
          [
            randomUUID(),
            season.id,
            a.guild_id,
            b.guild_id,
            start,
            end,
            JSON.stringify(ra),
            JSON.stringify(rb),
          ],
        );
      }
    }
    for (const war of (
      await c.query(
        "SELECT * FROM akai_wars WHERE status='active' AND end_at<=$1 ORDER BY end_at",
        [now],
      )
    ).rows) {
      const points = Number(war.score_a) - Number(war.score_b),
        damage = Number(war.damage_a) - Number(war.damage_b),
        difference = points || damage,
        winner = difference === 0 ? "draw" : difference > 0 ? "a" : "b";
      await c.query("UPDATE akai_wars SET status=$2 WHERE id=$1", [
        war.id,
        winner,
      ]);
      for (const attack of (
        await c.query("SELECT * FROM akai_war_attacks WHERE war_id=$1", [
          war.id,
        ])
      ).rows) {
        const amount =
          winner === "draw" ? 250 : attack.side === winner ? 500 : 100;
        await this.coins(
          c,
          "war:" + war.id,
          attack.account_id,
          amount,
          `Guerra de guildas: ${amount} Coins.`,
        );
      }
      if (winner !== "draw")
        await this.points(
          c,
          war.season_id,
          winner === "a" ? war.guild_a : war.guild_b,
          100,
        );
    }
  }
  async closeSeasons(c: PoolClient, now: number) {
    for (const season of (
      await c.query(
        "SELECT * FROM akai_seasons WHERE NOT closed AND end_at<=$1 ORDER BY end_at",
        [now],
      )
    ).rows) {
      const arena = (
        await c.query(
          "SELECT r.*,p.name FROM akai_arena r JOIN akai_profiles p ON p.account_id=r.account_id WHERE r.season_id=$1 AND NOT p.suspended ORDER BY r.trophies DESC,r.position,r.account_id",
          [season.id],
        )
      ).rows;
      const guilds = (
        await c.query(
          "SELECT s.*,g.name FROM akai_guild_scores s JOIN akai_guilds g ON g.id=s.guild_id WHERE s.season_id=$1 AND g.active AND s.score>0 ORDER BY s.score DESC,s.guild_id",
          [season.id],
        )
      ).rows;
      const damage = (
        await c.query(
          "SELECT b.account_id,SUM(b.damage)::text AS damage FROM akai_boss_members b JOIN akai_bosses e ON e.id=b.edition WHERE e.start_at>=$1 AND e.start_at<$2 GROUP BY b.account_id ORDER BY SUM(b.damage) DESC,b.account_id",
          [season.start_at, season.end_at],
        )
      ).rows;
      await c.query(
        "UPDATE akai_seasons SET closed=true,archive=$2 WHERE id=$1",
        [season.id, { arena, guilds, damage }],
      );
      const contenders = arena.slice(0, 0);
      for (const r of arena)
        if (
          (
            await c.query(
              "SELECT 1 FROM akai_matches WHERE season_id=$1 AND (attacker=$2 OR defender=$2) LIMIT 1",
              [season.id, r.account_id],
            )
          ).rowCount
        )
          contenders.push(r);
      for (let i = 0; i < Math.min(3, contenders.length); i++)
        await this.coins(
          c,
          "season:" + season.id + ":arena",
          contenders[i].account_id,
          [500, 300, 100][i]!,
          `Temporada encerrada: prêmio de arena #${i + 1}.`,
        );
      await c.query("UPDATE akai_guilds SET bonus_bp=0");
      for (let i = 0; i < guilds.length; i++) {
        const g = guilds[i]!,
          bp =
            i === 0 ? 1000 : i === 1 ? 700 : i === 2 ? 500 : i < 10 ? 300 : 100;
        await c.query(
          "UPDATE akai_guilds SET bonus_bp=$2,bonus_until=$3 WHERE id=$1",
          [g.guild_id, bp, calendar(Number(season.end_at)).season.end],
        );
        if (i < 3)
          for (const member of (
            await c.query(
              "SELECT m.account_id FROM akai_members m JOIN akai_profiles p ON p.account_id=m.account_id WHERE m.guild_id=$1 AND m.joined_at<=$2 AND NOT p.suspended",
              [g.guild_id, Number(season.end_at) - 86400000],
            )
          ).rows)
            await this.coins(
              c,
              "season:" + season.id + ":guild",
              member.account_id,
              [300, 200, 100][i]!,
              `Temporada de guildas: prêmio #${i + 1}.`,
            );
      }
    }
  }
  async sync(c: PoolClient, now: number) {
    const k = await this.ensure(c, now);
    await this.bosses(c, now);
    await this.raids(c, now);
    await this.wars(c, now);
    await this.lotteries(c, now);
    await this.closeSeasons(c, now);
    await this.arenaEntries(c, k.season.id);
    return k;
  }
}
