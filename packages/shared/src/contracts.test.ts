import { describe, it, expect } from 'vitest';
import { AmountSchema, LocalSnapshotSchema, MiningClickSchema } from './index.js';
describe('trust boundaries', () => {
  it('only accepts canonical nonnegative integer balances with a bounded size', () => {
    for (const value of ['-1', '1.5', '01', '1e9', '9'.repeat(39), 100]) expect(AmountSchema.safeParse(value).success).toBe(false);
    expect(AmountSchema.parse('9007199254740993000')).toBe('9007199254740993000');
  });
  it('rejects client-selected rewards or amounts in a mining command', () => {
    const command = { commandId: 'a54137d3-0b6d-4fdc-97de-411890d5ca4d', expectedVersion: 0, mineId: 'iron' };
    expect(MiningClickSchema.safeParse(command).success).toBe(true);
    expect(MiningClickSchema.safeParse({ ...command, amount: '10000' }).success).toBe(false);
    expect(MiningClickSchema.safeParse({ ...command, mineId: 'gold' }).success).toBe(false);
  });
  it('rejects a local save pretending to be an online account', () => {
    expect(LocalSnapshotSchema.safeParse({ schemaVersion: 1, mode: 'online' }).success).toBe(false);
  });
});
