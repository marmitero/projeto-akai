import type { LocalSnapshot } from "./index.js";
import { CONTENT, levelFromXp, floorDefinition } from "./content.js";
import { gearStats, awardRpgDeath, addResource } from "./rpg.js";
export const LOOP = {
  version: "local-rpg-1",
  floors: CONTENT.maxFloor,
  transitionMs: 3000,
  bossMs: 30000,
  offlineMs: 8 * 60 * 60 * 1000,
  maxLevel: CONTENT.maxUpgrade,
} as const;
export type Upgrade = "attack" | "vitality" | "click" | "coal";
export const heroStats = (s: LocalSnapshot, wallAt = s.lastReconciledAt) => {
  const gear = gearStats(s),
    level = levelFromXp(s.rpg.heroXp),
    petHp = s.rpg.petActive ? s.rpg.petLevel * 5 : 0;
  return {
    hp: 100 + 15 * s.upgrades.vitality + gear.hp + 10 * (level - 1) + petHp,
    attack: Math.floor(
      ((6 + 2 * s.upgrades.attack + gear.attack + 2 * (level - 1)) *
        (s.rpg.attackBuffUntil > wallAt ? 120 : 100)) /
        100,
    ),
    defense: gear.defense,
  };
};
export const floorStats = floorDefinition;
function curve(base: number, growth: number, n: number, anchor = 20): number {
  return n <= anchor
    ? Math.ceil(base * growth ** n)
    : Math.ceil(
        Math.ceil(base * growth ** anchor) * (1 + (n - anchor) / 10) ** 2,
      );
}
export function upgradeCost(
  s: LocalSnapshot,
  kind: Upgrade,
): { iron: number; coin: number } | undefined {
  const n = s.upgrades[kind];
  if (n >= LOOP.maxLevel) return undefined;
  if (kind === "attack")
    return { iron: curve(20, 1.2, n), coin: curve(10, 1.18, n) };
  if (kind === "vitality")
    return { iron: curve(15, 1.18, n), coin: curve(8, 1.18, n) };
  if (kind === "click")
    return { iron: curve(25, 1.22, n), coin: curve(10, 1.25, n) };
  return n === 0
    ? { iron: 100, coin: 50 }
    : {
        iron: curve(75, 1.15, n - 1, 49),
        coin: curve(30, 1.15, n - 1, 49),
      };
}
export function produce(s: LocalSnapshot, ms: number): bigint {
  if (!Number.isSafeInteger(ms) || ms < 0) throw Error("INVALID_DELTA");
  const bp =
    10000 +
    gearStats(s).productionBp +
    (s.rpg.petActive ? s.rpg.petLevel * 200 : 0);
  const boosted = Math.min(
    ms,
    Math.max(0, s.rpg.productionBuffUntil - s.lastReconciledAt),
  );
  const weighted = BigInt(bp) * (BigInt(ms) * 4n + BigInt(boosted));
  let coal = 0n;
  for (const [key, rate] of [
    ["coal", s.upgrades.coal * 100],
    ["gold", s.rpg.goldLevel * 20],
    ["jade", s.rpg.jadeLevel * 5],
  ] as const) {
    const remainder =
      key === "coal"
        ? s.coalRemainder
        : key === "gold"
          ? s.rpg.goldRemainder
          : s.rpg.jadeRemainder;
    // Exact rational denominator:1000ms *10000 basis points *4 (tonic25%).
    const numerator = BigInt(rate) * weighted + BigInt(remainder),
      amount = numerator / 40000000n,
      rest = Number(numerator % 40000000n);
    addResource(s, key, amount);
    if (key === "coal") {
      s.coalRemainder = rest;
      coal = amount;
    } else if (key === "gold") s.rpg.goldRemainder = rest;
    else s.rpg.jadeRemainder = rest;
  }
  return coal;
}
export function startEncounter(
  s: LocalSnapshot,
  floor: number,
  wave = 1,
): void {
  const b = s.battle,
    stats = floorStats(floor);
  b.paused = false;
  b.attempt++;
  b.floor = floor;
  b.wave = wave;
  b.phase = "fighting";
  b.failure = "none";
  b.heroNextAt = b.time + 1000;
  b.deadline = stats.boss ? b.time + LOOP.bossMs : 0;
  b.transitionAt = 0;
  b.enemies = Array.from({ length: stats.boss ? 1 : 3 }, () => ({
    hp: stats.hp,
    maxHp: stats.hp,
    nextAt: b.time + stats.interval,
    strikes: 0,
  }));
}
function fail(s: LocalSnapshot, cause: "defeat" | "timeout"): void {
  const b = s.battle;
  b.paused = false;
  b.phase = "failed";
  b.failure = cause;
  if (!b.training) b.retryFloor = b.floor;
  b.training = false;
  if (floorStats(b.floor).boss) b.floor--;
}
export function advanceCombat(
  s: LocalSnapshot,
  delta: number,
  wallStart = s.lastReconciledAt,
): void {
  if (!Number.isSafeInteger(delta) || delta < 0) throw Error("INVALID_DELTA");
  const b = s.battle,
    end = b.time + delta,
    origin = b.time;
  if (b.paused) {
    reconcileBossAbsence(s, delta);
    return;
  }
  if (!Number.isSafeInteger(end)) throw Error("TIME_LIMIT");
  // A stopped encounter consumes no schedule; absolute simulation time still advances.
  while (b.phase === "fighting" || b.phase === "transition") {
    if (b.phase === "transition") {
      if (b.transitionAt > end) break;
      b.time = b.transitionAt;
      if (
        b.enemies.every((e) => e.hp === 0) &&
        b.wave < 3 &&
        !floorStats(b.floor).boss
      )
        startEncounter(s, b.floor, b.wave + 1);
      else {
        b.highest = Math.max(b.highest, b.floor);
        if (b.training) {
          b.paused = false;
          b.phase = "failed";
          b.failure = "trained";
          b.training = false;
          break;
        }
        if (b.floor === LOOP.floors) {
          b.phase = "complete";
          break;
        }
        b.heroHp = heroStats(s).hp;
        startEncounter(s, b.floor + 1);
      }
      continue;
    }
    const next = Math.min(
      b.heroNextAt,
      ...b.enemies.filter((e) => e.hp > 0).map((e) => e.nextAt),
      b.deadline || Infinity,
    );
    if (next > end) break;
    b.time = next;
    // Deadline wins ties; hero kills remove a target before its attack at the same instant.
    if (b.deadline && next >= b.deadline) {
      fail(s, "timeout");
      break;
    }
    if (b.heroNextAt === next) {
      b.heroNextAt += 1000;
      b.heroStrikes++;
      const target = b.enemies.find((e) => e.hp > 0);
      if (target) {
        target.hp = Math.max(
          0,
          target.hp - heroStats(s, wallStart + b.time - origin).attack,
        );
        if (target.hp === 0) {
          addResource(s, "coin", BigInt(floorStats(b.floor).coin) * 1000n);
          awardRpgDeath(s, b.floor, floorStats(b.floor).boss);
          s.tutorial.victory = true;
        }
      }
    }
    for (const enemy of b.enemies)
      if (enemy.hp > 0 && enemy.nextAt === next) {
        enemy.nextAt += floorStats(b.floor).interval;
        enemy.strikes++;
        b.heroHp = Math.max(
          0,
          b.heroHp -
            Math.max(
              1,
              Math.floor(
                (floorStats(b.floor).attack * 100) /
                  (100 + heroStats(s).defense),
              ),
            ),
        );
        if (b.heroHp === 0) {
          fail(s, "defeat");
          break;
        }
      }
    if (b.heroHp === 0) break;
    if (b.enemies.every((e) => e.hp === 0)) {
      b.phase = "transition";
      b.transitionAt = next + LOOP.transitionMs;
      // Completion/reward is recorded immediately; transition is presentation time, not a second grant.
      if (b.wave === 3 || floorStats(b.floor).boss)
        b.highest = Math.max(b.highest, b.floor);
    }
  }
  b.time = end;
}
export const ironPerClick = (s: LocalSnapshot) =>
  (BigInt(1 + s.upgrades.click) * BigInt(10000 + gearStats(s).miningBp)) / 10n;
export function mineIron(s: LocalSnapshot): void {
  addResource(s, "iron", ironPerClick(s));
  s.tutorial.mined = true;
}
export function buyUpgrade(s: LocalSnapshot, kind: Upgrade): boolean {
  const cost = upgradeCost(s, kind);
  if (
    !cost ||
    BigInt(s.balances.iron) < BigInt(cost.iron) * 1000n ||
    BigInt(s.balances.coin) < BigInt(cost.coin) * 1000n
  )
    return false;
  s.balances.iron = String(BigInt(s.balances.iron) - BigInt(cost.iron) * 1000n);
  s.balances.coin = String(BigInt(s.balances.coin) - BigInt(cost.coin) * 1000n);
  s.upgrades[kind]++;
  if (kind === "vitality" && s.battle.heroHp > 0) s.battle.heroHp += 15;
  s.tutorial.upgraded = true;
  return true;
}
export function retryBattle(s: LocalSnapshot): boolean {
  if (s.battle.phase !== "failed") return false;
  s.battle.heroHp = heroStats(s).hp;
  startEncounter(s, s.battle.retryFloor);
  return true;
}

export function trainBattle(s: LocalSnapshot): boolean {
  if (s.battle.phase !== "failed" || s.battle.retryFloor % 10 !== 0)
    return false;
  const floor = s.battle.retryFloor - 1;
  s.battle.heroHp = heroStats(s).hp;
  startEncounter(s, floor);
  s.battle.training = true;
  return true;
}

// Boss wall deadline keeps running during absence; no attacks or rewards are simulated.
export function reconcileBossAbsence(
  s: LocalSnapshot,
  elapsedMs: number,
): void {
  if (!Number.isSafeInteger(elapsedMs) || elapsedMs < 0)
    throw Error("INVALID_DELTA");
  const b = s.battle;
  if (b.phase !== "fighting" || !b.deadline || elapsedMs <= 0) return;
  if (elapsedMs >= b.deadline - b.time) fail(s, "timeout");
  else b.deadline -= elapsedMs;
}
