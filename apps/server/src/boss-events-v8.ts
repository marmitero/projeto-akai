import {advanceArchivedBossV18,bindBossGuildV18,closeBossArchiveV18} from './boss-archive-v18.js';
import {randomUUID,createHash,createHmac} from 'node:crypto';
import {z} from 'zod';
import type {PoolClient} from 'pg';
import {initialBossEventsV8,BossEventsV8Schema,advanceBossEventsV8,joinBossEventV8,heartbeatBossEventV8,leaveBossEventV8,heroStatsV3,EconomyRunV6Schema,settleElapsedV7} from '@akai/shared';
import {canonicalJson} from './economy-migration.js';
import type {Database} from './database.js';
const hash=(x:unknown)=>createHash('sha256').update(canonicalJson(x)).digest('hex');
const Command=z.object({commandId:z.uuid(),expectedRevision:z.number().int().nonnegative().safe(),action:z.discriminatedUnion('type',[z.object({type:z.literal('join'),mode:z.enum(['boss','protection'])}).strict(),z.object({type:z.literal('heartbeat')}).strict(),z.object({type:z.literal('leave')}).strict(),z.object({type:z.literal('sync')}).strict()])}).strict();
const rule=(ok:unknown,code:string)=>{if(!ok)throw Error(code);};
/** Private operator adapter. Clock, stats, seeds, damage and grants never come from clients. */
export class BossEventsV8Service{
 constructor(readonly db:Database,readonly clock=()=>Date.now(),readonly authorize?:(c:PoolClient,accountId:string)=>Promise<void>){}
 async stage(input:string[],requestId:string){const ids=z.array(z.uuid()).min(1).max(20).parse(input).sort();z.uuid().parse(requestId);rule(new Set(ids).size===ids.length,'DUPLICATE_RUN');return this.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(41652011)');const old=(await c.query('SELECT id,roster_hash FROM akai_boss_v8_realms WHERE request_id=$1',[requestId])).rows[0];if(old){rule(old.roster_hash===hash(ids),'REQUEST_ID_REUSED');return {id:old.id,created:false};}
  const rows=(await c.query('SELECT id,account_id,closed FROM akai_economy_rehearsals WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids])).rows;rule(rows.length===ids.length&&!rows.some(r=>r.closed),'INVALID_MEMBER');rule(new Set(rows.map(r=>r.account_id)).size===ids.length,'DUPLICATE_ACCOUNT');
  const id=randomUUID();await c.query('INSERT INTO akai_boss_v8_realms VALUES($1,$2,$3,$4)',[id,requestId,hash(ids),initialBossEventsV8(this.clock())]);for(const r of rows)await c.query('INSERT INTO akai_boss_v8_members VALUES($1,$2,$3)',[id,r.id,r.account_id]);return {id,created:true};
 });}
 async command(realmId:string,actor:string,input:unknown){z.uuid().parse(realmId);z.uuid().parse(actor);const cmd=Command.parse(input),payloadHash=hash({realmId,actor,cmd});return this.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(41652016)');
  const canonical=!!(await c.query('SELECT 1 FROM akai_v13_world WHERE realm_id=$1',[realmId])).rowCount;
  const realm=(await c.query('SELECT state FROM akai_boss_v8_realms WHERE id=$1 FOR UPDATE',[realmId])).rows[0];rule(realm,'EVENT_REALM_NOT_FOUND');

  const rows=(await c.query('SELECT r.* FROM akai_economy_rehearsals r JOIN akai_boss_v8_members m ON m.run_id=r.id WHERE m.realm_id=$1 ORDER BY r.id FOR UPDATE OF r',[realmId])).rows,row=rows.find(r=>r.id===actor);rule(row,'MEMBER_NOT_FOUND');
  if(this.authorize)await this.authorize(c,row.account_id);
  const prior=(await c.query('SELECT payload_hash,result FROM akai_boss_v8_commands WHERE run_id=$1 AND command_id=$2',[actor,cmd.commandId])).rows[0];if(prior){rule(prior.payload_hash===payloadHash,'COMMAND_ID_REUSED');return prior.result;}
  if(canonical)await c.query('SELECT account_id FROM akai_v13_members WHERE run_id=ANY($1::uuid[]) ORDER BY account_id FOR SHARE',[rows.map(r=>r.id)]);
  const clocks=canonical?(await c.query('SELECT clock_ms FROM akai_guild_v16_world UNION ALL SELECT clock_ms FROM akai_arena_v15_world UNION ALL SELECT clock_ms FROM akai_season_v17_world')).rows:[];
  const now=Math.max(this.clock(),Number(realm.state.clockMs),...clocks.map(r=>Number(r.clock_ms)));
  const before=Object.fromEntries(rows.map(r=>[r.id,EconomyRunV6Schema.parse(r.state)])),runs=structuredClone(before),book=BossEventsV8Schema.parse(realm.state);let state=book;
  let result:{status:string;code:string;revision:number};const revision=Number(row.revision)+1;
  if(row.closed||cmd.expectedRevision!==Number(row.revision))result={status:'rejected',code:row.closed?'REHEARSAL_CLOSED':'STALE_REVISION',revision};
  else{
   const profiles=(await c.query('SELECT account_id,name,suspended FROM akai_profiles WHERE account_id=ANY($1::uuid[])',[rows.map(r=>r.account_id)])).rows;
   for(const m of Object.values(state.daily.members)){const p=profiles.find(x=>x.account_id===m.accountId);m.suspended=!!p?.suspended||(canonical&&!(await c.query('SELECT 1 FROM akai_v13_members m JOIN akai_economy_rehearsals r ON r.id=m.run_id WHERE m.account_id=$1 AND m.enabled AND NOT r.closed',[m.accountId])).rowCount);}
   const advanced=canonical?await advanceArchivedBossV18(state,now,s=>closeBossArchiveV18(c,realmId,s,now)):advanceBossEventsV8(state,now,30);state=advanced.state;
   for(const r of rows)if(book.sessions[r.account_id]?.active){runs[r.id]!.economy.economicThroughMs=Math.max(runs[r.id]!.economy.economicThroughMs,state.clockMs);runs[r.id]!.encounter=null;runs[r.id]!.nextAt=state.clockMs+3000;}
   if(advanced.backlog)result={status:'settling',code:'EVENT_BACKLOG',revision};
   else{
    const run=runs[actor]!,account=row.account_id,p=profiles.find(x=>x.account_id===account);
    try{
     const action=cmd.action;if(action.type==='join'){
      rule(!state.sessions[account]?.active,'EVENT_ALREADY_ACTIVE');rule(!p?.suspended,'ACCOUNT_SUSPENDED');
      const entropy=(key:string,bound:number)=>{const limit=Math.floor(4294967296/bound)*bound;for(let i=0;;i++){const n=createHmac('sha256',Buffer.from(row.secret,'hex')).update(key+'/'+i).digest().readUInt32BE(0);if(n<limit)return n%bound;}};
      const settled=settleElapsedV7(run,now,1000,entropy);runs[actor]=settled.state;
      if(settled.backlog)result={status:'settling',code:'SETTLEMENT_BACKLOG',revision};
      else{state=joinBossEventV8(state,{accountId:account,name:(p?.name??'Viajante').slice(0,24),highestFloor:settled.state.economy.highest.main,suspended:!!p?.suspended},action.mode,heroStatsV3(settled.state.economy),1+entropy('event/'+cmd.commandId,4294967295));if(canonical&&this.authorize&&action.mode==='boss')await bindBossGuildV18(c,realmId,account,state);runs[actor]!.encounter=null;runs[actor]!.nextAt=now+3000;result={status:'applied',code:'OK',revision};}
     }else{if(action.type==='heartbeat')state=heartbeatBossEventV8(state,account);else if(action.type==='leave')state=leaveBossEventV8(state,account);result={status:'applied',code:'OK',revision};}
    }catch(e){result={status:'rejected',code:e instanceof Error?e.message:'INVALID_ACTION',revision};}
   }
  }
  // Event time is exclusive, including expired leases/absence. It cannot become offline farm.
  for(const r of rows)if(book.sessions[r.account_id]?.active||state.sessions[r.account_id]?.active){runs[r.id]!.economy.economicThroughMs=Math.max(runs[r.id]!.economy.economicThroughMs,state.clockMs);runs[r.id]!.encounter=null;runs[r.id]!.nextAt=state.clockMs+3000;}
  for(const g of state.grants){const inserted=await c.query('INSERT INTO akai_boss_v8_rewards VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING source',[realmId,g.key,g.accountId,g.kind,g.amount,g.at]);if(!inserted.rowCount)continue;const r=rows.find(x=>x.account_id===g.accountId);rule(r,'REWARD_MEMBER_MISSING');const e=runs[r.id]!.economy;if(g.kind==='weekly')e.protection+=g.amount;else e.balances.jade=String(BigInt(e.balances.jade)+BigInt(g.amount)*1000n);}
  for(const b of state.broadcasts)await c.query('INSERT INTO akai_boss_v8_broadcasts VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[realmId,b.id,b]);
  for(const r of rows){const run=EconomyRunV6Schema.parse(runs[r.id]),old=before[r.id]!;if(r.id!==actor&&canonicalJson(run)===canonicalJson(old))continue;const rev=Number(r.revision)+1;
   for(const k of ['coin','coal','iron','gold','jade','protection','masteryMs'] as const){const v=(s:typeof run)=>BigInt(k==='masteryMs'?s.economy.masteryMs:k==='protection'?s.economy.protection:s.economy.balances[k]),balance=v(run),delta=balance-v(old);if(delta)await c.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,$2,$3,$4,$5)',[r.id,rev,k,String(delta),String(balance)]);}
   await c.query('UPDATE akai_economy_rehearsals SET state=$2,revision=$3 WHERE id=$1',[r.id,run,rev]);await c.query('INSERT INTO akai_economy_rehearsal_events VALUES($1,$2,$3,$4)',[r.id,rev,randomUUID(),{kind:'event-v8',realmId,...result}]);
  }
  await c.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realmId,state]);await c.query('INSERT INTO akai_boss_v8_commands VALUES($1,$2,$3,$4,$5)',[actor,cmd.commandId,realmId,payloadHash,result]);await c.query('INSERT INTO akai_boss_v8_events VALUES($1,$2,$3,$4,$5)',[randomUUID(),realmId,actor,cmd.commandId,{...result,action:cmd.action.type}]);return result;
 });}
 async inspect(realmId:string){z.uuid().parse(realmId);const row=(await this.db.pool.query('SELECT state FROM akai_boss_v8_realms WHERE id=$1',[realmId])).rows[0];rule(row,'EVENT_REALM_NOT_FOUND');return BossEventsV8Schema.parse(row.state);}
}
