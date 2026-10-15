import { IDBFactory } from 'fake-indexeddb';
import { describe, it, expect } from 'vitest';
import { SaveRepository, SaveConflictError } from './repository.js';
import { createLocalSnapshot } from '../local/session.js';
import { decodeSave, encodeSave, CorruptSaveError, UnsupportedSaveError } from './codec.js';
async function writeRaw(factory: IDBFactory, key: string, value: unknown): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => { const req = factory.open('test', 1); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  await new Promise<void>((resolve, reject) => { const tx = db.transaction('snapshots', 'readwrite'); tx.objectStore('snapshots').put(value, key); tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error); }); db.close();
}
describe('versioned atomic local snapshots', () => {
  it('round-trips a profile and maintains a prior snapshot', async () => {
    const factory = new IDBFactory(); const repo = await SaveRepository.open(factory, 'test');
    expect(await repo.load()).toEqual({ status: 'empty' });
    const snapshot = createLocalSnapshot(1000);
    expect(await repo.save(snapshot)).toBe(1); snapshot.generation = 1; snapshot.screen = 'mine';
    expect(await repo.save(snapshot)).toBe(2);
    expect(await repo.load()).toMatchObject({ status: 'loaded', snapshot: { generation: 2, screen: 'mine' } });
    await writeRaw(factory, 'current', '{broken');
    expect(await repo.load()).toMatchObject({ status: 'backup-available', snapshot: { generation: 1, screen: 'battle' } });
    await expect(repo.save(snapshot)).rejects.toThrow(CorruptSaveError);
    expect((await repo.restoreBackup()).generation).toBe(1);
    expect(await repo.load()).toMatchObject({ status: 'loaded', snapshot: { generation: 1 } }); repo.close();
  });
  it('preserves an unknown future schema instead of replacing it with a backup', async () => {
    const factory = new IDBFactory(); const repo = await SaveRepository.open(factory, 'test');
    await repo.save(createLocalSnapshot(1000));
    const future = JSON.stringify({ formatVersion: 1, payload: { schemaVersion: 99 } });
    await writeRaw(factory, 'current', future);
    expect(await repo.load()).toEqual({ status: 'unsupported' });
    await expect(repo.save(createLocalSnapshot(1000))).rejects.toThrow(UnsupportedSaveError);
    await expect(repo.restoreBackup()).rejects.toThrow(UnsupportedSaveError); repo.close();
  });
  it('allows exactly one writer when two tabs race from the same generation', async () => {
    const factory = new IDBFactory(); const a = await SaveRepository.open(factory, 'test'); const b = await SaveRepository.open(factory, 'test');
    const results = await Promise.allSettled([a.save(createLocalSnapshot(1)), b.save(createLocalSnapshot(1))]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find(r => r.status === 'rejected');
    expect(rejected?.status === 'rejected' && rejected.reason).toBeInstanceOf(SaveConflictError);
    expect(await a.load()).toMatchObject({ status: 'loaded', snapshot: { generation: 1 } }); a.close(); b.close();
  });
  it('detects damaged payloads and fails safely on unknown config/old schema', async () => {
    const raw = await encodeSave(createLocalSnapshot(100)); const value = JSON.parse(raw) as { payload: { screen: string } };
    value.payload.screen = 'mine'; await expect(decodeSave(JSON.stringify(value))).rejects.toThrow(CorruptSaveError);
    await expect(decodeSave('{"formatVersion":0,"payload":{}}')).rejects.toThrow(CorruptSaveError);
    await expect(decodeSave(raw.replace('foundation-1', 'other-configuration'))).rejects.toThrow(UnsupportedSaveError);
  });
});
