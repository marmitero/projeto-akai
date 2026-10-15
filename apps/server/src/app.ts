import Fastify from 'fastify';
import { randomUUID } from 'node:crypto';
import { PROTOCOL_VERSION, type HealthSchema } from '@akai/shared';
import type { z } from 'zod';
import type { ServerConfig } from './config.js';
export function buildServer(config: ServerConfig, logging = true) {
  const app = Fastify({ bodyLimit: 16_384, requestIdHeader: false, genReqId: () => randomUUID(),
    logger: logging ? { level: config.LOG_LEVEL, redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'] } : false });
  app.get('/health', async (): Promise<z.infer<typeof HealthSchema>> => ({ status: 'ok', service: 'akai-server', protocolVersion: PROTOCOL_VERSION, stage: 'foundation', onlineGameplay: false }));
  app.all('/api/v1/*', async (_req, reply) => reply.code(503).send({ error: { code: 'ONLINE_NOT_AVAILABLE', message: 'Gameplay online ainda não implementado.', retryable: false, requestId: _req.id } }));
  app.setNotFoundHandler((req, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada.', retryable: false, requestId: req.id } }));
  app.setErrorHandler((error, req, reply) => {
    const status = typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 500 ? error.statusCode : 500;
    if (status === 500) req.log.error({ requestId: req.id }, 'Unhandled server error');
    const code = status === 413 ? 'PAYLOAD_TOO_LARGE' : status === 400 ? 'INVALID_REQUEST' : status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_REJECTED';
    return reply.code(status).send({ error: { code, message: status === 500 ? 'Erro interno.' : 'Requisição rejeitada.', retryable: status === 500, requestId: req.id } });
  });
  return app;
}
