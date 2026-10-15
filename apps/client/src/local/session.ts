import { CONFIG_VERSION, LocalSnapshotSchema, ScreenSchema, type LocalSnapshot, type Screen } from '@akai/shared';
export interface Clock { now(): number }
export const systemClock: Clock = { now: () => Date.now() };
export function createLocalSnapshot(now: number): LocalSnapshot {
  return LocalSnapshotSchema.parse({ schemaVersion: 1, configVersion: CONFIG_VERSION, mode: 'local', generation: 0, savedAt: now,
    profile: { id: 'local-test', name: 'Perfil local de teste' }, screen: 'battle', activeMs: 0,
    balances: { coin: '0', iron: '0', coal: '0', gold: '0', jade: '0', ruby: '0' } });
}
// Owns local domain lifetime; screens never own timers, balances or storage.
export class LocalSession {
  private state: LocalSnapshot;
  private lastTick: number;
  private suspended = false;
  private listeners = new Set<(state: LocalSnapshot) => void>();
  constructor(private readonly clock: Clock, snapshot = createLocalSnapshot(clock.now())) {
    this.state = LocalSnapshotSchema.parse(structuredClone(snapshot));
    this.lastTick = clock.now();
  }
  getSnapshot(): LocalSnapshot { return structuredClone(this.state); }
  subscribe(listener: (state: LocalSnapshot) => void): () => void {
    this.listeners.add(listener); listener(this.getSnapshot());
    return () => { this.listeners.delete(listener); };
  }
  private emit(): void { for (const listener of this.listeners) listener(this.getSnapshot()); }
  selectScreen(screen: Screen): void { this.state.screen = ScreenSchema.parse(screen); this.emit(); }
  tick(): void {
    const now = this.clock.now();
    if (!Number.isSafeInteger(now) || now < 0) throw new Error('INVALID_CLOCK');
    // Keep a high-water mark on backwards clock movement. No absence or resource grants in F1.
    const delta = Math.max(0, now - this.lastTick);
    this.lastTick = Math.max(this.lastTick, now);
    if (!this.suspended && delta > 0) {
      this.state.activeMs = Math.min(Number.MAX_SAFE_INTEGER, this.state.activeMs + delta);
      this.emit();
    }
  }
  suspend(): void { this.tick(); this.suspended = true; }
  resume(): void { this.lastTick = this.clock.now(); this.suspended = false; }
  acknowledgeSave(generation: number): void { this.state.generation = generation; }
  dispose(): void { this.listeners.clear(); }
}
