import { sha256 } from '@noble/hashes/sha256';

// getRandomValues remains available on HTTP LAN. Never fall back to Math.random.
export function commandId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hash = crypto.subtle
    ? new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes).buffer))
    : sha256(bytes);
  return Array.from(hash, b => b.toString(16).padStart(2, '0')).join('');
}
