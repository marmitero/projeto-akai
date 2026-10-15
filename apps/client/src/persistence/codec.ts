import { LocalSnapshotSchema, type LocalSnapshot } from '@akai/shared';
import { z } from 'zod';
const EnvelopeSchema = z.object({ formatVersion: z.literal(1), payload: LocalSnapshotSchema, checksum: z.string().regex(/^[a-f0-9]{64}$/) }).strict();
export class UnsupportedSaveError extends Error { constructor() { super('UNSUPPORTED_SAVE_VERSION'); } }
export class CorruptSaveError extends Error { constructor() { super('CORRUPT_SAVE'); } }
async function checksum(payload: LocalSnapshot): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(payload)));
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
}
export async function encodeSave(snapshot: LocalSnapshot): Promise<string> {
  const payload = LocalSnapshotSchema.parse(snapshot);
  return JSON.stringify({ formatVersion: 1, payload, checksum: await checksum(payload) });
}
export async function decodeSave(raw: unknown): Promise<LocalSnapshot> {
  if (typeof raw !== 'string' || raw.length > 100_000) throw new CorruptSaveError();
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new CorruptSaveError(); }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const payload = obj['payload'];
    if (typeof obj['formatVersion'] === 'number' && obj['formatVersion'] > 1) throw new UnsupportedSaveError();
    if (payload && typeof payload === 'object') {
      const p = payload as Record<string, unknown>;
      if (typeof p['schemaVersion'] === 'number' && p['schemaVersion'] > 1) throw new UnsupportedSaveError();
      if (p['schemaVersion'] === 1 && typeof p['configVersion'] === 'string' && p['configVersion'] !== 'foundation-1') throw new UnsupportedSaveError();
    }
  }
  // First released schema: unknown/older schemas fail safely until a real migration is specified.
  const parsed = EnvelopeSchema.safeParse(value);
  if (!parsed.success || parsed.data.checksum !== await checksum(parsed.data.payload)) throw new CorruptSaveError();
  return parsed.data.payload;
}
