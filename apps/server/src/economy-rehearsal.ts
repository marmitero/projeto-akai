import {randomBytes,randomUUID,createHmac,createHash} from 'node:crypto';
import {z} from 'zod';
import {initialRunV6,EconomyRunV6Schema,EconomyActionV6Schema,settleElapsedV7,applyEconomyActionV6,type EconomyRunV6} from '@akai/shared';
import {prepareLegacyMarketReconciliation,verifyLegacyMarketReconciliation,prepareEconomyMigration,verifyEconomyMigration,rehearseEconomyRollback,canonicalJson,type EconomyMigrationPlan} from './economy-migration.js';
import type {Database} from './database.js';
const hash=(x:unknown)=>createHash('sha256').update(canonicalJson(x)).digest('hex');
const Command=z.object({commandId:z.uuid(),expectedRevision:z.number().int().nonnegative().safe(),action:z.union([EconomyActionV6Schema,z.object({type:z.literal('settle')}).strict(),z.object({type:z.literal('close')}).strict()])}).strict();
export class EconomyRehearsalService {
 constructor(readonly db:Database,readonly clock=()=>Date.now()){}
 /** Creates a private copy under locks. Legacy accounts, assets, premium and live ledgers are never edited. */
 async stage(accountId:string,requestId:string,reconcileLegacyMarket=false){
  z.uuid().parse(accountId);z.uuid().parse(requestId);return this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(41652006)');
   const row=(await c.query('SELECT snapshot FROM akai_accounts WHERE id=$1 FOR UPDATE',[accountId])).rows[0];if(!row)throw Error('ACCOUNT_NOT_FOUND');
   const existing=(await c.query('SELECT id,archive FROM akai_economy_rehearsals WHERE account_id=$1 AND request_id=$2',[accountId,requestId])).rows[0];if(existing){if((existing.archive.version==='legacy-market-reconciliation-1')!==reconcileLegacyMarket)throw Error('REQUEST_MODE_REUSED');return {id:existing.id,created:false};}
   const escrow=(await c.query("SELECT * FROM akai_market_listings WHERE seller=$1 AND status<>'sold' AND NOT claimed ORDER BY id",[accountId])).rows;
   const pendingOffers=(await c.query("SELECT * FROM akai_market_offers WHERE buyer=$1 AND status='pending' ORDER BY id",[accountId])).rows;
   const rubyDebt=(await c.query('SELECT ruby::text FROM akai_premium_debts WHERE account_id=$1',[accountId])).rows[0]?.ruby??'0';
   const spending=(await c.query('SELECT resource,reason,SUM(-delta)::text amount FROM akai_ledger WHERE account_id=$1 AND delta<0 GROUP BY resource,reason ORDER BY resource,reason',[accountId])).rows;
   const context={accountId,cutoverMs:this.clock(),snapshot:row.snapshot,escrow,pendingOffers,rubyDebt,spending};
   const plan=reconcileLegacyMarket?prepareLegacyMarketReconciliation(context):prepareEconomyMigration(context);
   if('source' in plan)verifyLegacyMarketReconciliation(plan);else verifyEconomyMigration(plan);
   if(plan.blockers.length)throw Error(plan.blockers.join(','));
   const id=randomUUID(),run=initialRunV6(accountId,this.clock());run.economy=plan.projected;
   await c.query('INSERT INTO akai_economy_rehearsals(id,account_id,request_id,source_hash,archive,initial_state,state,secret) VALUES($1,$2,$3,$4,$5,$6,$6,$7)',[id,accountId,requestId,plan.sourceHash,plan,run,randomBytes(32).toString('hex')]);
   return {id,created:true};
  });
 }
 /** Internal/operator-only command processor. Not registered as an HTTP route. */
 async command(runId:string,input:unknown){
  z.uuid().parse(runId);const cmd=Command.parse(input),payloadHash=hash(cmd);
  return this.db.transaction(async c=>{
   const row=(await c.query('SELECT * FROM akai_economy_rehearsals WHERE id=$1 FOR UPDATE',[runId])).rows[0];if(!row)throw Error('RUN_NOT_FOUND');
   const prior=(await c.query('SELECT payload_hash,result FROM akai_economy_rehearsal_commands WHERE run_id=$1 AND command_id=$2',[runId,cmd.commandId])).rows[0];
   if(prior){if(prior.payload_hash!==payloadHash)throw Error('COMMAND_ID_REUSED');return prior.result;}
   if(row.closed)throw Error('REHEARSAL_CLOSED');
   let run=EconomyRunV6Schema.parse(row.state);const before=structuredClone(run);let result:{status:string;code?:string;revision:number;backlog?:boolean};
   const revision=Number(row.revision)+1;
   // Crypto entropy is derived by stable economic event identity, independent of polling/read partition.
   const entropy=(key:string,bound:number)=>{const limit=Math.floor(4294967296/bound)*bound;for(let i=0;;i++){const n=createHmac('sha256',Buffer.from(row.secret,'hex')).update(key+'/'+i).digest().readUInt32BE(0);if(n<limit)return n%bound;}};
   try{
    if(cmd.expectedRevision!==Number(row.revision))throw Error('STALE_REVISION');
    const event=(await c.query('SELECT e.state FROM akai_boss_v8_realms e JOIN akai_boss_v8_members m ON m.realm_id=e.id WHERE m.run_id=$1',[runId])).rows[0];if(event?.state.sessions[run.economy.accountId]?.active)throw Error('EVENT_ACTIVITY_ACTIVE');
    const now=this.clock();if(now<run.economy.economicThroughMs)throw Error('ECONOMY_CLOCK_REWIND');
    const settled=settleElapsedV7(run,now,1000,entropy);run=settled.state;
    if(settled.backlog){
     // Commit bounded progress even when a mutation was requested. Caller must retry
     // that mutation with a new command ID/revision once settlement has finished.
     result={status:'settling',code:'SETTLEMENT_BACKLOG',revision,backlog:true};
    }else{
    if(cmd.action.type==='close'){const membership=(await c.query('SELECT w.state FROM akai_market_v2_realms w JOIN akai_market_v2_members m ON m.realm_id=w.id WHERE m.run_id=$1',[runId])).rows[0];
     if(membership&&(membership.state.listings.some((l:{seller:string;status:string;claimed:boolean})=>l.seller===runId&&l.status!=='sold'&&!l.claimed)||membership.state.offers.some((o:{buyer:string;status:string})=>o.buyer===runId&&o.status==='pending')))throw Error('MARKET_ASSETS_PENDING');}
    if(cmd.action.type!=='settle'&&cmd.action.type!=='close')run=applyEconomyActionV6(run,cmd.action,(key,bound)=>entropy('command/'+cmd.commandId+'/'+key,bound));
    result={status:'applied',revision,backlog:false};
    }
   }catch(error){run=before;result={status:'rejected',code:error instanceof Error?error.message:'INVALID_COMMAND',revision};}
   for(const resource of ['coin','coal','iron','gold','jade','protection','masteryMs'] as const){
    const balance=resource==='masteryMs'?BigInt(run.economy.masteryMs):resource==='protection'?BigInt(run.economy.protection):BigInt(run.economy.balances[resource]);
    const previous=resource==='masteryMs'?BigInt(before.economy.masteryMs):resource==='protection'?BigInt(before.economy.protection):BigInt(before.economy.balances[resource]);
    if(balance!==previous)await c.query('INSERT INTO akai_economy_rehearsal_ledger(run_id,sequence,resource,delta,balance) VALUES($1,$2,$3,$4,$5)',[runId,revision,resource,String(balance-previous),String(balance)]);
   }
   await c.query('UPDATE akai_economy_rehearsals SET state=$2,revision=$3,closed=$4 WHERE id=$1',[runId,run,revision,result.status==='applied'&&cmd.action.type==='close']);
   await c.query('INSERT INTO akai_economy_rehearsal_events(run_id,sequence,event_id,payload) VALUES($1,$2,$3,$4)',[runId,revision,randomUUID(),{...result,action:cmd.action.type}]);
   await c.query('INSERT INTO akai_economy_rehearsal_commands(run_id,command_id,payload_hash,result) VALUES($1,$2,$3,$4)',[runId,cmd.commandId,payloadHash,result]);
   return result;
  });
 }
 async inspect(runId:string){z.uuid().parse(runId);const r=(await this.db.pool.query('SELECT state,revision,closed,source_hash FROM akai_economy_rehearsals WHERE id=$1',[runId])).rows[0];if(!r)throw Error('RUN_NOT_FOUND');return {...r,state:EconomyRunV6Schema.parse(r.state)};}
 async rollbackArchive(runId:string){z.uuid().parse(runId);const r=(await this.db.pool.query('SELECT archive FROM akai_economy_rehearsals WHERE id=$1',[runId])).rows[0];if(!r)throw Error('RUN_NOT_FOUND');return r.archive.version==='legacy-market-reconciliation-1'?verifyLegacyMarketReconciliation(r.archive):rehearseEconomyRollback(r.archive as EconomyMigrationPlan);}
 async reconcile(runId:string){
  z.uuid().parse(runId);return this.db.transaction(async c=>{
   await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
   const row=(await c.query('SELECT state,initial_state FROM akai_economy_rehearsals WHERE id=$1',[runId])).rows[0];if(!row)throw Error('RUN_NOT_FOUND');
   const state=EconomyRunV6Schema.parse(row.state),initial=EconomyRunV6Schema.parse(row.initial_state);
   const sums=(await c.query('SELECT resource,SUM(delta)::text amount FROM akai_economy_rehearsal_ledger WHERE run_id=$1 GROUP BY resource',[runId])).rows;
   const diff:string[]=[];for(const k of ['coin','coal','iron','gold','jade','protection','masteryMs'] as const){const v=(s:EconomyRunV6)=>BigInt(k==='masteryMs'?s.economy.masteryMs:k==='protection'?s.economy.protection:s.economy.balances[k]);if(v(state)!==v(initial)+BigInt(sums.find(r=>r.resource===k)?.amount??'0'))diff.push(k);}return diff;
  });
 }
}
