import type { FastifyInstance } from "fastify";
import type { OnlineService } from "./online.js";
import { MarketService } from "./market.js";
import { sessionToken } from "./routes.js";
export async function marketRoutes(
  app: FastifyInstance,
  online: OnlineService,
) {
  const market = new MarketService(online);
  app.get("/api/v1/market", async (req) =>
    market.read(sessionToken(req), req.query),
  );
  app.post("/api/v1/market/commands", async (req, reply) => {
    const token = sessionToken(req);
    await online.authLimit("market:" + token, 30);
    const r = await market.command(token, req.body);
    if (r.status === "rejected") reply.code(r.code === "FORBIDDEN" ? 403 : 422);
    return r;
  });
  let timer: ReturnType<typeof setInterval> | undefined,
    busy = false;
  app.addHook("onReady", async () => {
    await market.tick();
    timer = setInterval(() => {
      if (busy) return;
      busy = true;
      void market
        .tick()
        .catch(() =>
          app.log.error(
            "Market expiry transaction failed; next tick will retry.",
          ),
        )
        .finally(() => {
          busy = false;
        });
    }, 10000);
    timer.unref();
  });
  app.addHook("preClose", async () => {
    clearInterval(timer);
  });
}
