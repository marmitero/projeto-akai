import type { LocalSnapshot } from "./index.js";
export const LOOP = {
  version: "local-loop-1",
  floors: 20,
  transitionMs: 3000,
  bossMs: 30000,
  offlineMs: 8 * 60 * 60 * 1000,
  maxLevel: 100,
} as const;
export type Upgrade = "attack" | "vitality" | "click" | "coal";
export const heroStats = (s: LocalSnapshot) => ({
  hp: 100 + 15 * s.upgrades.vitality,
  attack: 6 + 2 * s.upgrades.attack,
});
export function floorStats(floor: number) {
  const hp = Math.ceil(18 * 1.12 ** (floor - 1)),
    attack = Math.ceil(2 * 1.1 ** (floor - 1)),
    coin = Math.ceil(3 * 1.1 ** (floor - 1));
  const boss = floor % 10 === 0;
  return {
    boss,
    hp: hp * (boss ? 8 : 1),
    attack: attack * (boss ? 2 : 1),
    coin: coin * (boss ? 15 : 1),
    interval: boss ? 1800 : 2000,
  };
}
export function upgradeCost(
  s: LocalSnapshot,
  kind: Upgrade,
): { iron: number; coin: number } | undefined {
  const n = s.upgrades[kind];
  if (n >= LOOP.maxLevel) return undefined;
  if (kind === "attack")
    return { iron: Math.ceil(20 * 1.2 ** n), coin: Math.ceil(10 * 1.18 ** n) };
  if (kind === "vitality")
    return { iron: Math.ceil(15 * 1.18 ** n), coin: Math.ceil(8 * 1.18 ** n) };
  if (kind === "click")
    return { iron: Math.ceil(25 * 1.22 ** n), coin: Math.ceil(10 * 1.25 ** n) };
  return n === 0
    ? { iron: 100, coin: 50 }
    : {
        iron: Math.ceil(75 * 1.15 ** (n - 1)),
        coin: Math.ceil(30 * 1.15 ** (n - 1)),
      };
}
const MAX_AMOUNT = 10n ** 38n - 1n;
function credit(
  s: LocalSnapshot,
  resource: "coin" | "iron" | "coal",
  amount: bigint,
): void {
  const next = BigInt(s.balances[resource]) + amount;
  if (next < 0n || next > MAX_AMOUNT) throw Error("BALANCE_LIMIT");
  s.balances[resource] = String(next);
}
export function produce(s: LocalSnapshot, ms: number): bigint {
  if (!Number.isSafeInteger(ms) || ms < 0) throw Error("INVALID_DELTA");
  // Numerator in thousandths*ms; denominator1000, remainder always0..999.
  const total =
    BigInt(s.upgrades.coal * 100) * BigInt(ms) + BigInt(s.coalRemainder);
  const amount = total / 1000n;
  s.coalRemainder = Number(total % 1000n);
  credit(s, "coal", amount);
  return amount;
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
export function advanceCombat(s: LocalSnapshot, delta: number): void {
  if (!Number.isSafeInteger(delta) || delta < 0) throw Error("INVALID_DELTA");
  const b = s.battle,
    end = b.time + delta;
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
        target.hp = Math.max(0, target.hp - heroStats(s).attack);
        if (target.hp === 0) {
          credit(s, "coin", BigInt(floorStats(b.floor).coin) * 1000n);
          s.tutorial.victory = true;
        }
      }
    }
    for (const enemy of b.enemies)
      if (enemy.hp > 0 && enemy.nextAt === next) {
        enemy.nextAt += floorStats(b.floor).interval;
        enemy.strikes++;
        b.heroHp = Math.max(0, b.heroHp - floorStats(b.floor).attack);
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
export function mineIron(s: LocalSnapshot): void {
  credit(s, "iron", BigInt(1 + s.upgrades.click) * 1000n);
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
  if (kind === "vitality") s.battle.heroHp += 15;
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
