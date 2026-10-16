import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { premiumRoutes } from "./premium-routes.js";
import { marketRoutes } from "./market-routes.js";
import { communityRoutes } from "./community-routes.js";
import type { ServerConfig } from "./config.js";
import { OnlineError, type OnlineService } from "./online.js";
import {
  googleNonce,
  linkGoogle,
  googleLoginNonce,
  loginGoogle,
  type GoogleVerifier,
} from "./google.js";
export const sessionToken = (r: FastifyRequest) => {
  const value = r.headers.cookie
    ?.split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith("akai_session="))
    ?.slice(13);
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value))
    throw new OnlineError("UNAUTHENTICATED", 401);
  return value;
};
export async function onlineRoutes(
  app: FastifyInstance,
  service: OnlineService,
  config: ServerConfig,
  verifier?: GoogleVerifier,
) {
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("Cache-Control", "no-store")
      .header("X-Content-Type-Options", "nosniff");
    if (!req.url.startsWith("/api/v1/")) return;
    if (req.headers.origin && req.headers.origin !== config.PUBLIC_ORIGIN)
      throw new OnlineError("ORIGIN_REJECTED", 403);
    if (req.url.split("?")[0] === "/api/v1/stream") {
      if (req.headers.origin !== config.PUBLIC_ORIGIN)
        throw new OnlineError("ORIGIN_REJECTED", 403);
    } else if (req.headers["x-akai-client"] !== "1")
      throw new OnlineError("CSRF_REJECTED", 403);
    if (req.method !== "GET" && req.headers.origin !== config.PUBLIC_ORIGIN)
      throw new OnlineError("ORIGIN_REJECTED", 403);
    await service.authLimit(`http:${req.ip}`, 600);
  });
  await communityRoutes(app, service);
  await marketRoutes(app, service);
  await premiumRoutes(app, service, config);
  const cookie = (token: string) =>
    `akai_session=${token}; Path=/api/v1; HttpOnly; SameSite=Strict; Max-Age=604800${config.COOKIE_SECURE ? "; Secure" : ""}`;
  app.post("/api/v1/auth/guest", async (req, reply) => {
    z.object({}).strict().parse(req.body);
    await service.authLimit(`guest:${req.ip}`, 5);
    const { token, ...result } = await service.guest();
    reply.header("Set-Cookie", cookie(token));
    return result;
  });
  app.post("/api/v1/auth/recover", async (req, reply) => {
    await service.authLimit(`recover:${req.ip}`, 10);
    const body = z
      .object({ recoveryKey: z.string().regex(/^[A-Za-z0-9_-]{43}$/) })
      .strict()
      .parse(req.body);
    const { token, ...result } = await service.recover(body.recoveryKey);
    reply.header("Set-Cookie", cookie(token));
    return result;
  });
  app.post("/api/v1/auth/logout", async (req, reply) => {
    await service.logout(sessionToken(req));
    reply.header("Set-Cookie", cookie("") + "; Max-Age=0");
    return { loggedOut: true };
  });
  app.get("/api/v1/auth/config", async () => ({
    googleClientId: config.GOOGLE_CLIENT_ID ?? null,
  }));
  app.post("/api/v1/auth/google/nonce", async (req) => {
    if (!config.GOOGLE_CLIENT_ID)
      throw new OnlineError("PROVIDER_NOT_CONFIGURED", 503);
    await service.authLimit(`google:${req.ip}`, 10);
    return { nonce: await googleNonce(service, sessionToken(req)) };
  });
  app.post("/api/v1/auth/google/link", async (req) => {
    if (!config.GOOGLE_CLIENT_ID)
      throw new OnlineError("PROVIDER_NOT_CONFIGURED", 503);
    await service.authLimit(`google:${req.ip}`, 10);
    const body = z
      .object({ idToken: z.string().min(1).max(12000) })
      .strict()
      .parse(req.body);
    return linkGoogle(
      service,
      sessionToken(req),
      body.idToken,
      config.GOOGLE_CLIENT_ID,
      verifier,
    );
  });
  app.post("/api/v1/auth/google/login/nonce", async (req) => {
    if (!config.GOOGLE_CLIENT_ID)
      throw new OnlineError("PROVIDER_NOT_CONFIGURED", 503);
    await service.authLimit(`google:${req.ip}`, 10);
    return { nonce: await googleLoginNonce(service) };
  });
  app.post("/api/v1/auth/google/login", async (req, reply) => {
    if (!config.GOOGLE_CLIENT_ID)
      throw new OnlineError("PROVIDER_NOT_CONFIGURED", 503);
    await service.authLimit(`google:${req.ip}`, 10);
    const body = z
      .object({ idToken: z.string().min(1).max(12000) })
      .strict()
      .parse(req.body);
    const { token } = await loginGoogle(
      service,
      body.idToken,
      config.GOOGLE_CLIENT_ID,
      verifier,
    );
    reply.header("Set-Cookie", cookie(token));
    return { authenticated: true };
  });
  app.get("/api/v1/state", async (req) => service.state(sessionToken(req)));
  app.get("/api/v1/bootstrap", async (req) => service.state(sessionToken(req)));
  app.post("/api/v1/presence/away", async (req) =>
    service.state(sessionToken(req), false),
  );
  app.post("/api/v1/commands", async (req, reply) => {
    const token = sessionToken(req);
    await service.authLimit(`commands:${token}`, 1200);
    const result = await service.command(token, req.body);
    if (result.status === "rejected")
      reply.code(
        result.code === "VERSION_CONFLICT"
          ? 409
          : result.code === "RATE_LIMITED"
            ? 429
            : 422,
      );
    if (result.code === "RATE_LIMITED") reply.header("Retry-After", "1");
    return result;
  });
  app.get("/api/v1/commands/:id", async (req) =>
    service.result(
      sessionToken(req),
      z.uuid().parse((req.params as { id: string }).id),
    ),
  );
  app.get("/api/v1/events", async (req) =>
    service.events(
      sessionToken(req),
      z.coerce
        .number()
        .int()
        .min(0)
        .max(Number.MAX_SAFE_INTEGER)
        .default(0)
        .parse((req.query as { after?: string }).after),
    ),
  );
  app.get(
    "/api/v1/stream",
    {
      websocket: true,
      preValidation: async (req) => {
        await service.db.transaction((c) =>
          service.identity(sessionToken(req), c),
        );
      },
    },
    (socket, req) => {
      const token = sessionToken(req);
      let busy = false;
      let streamId: string | undefined;
      let opening = true;
      void service
        .openStream(token)
        .then((id) => {
          streamId = id;
          opening = false;
          if (socket.readyState !== 1)
            void service.closeStream(id).catch(() => {});
          else void sync();
        })
        .catch(() => socket.close(1008, "Too many streams"));
      const sync = async () => {
        if (busy || opening || socket.readyState !== 1) return;
        busy = true;
        try {
          if (socket.bufferedAmount > 1000000) {
            socket.close(1008);
            return;
          }
          await service.renewStream(streamId!);
          const state = await service.state(token);
          socket.send(JSON.stringify({ type: "snapshot", ...state }));
        } catch {
          socket.close(1008, "Session unavailable");
        } finally {
          busy = false;
        }
      };
      const timer = setInterval(() => {
        void sync();
      }, 1000);
      void sync();
      socket.on("message", () => socket.close(1008, "Read only stream"));
      socket.on("error", () => socket.close());
      socket.on("close", () => {
        clearInterval(timer);
        if (streamId) void service.closeStream(streamId).catch(() => {});
        void service.state(token, false).catch(() => {});
      });
    },
  );
}
