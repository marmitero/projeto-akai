import {
  CONFIG_VERSION,
  applyRpgCommand,
  heroStats,
  type RpgCommand,
  LocalSnapshotSchema,
  ScreenSchema,
  newLoopState,
  advanceCombat,
  reconcileBossAbsence,
  produce,
  mineIron,
  buyUpgrade,
  retryBattle,
  trainBattle,
  LOOP,
  type Upgrade,
  type LocalSnapshot,
  type Screen,
} from "@akai/shared";
export interface Clock {
  now(): number;
}
export const systemClock: Clock = { now: () => Date.now() };
export function createLocalSnapshot(now: number): LocalSnapshot {
  return LocalSnapshotSchema.parse({
    ...newLoopState(),
    schemaVersion: 3,
    configVersion: CONFIG_VERSION,
    mode: "local",
    generation: 0,
    savedAt: now,
    lastReconciledAt: now,
    profile: { id: "local-test", name: "Perfil local de teste" },
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
}
export class LocalSession {
  private state: LocalSnapshot;
  private suspended = false;
  private listeners = new Set<(state: LocalSnapshot) => void>();
  offline = { ms: 0, coal: "0", gold: "0", jade: "0" };
  constructor(
    private readonly clock: Clock,
    snapshot = createLocalSnapshot(clock.now()),
  ) {
    this.state = LocalSnapshotSchema.parse(structuredClone(snapshot));
    this.reconcileAbsence();
  }
  private now(): number {
    const n = this.clock.now();
    if (!Number.isSafeInteger(n) || n < 0) throw Error("INVALID_CLOCK");
    return n;
  }
  getSnapshot(): LocalSnapshot {
    return structuredClone(this.state);
  }
  subscribe(listener: (state: LocalSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit(): void {
    for (const listener of this.listeners) listener(this.getSnapshot());
  }
  selectScreen(screen: Screen): void {
    this.tick();
    this.state.screen = ScreenSchema.parse(screen);
    this.emit();
  }
  tick(): void {
    if (this.suspended) return;
    const now = this.now(),
      delta = Math.max(0, now - this.state.lastReconciledAt);
    if (!delta) return;
    const draft = this.getSnapshot();
    // Long foreground stalls are treated as absence, never an offline battle catch-up.
    if (delta > 5000) {
      reconcileBossAbsence(draft, delta);
      const ms = Math.min(delta, LOOP.offlineMs);
      const goldBefore = BigInt(draft.balances.gold),
        jadeBefore = BigInt(draft.balances.jade);
      this.offline = {
        ms,
        coal: String(produce(draft, ms)),
        gold: String(BigInt(draft.balances.gold) - goldBefore),
        jade: String(BigInt(draft.balances.jade) - jadeBefore),
      };
    } else {
      produce(draft, delta);
      advanceCombat(draft, delta);
      draft.activeMs += delta;
    }
    draft.lastReconciledAt = Math.max(now, draft.lastReconciledAt);
    this.state = LocalSnapshotSchema.parse(draft);
    this.emit();
  }
  private reconcileAbsence(): void {
    const now = this.now(),
      draft = this.getSnapshot(),
      ms = Math.min(Math.max(0, now - draft.lastReconciledAt), LOOP.offlineMs);
    reconcileBossAbsence(draft, Math.max(0, now - draft.lastReconciledAt));
    const goldBefore = BigInt(draft.balances.gold),
      jadeBefore = BigInt(draft.balances.jade);
    this.offline = {
      ms,
      coal: String(produce(draft, ms)),
      gold: String(BigInt(draft.balances.gold) - goldBefore),
      jade: String(BigInt(draft.balances.jade) - jadeBefore),
    };
    draft.lastReconciledAt = Math.max(now, draft.lastReconciledAt);
    this.state = LocalSnapshotSchema.parse(draft);
  }
  mine(): boolean {
    this.tick();
    if (this.suspended || this.state.screen !== "mine") return false;
    const d = this.getSnapshot();
    mineIron(d);
    this.state = LocalSnapshotSchema.parse(d);
    this.emit();
    return true;
  }
  buy(kind: Upgrade): boolean {
    this.tick();
    if (this.suspended) return false;
    const d = this.getSnapshot();
    if (!buyUpgrade(d, kind)) return false;
    this.state = LocalSnapshotSchema.parse(d);
    this.emit();
    return true;
  }
  retry(): boolean {
    this.tick();
    if (this.suspended) return false;
    const d = this.getSnapshot();
    if (!retryBattle(d)) return false;
    this.state = LocalSnapshotSchema.parse(d);
    this.emit();
    return true;
  }
  train(): boolean {
    this.tick();
    if (this.suspended) return false;
    const d = this.getSnapshot();
    if (!trainBattle(d)) return false;
    this.state = LocalSnapshotSchema.parse(d);
    this.emit();
    return true;
  }
  rpgCommand(command: RpgCommand): boolean {
    this.tick();
    if (this.suspended) return false;
    const draft = this.getSnapshot();
    if (!applyRpgCommand(draft, command)) return false;
    draft.battle.heroHp = Math.min(draft.battle.heroHp, heroStats(draft).hp);
    this.state = LocalSnapshotSchema.parse(draft);
    this.emit();
    return true;
  }
  togglePause(): void {
    this.tick();
    if (
      this.suspended ||
      this.state.battle.phase === "failed" ||
      this.state.battle.phase === "complete"
    )
      return;
    this.state.battle.paused = !this.state.battle.paused;
    this.emit();
  }
  suspend(): void {
    this.tick();
    this.suspended = true;
  }
  resume(): void {
    if (!this.suspended) return;
    this.reconcileAbsence();
    this.suspended = false;
    this.emit();
  }
  acknowledgeSave(generation: number): void {
    this.state.generation = generation;
  }
  dispose(): void {
    this.listeners.clear();
  }
}
