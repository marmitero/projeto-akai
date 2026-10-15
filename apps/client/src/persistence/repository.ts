import type { LocalSnapshot } from '@akai/shared';
import { decodeSave, encodeSave, UnsupportedSaveError } from './codec.js';
export type LoadResult = { status: 'empty' | 'corrupt' | 'unsupported' } | { status: 'loaded' | 'backup-available'; snapshot: LocalSnapshot };
export class SaveConflictError extends Error { constructor() { super('SAVE_CONFLICT'); } }
function completion(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('STORAGE_ABORTED'));
    tx.onerror = () => { /* abort reports the final transaction outcome */ };
  });
}
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
}
export class SaveRepository {
  constructor(private readonly db: IDBDatabase) {}
  static async open(factory: IDBFactory, name = 'akai-local'): Promise<SaveRepository> {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      let blocked = false;
      const req = factory.open(name, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore('snapshots'); };
      req.onsuccess = () => { if (blocked) req.result.close(); else resolve(req.result); };
      req.onerror = () => reject(req.error);
      req.onblocked = () => { blocked = true; reject(new Error('STORAGE_BLOCKED')); };
    });
    db.onversionchange = () => db.close();
    return new SaveRepository(db);
  }
  private async read(): Promise<{ current: unknown; previous: unknown }> {
    const tx = this.db.transaction('snapshots', 'readonly'); const done = completion(tx);
    const store = tx.objectStore('snapshots');
    const [current, previous] = await Promise.all([request(store.get('current') as IDBRequest<unknown>), request(store.get('previous') as IDBRequest<unknown>), done]);
    return { current, previous };
  }
  async load(): Promise<LoadResult> {
    const { current, previous } = await this.read();
    if (current === undefined && previous === undefined) return { status: 'empty' };
    try { return { status: 'loaded', snapshot: await decodeSave(current) }; }
    catch (error) { if (error instanceof UnsupportedSaveError) return { status: 'unsupported' }; }
    try { return { status: 'backup-available', snapshot: await decodeSave(previous) }; }
    catch { return { status: 'corrupt' }; }
  }
  async save(snapshot: LocalSnapshot): Promise<number> {
    const observed = await this.read();
    // Never overwrite an invalid/newer current save, even if the caller has a new local profile.
    const current = observed.current === undefined ? undefined : await decodeSave(observed.current);
    if ((current?.generation ?? 0) !== snapshot.generation || snapshot.generation >= Number.MAX_SAFE_INTEGER) throw new SaveConflictError();
    const generation = snapshot.generation + 1;
    const encoded = await encodeSave({ ...snapshot, generation });
    await this.compareAndWrite(observed.current, observed.previous, encoded, false);
    return generation;
  }
  async restoreBackup(): Promise<LocalSnapshot> {
    const observed = await this.read();
    // Unknown future saves are never replaced by an older backup.
    try { await decodeSave(observed.current); throw new Error('CURRENT_SAVE_IS_VALID'); }
    catch (error) { if (error instanceof UnsupportedSaveError || (error instanceof Error && error.message === 'CURRENT_SAVE_IS_VALID')) throw error; }
    const backup = await decodeSave(observed.previous);
    await this.compareAndWrite(observed.current, observed.previous, await encodeSave(backup), true);
    return backup;
  }
  private async compareAndWrite(current: unknown, previous: unknown, next: string, recovery: boolean): Promise<void> {
    const tx = this.db.transaction('snapshots', 'readwrite'); const done = completion(tx);
    const store = tx.objectStore('snapshots');
    let conflict = false;
    const req = store.get('current');
    req.onsuccess = () => {
      if (req.result !== current) { conflict = true; tx.abort(); return; }
      const prevReq = store.get('previous');
      prevReq.onsuccess = () => {
        if (prevReq.result !== previous) { conflict = true; tx.abort(); return; }
        if (recovery) { store.put(current, 'quarantine'); }
        else if (current !== undefined) { store.put(current, 'previous'); }
        store.put(next, 'current');
      };
    };
    try { await done; } catch (error) { if (conflict) throw new SaveConflictError(); throw error; }
  }
  close(): void { this.db.close(); }
}
