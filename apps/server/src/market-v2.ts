import {createHash,createHmac,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {PoolClient} from 'pg';
import {EconomyRunV6Schema,MarketV2CommandSchema,MarketV2BookSchema,initialMarketV2,syncMarketV2,applyMarketV2,settleElapsedV7,MARKET_V2_RULES,type MarketV2World} from '@akai/shared';
import {canonicalJson} from './economy-migration.js';
import type {Database} from './database.js';
const hash=(v:unknown)=>createHash('sha256').update(canonicalJson(v)).digest('hex');
const rule=(ok:unknown,code:string)=>{if(!ok)throw Error(code);};
/** Private-cohort writer; HTTP callers must supply transactional authorization hooks. */
export class MarketV2Service {
 constructor(readonly db:Database,readonly clock=()=>Date.now(),readonly authorize?:(c:PoolClient,accountId:string)=>Promise<void>,readonly authorizeParties?:(c:PoolClient,accounts:string[])=>Promise<void>){}
 async stage(input:string[],requestId:string){
  const ids=z.array(z.uuid()).min(2).max(20).parse(input).sort();z.uuid().parse(requestId);rule(new Set(ids).size===ids.length,'DUPLICATE_MEMBER');
  return this.db.transaction(async c=>{
   await c.query('SELECT pg_advisory_xact_lock(41652010)');const prior=(await c.query('SELECT id,roster_hash FROM akai_market_v2_realms WHERE request_id=$1',[requestId])).rows[0];if(prior){rule(prior.roster_hash===hash(ids),'REQUEST_ID_REUSED');return {id:prior.id,created:false};}
   const rows=(await c.query('SELECT id,state,closed FROM akai_economy_rehearsals WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[ids])).rows;rule(rows.length===ids.length&&!rows.some(r=>r.closed),'INVALID_REHEARSAL_MEMBER');
   const world=initialMarketV2(Object.fromEntries(rows.map(r=>[r.id,EconomyRunV6Schema.parse(r.state)])),this.clock()),id=randomUUID();
   await c.query('INSERT INTO akai_market_v2_realms VALUES($1,$2,$3,$4)',[id,requestId,hash(ids),world.book]);for(const member of ids)await c.query('INSERT INTO akai_market_v2_members VALUES($1,$2)',[id,member]);return {id,created:true};
  });
 }
 async command(realmId:string,actor:string,input:unknown){
  z.uuid().parse(realmId);z.uuid().parse(actor);const cmd=MarketV2CommandSchema.parse(input),payloadHash=hash({realmId,actor,cmd});
  return this.db.transaction(async c=>{
   const realm=(await c.query('SELECT state FROM akai_market_v2_realms WHERE id=$1 FOR UPDATE',[realmId])).rows[0];rule(realm,'MARKET_REALM_NOT_FOUND');
   const rows=(await c.query('SELECT r.* FROM akai_economy_rehearsals r JOIN akai_market_v2_members m ON m.run_id=r.id WHERE m.realm_id=$1 ORDER BY r.id FOR UPDATE OF r',[realmId])).rows;
   const row=rows.find(r=>r.id===actor);rule(row,'MEMBER_NOT_FOUND');
   if(this.authorize)await this.authorize(c,row.account_id);
   const prior=(await c.query('SELECT realm_id,payload_hash,result FROM akai_market_v2_commands WHERE run_id=$1 AND command_id=$2',[actor,cmd.commandId])).rows[0];if(prior){rule(prior.realm_id===realmId&&prior.payload_hash===payloadHash,'COMMAND_ID_REUSED');return prior.result;}
   const before=Object.fromEntries(rows.map(r=>[r.id,EconomyRunV6Schema.parse(r.state)]));let world:MarketV2World={book:MarketV2BookSchema.parse(realm.state),runs:structuredClone(before)};
   let result:{status:string;code:string;revision:number;listingId?:string};
   const changed=new Set<string>([actor]);
   try{
    rule(!row.closed,'REHEARSAL_CLOSED');rule(cmd.expectedRevision===Number(row.revision),'STALE_REVISION');const now=Math.max(this.clock(),world.book.clockMs);world=syncMarketV2(world,now);
    const social=(await c.query('SELECT e.state FROM akai_boss_v8_realms e JOIN akai_boss_v8_members m ON m.realm_id=e.id WHERE m.run_id=ANY($1::uuid[])',[rows.map(r=>r.id)])).rows;const socialActive=new Set<string>(social.flatMap(e=>Object.entries(e.state.sessions).filter(([,p]:[string,any])=>p.active).map(([id])=>id)));

    let backlog=false;
    for(const r of rows){if(r.closed||socialActive.has(r.account_id))continue;const entropy=(key:string,bound:number)=>{const limit=Math.floor(4294967296/bound)*bound;for(let i=0;;i++){const n=createHmac('sha256',Buffer.from(r.secret,'hex')).update(key+'/'+i).digest().readUInt32BE(0);if(n<limit)return n%bound;}};
     const settled=settleElapsedV7(world.runs[r.id]!,now,1000,entropy);world.runs[r.id]=settled.state;backlog ||= settled.backlog;
    }
    if(backlog)result={status:'settling',code:'SETTLEMENT_BACKLOG',revision:Number(row.revision)+1};
    else{
     const a=cmd.action,offer='offerId' in a?world.book.offers.find(o=>o.id===a.offerId):undefined,lid='listingId' in a?a.listingId:offer?.listingId,l=world.book.listings.find(l=>l.id===lid);
     const parties=[actor,...(l?[l.seller]:[]),...(a.type==='offer.accept'&&offer?[offer.buyer]:[])];
     rule(!rows.some(r=>parties.includes(r.id)&&r.closed),'REHEARSAL_CLOSED');rule(!rows.some(r=>parties.includes(r.id)&&socialActive.has(r.account_id)),'EVENT_ACTIVITY_ACTIVE');
     const accounts=rows.filter(r=>parties.includes(r.id)).map(r=>before[r.id]!.economy.accountId);
     if(this.authorizeParties)await this.authorizeParties(c,accounts);
     rule(!(await c.query('SELECT 1 FROM akai_profiles WHERE account_id=ANY($1::uuid[]) AND suspended LIMIT 1',[accounts])).rowCount,'ACCOUNT_SUSPENDED');
     try{const applied=applyMarketV2(world,actor,a,now,randomUUID);world=applied.world;result={status:'applied',code:'OK',revision:Number(row.revision)+1,...(applied.listingId?{listingId:applied.listingId}:{})};}
     catch(e){result={status:'rejected',code:e instanceof z.ZodError?'INVALID_MARKET_STATE':e instanceof Error?e.message:'INVALID_ACTION',revision:Number(row.revision)+1};}
    }
   }catch(e){world={book:MarketV2BookSchema.parse(realm.state),runs:structuredClone(before)};result={status:'rejected',code:e instanceof Error?e.message:'INVALID_COMMAND',revision:Number(row.revision)+1};}
   for(const r of rows)if(canonicalJson(world.runs[r.id])!==canonicalJson(before[r.id]))changed.add(r.id);
   for(const r of rows){if(!changed.has(r.id))continue;const run=world.runs[r.id]!,old=before[r.id]!,rev=Number(r.revision)+1;
    for(const k of ['coin','coal','iron','gold','jade','protection','masteryMs'] as const){const value=(s:typeof run)=>BigInt(k==='masteryMs'?s.economy.masteryMs:k==='protection'?s.economy.protection:s.economy.balances[k]);const after=value(run),delta=after-value(old);if(delta)await c.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,$2,$3,$4,$5)',[r.id,rev,k,String(delta),String(after)]);}
    await c.query('UPDATE akai_economy_rehearsals SET state=$2,revision=$3 WHERE id=$1',[r.id,run,rev]);await c.query('INSERT INTO akai_economy_rehearsal_events VALUES($1,$2,$3,$4)',[r.id,rev,randomUUID(),{kind:'market-v2',realmId,commandId:cmd.commandId,...result}]);
   }
   const oldBook=MarketV2BookSchema.parse(realm.state);
   for(const l of world.book.listings)if(!oldBook.listings.some(x=>x.id===l.id))await c.query('INSERT INTO akai_market_v2_fees VALUES($1,$2,$3)',[realmId,'listing/'+l.id,MARKET_V2_RULES.listingMilli]);
   for(const t of world.book.trades)if(!oldBook.trades.some(x=>x.id===t.id)){await c.query('INSERT INTO akai_market_v2_trades VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[t.id,realmId,t.listingId,t.buyer,t.seller,t.price,t.fee,t.net,t.asset,t.at]);await c.query('INSERT INTO akai_market_v2_fees VALUES($1,$2,$3)',[realmId,'sale/'+t.id,t.fee]);}
   await c.query('UPDATE akai_market_v2_realms SET state=$2 WHERE id=$1',[realmId,world.book]);
   await c.query('INSERT INTO akai_market_v2_commands VALUES($1,$2,$3,$4,$5)',[realmId,actor,cmd.commandId,payloadHash,result]);
   await c.query('INSERT INTO akai_market_v2_events VALUES($1,$2,$3,$4,$5)',[randomUUID(),realmId,actor,cmd.commandId,{...result,action:cmd.action,bookRevision:world.book.revision}]);return result;
  });
 }
 async inspect(realmId:string){z.uuid().parse(realmId);return this.db.transaction(async c=>{await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');const r=(await c.query('SELECT state FROM akai_market_v2_realms WHERE id=$1',[realmId])).rows[0];rule(r,'MARKET_REALM_NOT_FOUND');const rows=(await c.query('SELECT r.id,r.state,r.revision,r.closed FROM akai_economy_rehearsals r JOIN akai_market_v2_members m ON r.id=m.run_id WHERE m.realm_id=$1 ORDER BY r.id',[realmId])).rows;return {book:MarketV2BookSchema.parse(r.state),members:rows.map(x=>({id:x.id,revision:Number(x.revision),closed:x.closed,state:EconomyRunV6Schema.parse(x.state)}))};});}
}
