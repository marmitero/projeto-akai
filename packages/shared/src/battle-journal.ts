import type { BattleReport, LocalSnapshot } from "./index.js";

// Called only by combat when a result is committed. It never grants resources.
export function recordBattleReport(
  s: LocalSnapshot,
  kind: BattleReport["kind"],
  reward: Partial<
    Pick<BattleReport, "coin" | "iron" | "heroXp" | "accountXp" | "loot" | "enemyId">
  > = {},
): void {
  const b = s.battle;
  if (b.reportSerial === Number.MAX_SAFE_INTEGER) return;
  b.reports.push({
    id: ++b.reportSerial,
    kind,
    floor: b.floor,
    wave: b.wave,
    coin: "0",
    iron: "0",
    heroXp: 0,
    accountXp: 0,
    loot: "",
    ...reward,
  });
  if (b.reports.length > 60) b.reports.splice(0, b.reports.length - 60);
}
