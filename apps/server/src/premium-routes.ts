import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { OnlineService } from "./online.js";
import type { ServerConfig } from "./config.js";
import { PremiumService } from "./premium.js";
import { sessionToken } from "./routes.js";
export async function premiumRoutes(
  app: FastifyInstance,
  online: OnlineService,
  config: ServerConfig,
) {
  const premium = new PremiumService(online, config);
  app.get("/api/v1/premium", async (req) => premium.read(sessionToken(req)));
  app.post("/api/v1/premium/commands", async (req, reply) => {
    const token = sessionToken(req);
    await online.authLimit("premium:" + token, 20);
    const r = await premium.command(token, req.body);
    if (r.status === "rejected") reply.code(422);
    return r;
  });
  if (config.MONETIZATION_MODE === "sandbox")
    app.post("/api/v1/premium/sandbox", async (req) => {
      const token = sessionToken(req);
      await online.authLimit("sandbox:" + token, 12);
      const body = z.object({ intentId: z.uuid() }).strict().parse(req.body);
      return premium.simulate(token, body.intentId);
    });
  let timer: ReturnType<typeof setInterval> | undefined,
    busy = false;
  app.addHook("onReady", async () => {
    await premium.guard();
    if (!premium.provider) return;
    timer = setInterval(() => {
      if (busy) return;
      busy = true;
      void premium
        .tick()
        .then((result) => {
          if (result.failed)
            app.log.warn(
              { failed: result.failed },
              "Premium provider receipts queued for retry.",
            );
        })
        .catch(() =>
          app.log.error(
            "Premium reconciliation unavailable; persistent queue will retry.",
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
