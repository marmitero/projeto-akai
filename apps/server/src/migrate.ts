import { Database } from "./database.js";
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL required");
const db = new Database(process.env.DATABASE_URL);
try {
  await db.migrate();
  process.stdout.write("Online schema ready.\n");
} finally {
  await db.close();
}
