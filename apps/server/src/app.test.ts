import { afterEach, describe, expect, it } from 'vitest';
import { ApiErrorSchema, HealthSchema } from '@akai/shared';
import { buildServer } from './app.js';
import { parseServerConfig } from './config.js';
const apps: ReturnType<typeof buildServer>[] = [];
afterEach(async () => { await Promise.all(apps.splice(0).map(app => app.close())); });
function app() { const instance = buildServer(parseServerConfig({}), false); apps.push(instance); return instance; }
describe('foundation server', () => {
  it('has a real health route without advertising online gameplay', async () => {
    const response = await app().inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200); expect(HealthSchema.parse(response.json()).onlineGameplay).toBe(false);
  });
  it('fails closed for gameplay and has structured 404s', async () => {
    const server = app();
    const response = await server.inject({ method: 'POST', url: '/api/v1/mining/click', payload: { amount: '9999' } });
    expect(response.statusCode).toBe(503); expect(ApiErrorSchema.parse(response.json()).error.code).toBe('ONLINE_NOT_AVAILABLE');
    expect((await server.inject('/absent')).statusCode).toBe(404);
  });
  it('rejects invalid JSON and oversized payloads with sanitized envelopes', async () => {
    const server = app();
    const invalid = await server.inject({ method: 'POST', url: '/api/v1/mining/click', headers: { 'content-type': 'application/json' }, payload: '{' });
    expect(invalid.statusCode).toBe(400); expect(ApiErrorSchema.parse(invalid.json()).error.code).toBe('INVALID_REQUEST');
    const large = await server.inject({ method: 'POST', url: '/api/v1/bootstrap', payload: { value: 'x'.repeat(20_000) } });
    expect(large.statusCode).toBe(413); expect(ApiErrorSchema.parse(large.json()).error.code).toBe('PAYLOAD_TOO_LARGE');
  });
  it('uses explicit local defaults and rejects invalid binding configuration', () => {
    expect(parseServerConfig({})).toMatchObject({ HOST: '127.0.0.1', PORT: 3000 });
    for (const PORT of ['0', '65536', 'not-a-port']) expect(() => parseServerConfig({ PORT })).toThrow();
  });
});
