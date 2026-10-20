import { createHash } from 'node:crypto';
import { z } from 'zod';
import { LocalSnapshotSchema, EconomyV2Schema, ECONOMY_V2_CONFIG, initialEconomyV2, type EconomyV2 } from '@akai/shared';
import type { Database } from './database.js';
export const MIGRATION_PLAN_VERSION='economy-r2-plan-1';
const ContextSchema=z.object({
  accountId:z.uuid(),cutoverMs:z.number().int().nonnegative().safe(),snapshot:LocalSnapshotSchema,
  escrow:z.array(z.record(z.string(),z.unknown())),pendingOffers:z.array(z.record(z.string(),z.unknown())),
  rubyDebt:z.string().regex(/^(0|[1-9]\d{0,37})$/),
  spending:z.array(z.object({resource:z.string(),reason:z.string(),amount:z.string().regex(/^(0|[1-9]\d{0,37})$/)}).strict()),
}).strict();
export type MigrationContext=z.input<typeof ContextSchema>;
/** Canonical JSON is hashed, not JS object insertion order. Only JSON data accepted. */
export function canonicalJson(value:unknown):string {
  if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(canonicalJson).join(',')+']';
  if(typeof value==='object'&&value!==null&&Object.getPrototypeOf(value)===Object.prototype)
    return '{'+Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>JSON.stringify(k)+':'+canonicalJson(v)).join(',')+'}';
  throw Error('NON_JSON_BACKUP');
}
const digest=(value:unknown)=>createHash('sha256').update(canonicalJson(value)).digest('hex');
export function prepareEconomyMigration(input:MigrationContext) {
  const context=ContextSchema.parse(input);
  const archive=structuredClone(input); // Keep original snapshot bytes/fields represented as JSON, before schema defaults.
  canonicalJson(archive);
  const sourceHash=digest(archive);
  const projected=initialEconomyV2(context.accountId,context.cutoverMs);
  projected.vault=context.snapshot.rpg.inventory.map(i=>({id:`${context.accountId}/legacy/${i.id}`,origin:'legacy' as const,
    definitionId:i.definitionId,rarity:i.rarity,level:i.level,enhancement:Math.min(i.enhancement,7),qualityBp:10000}));
  const blockers:string[]=[];
  if(context.escrow.length)blockers.push('UNRESOLVED_MARKET_ASSETS');
  if(context.pendingOffers.length)blockers.push('PENDING_MARKET_OFFERS');
  return {version:MIGRATION_PLAN_VERSION,configVersion:ECONOMY_V2_CONFIG,accountId:context.accountId,
    sourceHash,archive,projected:EconomyV2Schema.parse(projected),
    quarantine:{balances:structuredClone(context.snapshot.balances),castIron:context.snapshot.rpg.castIron,
      upgrades:structuredClone(context.snapshot.upgrades),goldLevel:context.snapshot.rpg.goldLevel,jadeLevel:context.snapshot.rpg.jadeLevel,
      petLevel:context.snapshot.rpg.petLevel,spending:structuredClone(context.spending),spendable:false as const},
    premium:{ruby:context.snapshot.balances.ruby,debt:context.rubyDebt,policy:'existing-ledger-no-copy' as const},
    blockers,activationAllowed:false as const};
}
export type EconomyMigrationPlan=ReturnType<typeof prepareEconomyMigration>;
export function verifyEconomyMigration(plan:EconomyMigrationPlan):EconomyV2 {
  if(plan.version!==MIGRATION_PLAN_VERSION||plan.configVersion!==ECONOMY_V2_CONFIG||digest(plan.archive)!==plan.sourceHash)throw Error('MIGRATION_BACKUP_MISMATCH');
  const expected=prepareEconomyMigration(plan.archive);
  if(canonicalJson(expected)!==canonicalJson(plan))throw Error('MIGRATION_PLAN_MISMATCH');
  return EconomyV2Schema.parse(plan.projected);
}
/** Rehearsal rollback returns the original archive, not an inverse transformation of new balances. */
export function rehearseEconomyRollback(plan:EconomyMigrationPlan):MigrationContext {
  verifyEconomyMigration(plan);
  return structuredClone(plan.archive);
}
/** Coherent read-only snapshot of accounts, escrow and debt. Does not run migrations or settle combat. */
export async function dryRunEconomyDatabase(db:Database,cutoverMs:number,limit=100) {
  z.number().int().min(1).max(5000).parse(limit);
  z.number().int().nonnegative().safe().parse(cutoverMs);
  return db.transaction(async c=>{
    await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
    const ids=(await c.query('SELECT id,snapshot FROM akai_accounts ORDER BY id LIMIT $1',[limit+1])).rows;
    if(ids.length>limit)throw Error('ACCOUNT_LIMIT_EXCEEDED: choose a larger explicit limit');
    const plans:EconomyMigrationPlan[]=[];
    for(const a of ids){
      const escrow=(await c.query("SELECT * FROM akai_market_listings WHERE seller=$1 AND status<>'sold' AND NOT claimed ORDER BY id",[a.id])).rows;
      const pendingOffers=(await c.query("SELECT * FROM akai_market_offers WHERE buyer=$1 AND status='pending' ORDER BY id",[a.id])).rows;
      const debt=(await c.query('SELECT ruby::text FROM akai_premium_debts WHERE account_id=$1',[a.id])).rows[0]?.ruby??'0';
      const spending=(await c.query("SELECT resource,reason,SUM(-delta)::text AS amount FROM akai_ledger WHERE account_id=$1 AND delta<0 GROUP BY resource,reason ORDER BY resource,reason",[a.id])).rows;
      const plan=prepareEconomyMigration({accountId:a.id,cutoverMs,snapshot:a.snapshot,escrow,pendingOffers,rubyDebt:debt,spending});
      verifyEconomyMigration(plan);rehearseEconomyRollback(plan);plans.push(plan);
    }
    return {version:MIGRATION_PLAN_VERSION,readOnly:true,activationAllowed:false,accountCount:plans.length,
      blockedAccounts:plans.filter(p=>p.blockers.length).length,plans};
  });
}
