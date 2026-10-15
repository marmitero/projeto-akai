import { randomUUID } from "node:crypto";
import { z } from "zod";
import { OnlineService } from "./online.js";
import { CommunityEvents } from "./community-events.js";
import { Database } from "./database.js";
const [operator, action, target, reason, ...extra] = process.argv.slice(2);
if (!process.env.DATABASE_URL) throw Error("DATABASE_URL required");
const input = z
  .object({
    operator: z.string().min(3).max(80),
    action: z.enum([
      "mute",
      "unmute",
      "suspend",
      "restore",
      "remove-message",
      "resolve-report",
      "start-boss",
    ]),
    target: z.string().min(1).max(80),
    reason: z.string().min(5).max(300),
    extra: z.array(z.string()).max(0),
  })
  .parse({ operator, action, target, reason, extra });
const db = new Database(process.env.DATABASE_URL);
try {
  await db.transaction(async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(41652006)");
    if (input.action === "start-boss") {
      if (
        process.env.AKAI_COMMUNITY_DEBUG !== "1" ||
        process.env.NODE_ENV === "production" ||
        input.target !== "current"
      )
        throw Error("Debug event start is disabled");
      const k = await new CommunityEvents(new OnlineService(db)).ensure(
        c,
        Date.now(),
      );
      const r = await c.query(
        "UPDATE akai_bosses SET start_at=$2,end_at=$3,status='active' WHERE id=$1 AND status='scheduled' AND NOT EXISTS(SELECT 1 FROM akai_boss_members m WHERE m.edition=akai_bosses.id)",
        ["boss:" + k.date, Date.now(), Date.now() + 1800000],
      );
      if (!r.rowCount) throw Error("Edition already started or finished");
    } else if (input.action === "remove-message") {
      const id = z
        .string()
        .regex(/^[1-9]\d{0,18}$/)
        .parse(input.target);
      await c.query("UPDATE akai_chat SET removed=true WHERE id=$1", [id]);
    } else if (input.action === "resolve-report")
      await c.query("UPDATE akai_reports SET resolved=true WHERE id=$1", [
        z.uuid().parse(input.target),
      ]);
    else {
      const id = z.uuid().parse(input.target);
      if (input.action === "mute" || input.action === "unmute")
        await c.query(
          "UPDATE akai_profiles SET muted_until=$2 WHERE account_id=$1",
          [id, input.action === "mute" ? Date.now() + 86400000 : 0],
        );
      else {
        await c.query("SELECT id FROM akai_accounts WHERE id=$1 FOR UPDATE", [
          id,
        ]);
        await c.query(
          "UPDATE akai_profiles SET suspended=$2 WHERE account_id=$1",
          [id, input.action === "suspend"],
        );
        if (input.action === "suspend")
          await c.query(
            "UPDATE akai_sessions SET revoked=true WHERE account_id=$1",
            [id],
          );
      }
    }
    await c.query(
      "INSERT INTO akai_social_audit(id,actor,action,payload,at) VALUES($1,$2,$3,$4,$5)",
      [
        randomUUID(),
        input.operator,
        "moderation:" + input.action,
        { target: input.target, reason: input.reason },
        Date.now(),
      ],
    );
  });
  process.stdout.write("Moderation recorded.\n");
} finally {
  await db.close();
}
