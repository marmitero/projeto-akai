import { Database } from "./database.js";
import { reconcileLedger } from "./audit.js";
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL required");
const db = new Database(process.env.DATABASE_URL);
try {
  const mismatches = await reconcileLedger(db);
  process.stdout.write(JSON.stringify({ mismatches }, null, 2) + "\n");
  if (mismatches.length) process.exitCode = 1;
} finally {
  await db.close();
}
