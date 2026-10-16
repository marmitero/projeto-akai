import { z } from "zod";
import { Database } from "./database.js";
import { OnlineService } from "./online.js";
import { parseServerConfig } from "./config.js";
import { PremiumService } from "./premium.js";
import { SandboxProvider } from "./premium-providers.js";
const [operator, reference, state, reason, ...extra] = process.argv.slice(2);
const input = z
  .object({
    operator: z.string().min(3).max(80),
    reference: z.uuid(),
    state: z.enum(["PENDING", "PURCHASED", "CANCELLED"]),
    reason: z.string().min(5).max(300),
    extra: z.array(z.string()).max(0),
  })
  .parse({ operator, reference, state, reason, extra });
const config = parseServerConfig(process.env);
if (config.MONETIZATION_MODE !== "sandbox" || !config.DATABASE_URL)
  throw Error("Dedicated sandbox database required");
const db = new Database(config.DATABASE_URL);
try {
  const service = new PremiumService(new OnlineService(db), config);
  await service.guard();
  await (service.provider as SandboxProvider).setState(
    input.reference,
    input.state,
    input.operator,
    input.reason,
  );
  await service.tick();
  process.stdout.write("Sandbox provider state audited and reconciled.\n");
} finally {
  await db.close();
}
