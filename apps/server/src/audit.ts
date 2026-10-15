import type { Database } from "./database.js";
// Consistent repeatable-read snapshot; never repairs historical economic entries.
export async function reconcileLedger(db: Database) {
  return db.transaction(async (c) => {
    await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const rows = await c.query(`SELECT a.id, r.resource,
    CASE WHEN r.resource='castIron' THEN a.snapshot->'rpg'->>'castIron' ELSE a.snapshot->'balances'->>r.resource END AS balance,
    COALESCE(SUM(l.delta),0)::text AS ledger
    FROM akai_accounts a CROSS JOIN (VALUES ('coin'),('iron'),('coal'),('gold'),('jade'),('ruby'),('castIron')) r(resource)
    LEFT JOIN akai_ledger l ON l.account_id=a.id AND l.resource=r.resource
    GROUP BY a.id,r.resource`);
    return rows.rows.filter((r) => BigInt(r.balance) !== BigInt(r.ledger));
  });
}
