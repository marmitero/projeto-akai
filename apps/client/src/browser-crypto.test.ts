import { afterEach, describe, expect, it, vi } from 'vitest';
import { commandId, sha256Hex } from './browser-crypto.js';
import { encodeSave, decodeSave, CorruptSaveError } from './persistence/codec.js';
import { createLocalSnapshot } from './local/session.js';
const webcrypto=globalThis.crypto;
afterEach(()=>vi.unstubAllGlobals());
describe('HTTP LAN crypto compatibility',()=>{
  it('creates RFC4122 v4 command IDs without randomUUID and never uses Math.random',()=>{
    vi.stubGlobal('crypto',{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)});
    const random=vi.spyOn(Math,'random').mockImplementation(()=>{throw Error('weak randomness');});
    try {
      const ids=Array.from({length:100},commandId);
      expect(new Set(ids).size).toBe(100);
      for(const id of ids)expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
    } finally {random.mockRestore();}
  });
  it('matches SHA256 vectors and the native implementation for Unicode/long payloads',async()=>{
    for(const value of ['', 'abc','Akai • carvão 🗡','x'.repeat(10000)]){
      const bytes=new TextEncoder().encode(value);
      const expected=Array.from(new Uint8Array(await webcrypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
      if(value==='abc')expect(expected).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
      vi.stubGlobal('crypto',{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)});
      expect(await sha256Hex(bytes)).toBe(expected);
      vi.stubGlobal('crypto',webcrypto);expect(await sha256Hex(bytes)).toBe(expected);
    }
  });
  it('reads identical saves across HTTP/native and still rejects tampering',async()=>{
    const state=createLocalSnapshot(1234);vi.stubGlobal('crypto',webcrypto);const native=await encodeSave(state);
    vi.stubGlobal('crypto',{getRandomValues:webcrypto.getRandomValues.bind(webcrypto)});
    expect(await encodeSave(state)).toBe(native);expect(await decodeSave(native)).toEqual(state);
    const tampered=JSON.parse(native);tampered.payload.balances.iron='999000';
    await expect(decodeSave(JSON.stringify(tampered))).rejects.toBeInstanceOf(CorruptSaveError);
  });
});
