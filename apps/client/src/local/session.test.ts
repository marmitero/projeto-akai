import { describe, it, expect } from 'vitest';
import { LocalSession } from './session.js';
describe('session lifetime independent of presentation', () => {
  it('preserves the same profile/time/balances through repeated navigation', () => {
    let now = 1000; const session = new LocalSession({ now: () => now });
    for (let n = 0; n < 50; n++) { session.selectScreen('mine'); session.selectScreen('production'); session.selectScreen('battle'); }
    now += 5000; session.tick();
    expect(session.getSnapshot()).toMatchObject({ activeMs: 5000, profile: { id: 'local-test' }, balances: { iron: '0' }, generation: 0 });
  });
  it('does not credit absence or backwards time and does not expose mutable state', () => {
    let now = 1000; const session = new LocalSession({ now: () => now });
    now = 2000; session.suspend(); now = 10_000; session.tick(); session.resume(); now = 11_000; session.tick();
    expect(session.getSnapshot().activeMs).toBe(2000);
    now = 9000; session.tick(); now = 12_000; session.tick(); expect(session.getSnapshot().activeMs).toBe(3000);
    const copy = session.getSnapshot(); copy.balances.iron = '9000'; expect(session.getSnapshot().balances.iron).toBe('0');
  });
  it('unsubscribes without adding listeners on navigation', () => {
    let calls = 0; const session = new LocalSession({ now: () => 0 });
    const off = session.subscribe(() => { calls++; });
    session.selectScreen('mine'); off(); session.selectScreen('battle');
    expect(calls).toBe(2);
  });
});
