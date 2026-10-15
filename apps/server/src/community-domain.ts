import { heroStats, type LocalSnapshot } from "@akai/shared";
const zone = "America/Sao_Paulo";
const format = new Intl.DateTimeFormat("en-CA", {
  timeZone: zone,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});
function parts(at: number) {
  return Object.fromEntries(
    format.formatToParts(at).map((p) => [p.type, p.value]),
  );
}
export function zonedDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
): number {
  const desired = Date.UTC(year, month - 1, day, hour);
  let at = desired;
  for (let i = 0; i < 3; i++) {
    const p = parts(at);
    at +=
      desired -
      Date.UTC(
        Number(p.year),
        Number(p.month) - 1,
        Number(p.day),
        Number(p.hour),
        Number(p.minute),
        Number(p.second),
      );
  }
  return at;
}
export function calendar(now: number) {
  const p = parts(now),
    y = Number(p.year),
    m = Number(p.month),
    d = Number(p.day),
    date = `${p.year}-${p.month}-${p.day}`;
  const monday = new Date(
    Date.UTC(
      y,
      m - 1,
      d - ((new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7),
    ),
  );
  const start = zonedDate(
    monday.getUTCFullYear(),
    monday.getUTCMonth() + 1,
    monday.getUTCDate(),
  );
  const next = new Date(monday.getTime() + 7 * 86400000),
    end = zonedDate(
      next.getUTCFullYear(),
      next.getUTCMonth() + 1,
      next.getUTCDate(),
    );
  const sunday = new Date(monday.getTime() + 6 * 86400000),
    warStart = zonedDate(
      sunday.getUTCFullYear(),
      sunday.getUTCMonth() + 1,
      sunday.getUTCDate(),
      18,
    );
  return {
    date,
    season: { id: monday.toISOString().slice(0, 10), start, end },
    bossStart: zonedDate(y, m, d, 22),
    bossEnd: zonedDate(y, m, d, 22) + 1800000,
    xpStart: zonedDate(y, m, d, 12),
    xpEnd: zonedDate(y, m, d, 18),
    lotteryAt: zonedDate(y, m, d, 18),
    raidStart: zonedDate(y, m, d, 20),
    raidEnd: zonedDate(y, m, d, 21),
    warStart,
    warEnd: warStart + 3600000,
  };
}
export function competitiveStats(s: LocalSnapshot) {
  const copy = structuredClone(s);
  copy.rpg.attackBuffUntil = 0;
  return heroStats(copy, Number.MAX_SAFE_INTEGER);
}
export function power(s: LocalSnapshot) {
  const n = competitiveStats(s);
  return Math.min(
    Number.MAX_SAFE_INTEGER,
    n.attack * 10 + n.hp + n.defense * 20,
  );
}
export function duel(
  a: ReturnType<typeof competitiveStats>,
  b: ReturnType<typeof competitiveStats>,
) {
  let hpA = a.hp,
    hpB = b.hp,
    ticks = 0;
  const hitA = Math.max(1, Math.floor((a.attack * 100) / (100 + b.defense))),
    hitB = Math.max(1, Math.floor((b.attack * 100) / (100 + a.defense)));
  while (ticks < 120 && hpA > 0 && hpB > 0) {
    hpA = Math.max(0, hpA - hitB);
    hpB = Math.max(0, hpB - hitA);
    ticks++;
  }
  return {
    won: hpA > 0 && hpB === 0,
    ticks,
    hpA,
    hpB,
    damageBp: Math.floor(((b.hp - hpB) * 10000) / b.hp),
    reason:
      hpA === 0 && hpB === 0
        ? "tie_defender"
        : ticks === 120 && hpB > 0
          ? "timeout_defender"
          : hpA > 0
            ? "attacker"
            : "defender",
  };
}
