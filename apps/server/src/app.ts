import Fastify from "fastify";
import websocket from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import { PROTOCOL_VERSION, type HealthSchema } from "@akai/shared";
import type { z } from "zod";
import { OnlineService, OnlineError } from "./online.js";
import { Database } from "./database.js";
import { onlineRoutes } from "./routes.js";
import { ZodError } from "zod";
import type { GoogleVerifier } from "./google.js";
import type { ServerConfig } from "./config.js";
export function buildServer(
  config: ServerConfig,
  logging = true,
  dependencies: {
    service?: OnlineService;
    googleVerifier?: GoogleVerifier;
  } = {},
) {
  const app = Fastify({
    bodyLimit: 16_384,
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    logger: logging
      ? {
          level: config.LOG_LEVEL,
          redact: [
            "req.headers.authorization",
            "req.headers.cookie",
            'res.headers["set-cookie"]',
          ],
        }
      : false,
  });
  const service =
    dependencies.service ??
    (config.DATABASE_URL
      ? new OnlineService(new Database(config.DATABASE_URL))
      : undefined);
  if (service) {
    app.register(websocket, { options: { maxPayload: 1024 } });
    app.register(async (scope) => {
      await onlineRoutes(scope, service, config, dependencies.googleVerifier);
    });
    if (!dependencies.service)
      app.addHook("onClose", async () => service.db.close());
  }
  app.get("/health", async (): Promise<z.infer<typeof HealthSchema>> => {
    if (service)
      await service.db.pool.query("SELECT 'akai_accounts'::regclass");
    return {
      status: "ok",
      service: "akai-server",
      protocolVersion: PROTOCOL_VERSION,
      stage: service ? "online" : "foundation",
      onlineGameplay: !!service,
    };
  });
  app.all("/api/v1/*", async (_req, reply) =>
    reply
      .code(service ? 404 : 503)
      .send({
        error: {
          code: service ? "NOT_FOUND" : "ONLINE_NOT_AVAILABLE",
          message: "Gameplay online ainda não implementado.",
          retryable: false,
          requestId: _req.id,
        },
      }),
  );
  app.setNotFoundHandler((req, reply) =>
    reply
      .code(404)
      .send({
        error: {
          code: "NOT_FOUND",
          message: "Rota não encontrada.",
          retryable: false,
          requestId: req.id,
        },
      }),
  );
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof OnlineError) {
      if (error.status === 429) reply.header("Retry-After", "1");
      return reply
        .code(error.status)
        .send({
          error: {
            code: error.code,
            message: error.code,
            retryable: error.status === 429,
            requestId: req.id,
          },
        });
    }
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({
          error: {
            code: "INVALID_REQUEST",
            message: "Requisição inválida.",
            retryable: false,
            requestId: req.id,
          },
        });
    const status =
      typeof error === "object" &&
      error !== null &&
      "statusCode" in error &&
      typeof error.statusCode === "number" &&
      error.statusCode >= 400 &&
      error.statusCode < 500
        ? error.statusCode
        : 500;
    if (status === 500)
      req.log.error({ requestId: req.id }, "Unhandled server error");
    const code =
      status === 413
        ? "PAYLOAD_TOO_LARGE"
        : status === 400
          ? "INVALID_REQUEST"
          : status === 500
            ? "INTERNAL_ERROR"
            : "REQUEST_REJECTED";
    return reply
      .code(status)
      .send({
        error: {
          code,
          message: status === 500 ? "Erro interno." : "Requisição rejeitada.",
          retryable: status === 500,
          requestId: req.id,
        },
      });
  });
  return app;
}
