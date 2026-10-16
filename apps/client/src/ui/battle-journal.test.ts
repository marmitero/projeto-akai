import { describe, expect, it } from "vitest";
import type { BattleReport } from "@akai/shared";
import { describeBattleReport } from "./battle-journal.js";
const report: BattleReport = {
  id: 1,
  kind: "reward",
  floor: 10,
  wave: 1,
  coin: "1250",
  iron: "0",
  heroXp: 10,
  accountXp: 2,
  loot: "",
};
describe("battle journal wording", () => {
  it("formats actual fractional balances without rounding away rewards", () => {
    expect(describeBattleReport(report)).toContain("+1,25 Coins");
    expect(describeBattleReport(report)).toContain("+10 XP do guerreiro");
    expect(describeBattleReport(report)).not.toContain("ferro");
    expect(
      describeBattleReport({ ...report, coin: "0", heroXp: 0, accountXp: 0 }),
    ).not.toContain("+");
  });
  it("describes losses without advertising nonexistent rewards", () => {
    expect(describeBattleReport({ ...report, kind: "timeout" })).toBe(
      "Andar 10 · Onda 1 — Derrota: o tempo do boss acabou.",
    );
  });
});
