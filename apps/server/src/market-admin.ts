import { z } from "zod";
import { Database } from "./database.js";
import { OnlineService } from "./online.js";
import { MarketService } from "./market.js";
const [operator, listingId, reason, ...extra] = process.argv.slice(2);
const input = z
  .object({
    operator: z.string().min(3).max(80),
    listingId: z.uuid(),
    reason: z.string().min(5).max(300),
    extra: z.array(z.string()).max(0),
  })
  .parse({ operator, listingId, reason, extra });
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL required");
const db = new Database(process.env.DATABASE_URL);
try {
  await new MarketService(new OnlineService(db)).moderate(
    input.operator,
    input.listingId,
    input.reason,
  );
  process.stdout.write("Market moderation recorded.\n");
} finally {
  await db.close();
}
