import type { FastifyInstance } from "fastify";
import type { OnlineService } from "./online.js";
import { CommunityService } from "./community.js";
import { sessionToken } from "./routes.js";
export async function communityRoutes(
  app: FastifyInstance,
  online: OnlineService,
) {
  const service = new CommunityService(online);
  app.get("/api/v1/community/identity", async (req) =>
    service.identity(sessionToken(req)),
  );
  app.get("/api/v1/community", async (req) => service.read(sessionToken(req)));
  app.post("/api/v1/community/commands", async (req, reply) => {
    const token = sessionToken(req);
    await online.authLimit("community:" + token, 60);
    const result = await service.command(token, req.body);
    if (result.status === "rejected") {
      reply.code(
        result.code.includes("FORBIDDEN") || result.code === "CHAT_MUTED"
          ? 403
          : result.code.includes("COOLDOWN")
            ? 429
            : 422,
      );
    }
    return result;
  });
  let timer: ReturnType<typeof setInterval> | undefined,
    busy = false;
  app.addHook("onReady", async () => {
    await service.tick();
    timer = setInterval(() => {
      if (busy) return;
      busy = true;
      void service
        .tick()
        .catch(() =>
          app.log.error(
            "Community scheduler transaction failed; next tick will retry.",
          ),
        )
        .finally(() => {
          busy = false;
        });
    }, 2000);
    timer.unref();
  });
  app.addHook("preClose", async () => {
    clearInterval(timer);
  });
}
