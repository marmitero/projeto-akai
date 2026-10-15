import { describe, it, expect } from "vitest";
import { LocalSession } from "./session.js";
describe("session lifetime independent of presentation", () => {
  it("preserves the same profile/time/balances through repeated navigation", () => {
    let now = 1000;
    const session = new LocalSession({ now: () => now });
    for (let n = 0; n < 50; n++) {
      session.selectScreen("mine");
      session.selectScreen("production");
      session.selectScreen("battle");
    }
    now += 5000;
    session.tick();
    expect(session.getSnapshot()).toMatchObject({
      activeMs: 5000,
      profile: { id: "local-test" },
      balances: { iron: "0" },
      generation: 0,
    });
  });
  it("does not credit absence or backwards time and does not expose mutable state", () => {
    let now = 1000;
    const session = new LocalSession({ now: () => now });
    now = 2000;
    session.suspend();
    now = 10_000;
    session.tick();
    session.resume();
    now = 11_000;
    session.tick();
    expect(session.getSnapshot().activeMs).toBe(2000);
    now = 9000;
    session.tick();
    now = 12_000;
    session.tick();
    expect(session.getSnapshot().activeMs).toBe(3000);
    const copy = session.getSnapshot();
    copy.balances.iron = "9000";
    expect(session.getSnapshot().balances.iron).toBe("0");
  });
  it("unsubscribes without adding listeners on navigation", () => {
    let calls = 0;
    const session = new LocalSession({ now: () => 0 });
    const off = session.subscribe(() => {
      calls++;
    });
    session.selectScreen("mine");
    off();
    session.selectScreen("battle");
    expect(calls).toBe(2);
  });
});

describe("local gameplay lifecycle", () => {
  it("keeps encounter and cooldowns across50 navigation cycles and isolates hidden input", () => {
    let now = 0;
    const s = new LocalSession({ now: () => now });
    const before = s.getSnapshot().battle;
    for (let i = 0; i < 50; i++) {
      s.selectScreen("mine");
      s.selectScreen("production");
      s.selectScreen("battle");
    }
    expect(s.getSnapshot().battle).toEqual(before);
    expect(s.mine()).toBe(false);
    s.selectScreen("mine");
    for (let i = 0; i < 10; i++) s.mine();
    expect(s.getSnapshot().balances.iron).toBe("10000");
    now = 1000;
    s.tick();
    expect(s.getSnapshot().battle.enemies[0]!.hp).toBe(12);
    s.suspend();
    expect(s.mine()).toBe(false);
  });
  it("credits offline coal at most8h, never fights offline and cannot collect twice", () => {
    let now = 0;
    const s = new LocalSession({ now: () => now });
    const snapshot = s.getSnapshot();
    snapshot.upgrades.coal = 1;
    now = 24 * 3600000;
    const restored = new LocalSession({ now: () => now }, snapshot);
    expect(restored.getSnapshot().balances.coal).toBe("2880000");
    expect(restored.getSnapshot().battle).toEqual(snapshot.battle);
    const again = new LocalSession({ now: () => now }, restored.getSnapshot());
    expect(again.offline.coal).toBe("0");
    again.selectScreen("mine");
    again.selectScreen("production");
    expect(again.getSnapshot().balances.coal).toBe("2880000");
    now = 0;
    const backwards = new LocalSession({ now: () => now }, again.getSnapshot());
    expect(backwards.offline.coal).toBe("0");
    now = 24 * 3600000;
    backwards.tick();
    expect(backwards.getSnapshot().balances.coal).toBe("2880000");
  });
  it("suspend/resume preserves common combat and reconciles a background period once", () => {
    let now = 1000;
    const s = new LocalSession({ now: () => now });
    const snapshot = s.getSnapshot();
    snapshot.upgrades.coal = 1;
    const current = new LocalSession({ now: () => now }, snapshot);
    now += 1000;
    current.suspend();
    const battle = current.getSnapshot().battle;
    now += 3600000;
    current.resume();
    expect(current.getSnapshot().battle).toEqual(battle);
    expect(current.offline.coal).toBe("360000");
    current.resume();
    expect(current.getSnapshot().balances.coal).toBe("360100");
  });
});

describe("boss wall deadline on absence", () => {
  it("reduces remaining timer without attacking, expires once and never auto retries", async () => {
    const { startEncounter } = await import("@akai/shared");
    let now = 0;
    const initial = new LocalSession({ now: () => now }).getSnapshot();
    startEncounter(initial, 10);
    const session = new LocalSession({ now: () => now }, initial);
    session.suspend();
    now = 10000;
    session.resume();
    expect(session.getSnapshot().battle).toMatchObject({
      phase: "fighting",
      time: 0,
      deadline: 20000,
      heroHp: 100,
    });
    session.suspend();
    now = 30000;
    session.resume();
    expect(session.getSnapshot().battle).toMatchObject({
      phase: "failed",
      failure: "timeout",
      floor: 9,
    });
    expect(session.getSnapshot().balances.coin).toBe("0");
    session.suspend();
    now = 90000;
    session.resume();
    expect(session.getSnapshot().battle.attempt).toBe(initial.battle.attempt);
  });
});

describe("explicit pause", () => {
  it("pauses attacks/transitions but keeps coal and persisted state", () => {
    let now = 0;
    const s = new LocalSession({ now: () => now });
    s.togglePause();
    const before = s.getSnapshot().battle;
    now = 1000;
    s.tick();
    expect(s.getSnapshot().battle).toEqual(before);
    s.togglePause();
    now = 2000;
    s.tick();
    expect(s.getSnapshot().battle.enemies[0]!.hp).toBe(12);
  });
  it("does not let pausing escape a boss deadline", async () => {
    const { startEncounter } = await import("@akai/shared");
    let now = 0;
    const snapshot = new LocalSession({ now: () => now }).getSnapshot();
    startEncounter(snapshot, 10);
    const s = new LocalSession({ now: () => now }, snapshot);
    s.togglePause();
    for (let i = 0; i < 30; i++) {
      now += 1000;
      s.tick();
    }
    expect(s.getSnapshot().battle).toMatchObject({
      phase: "failed",
      floor: 9,
      failure: "timeout",
      paused: false,
    });
    expect(s.getSnapshot().balances.coin).toBe("0");
  });
});
