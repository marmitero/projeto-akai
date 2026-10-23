import {GuildWarsV19Service} from './guild-wars-v19.js';
import {readBossArchiveV18} from './boss-archive-v18.js';
import {SeasonsV17Service} from './seasons-v17.js';
import {GuildsV16Service} from './guilds-v16.js';
import {z} from 'zod';
import type {PoolClient} from 'pg';
import {EconomyRunV6Schema,BossEventsV8Schema,MarketV2BookSchema,economyConsumersV9,EconomyActionV6Schema} from '@akai/shared';
import {OnlineService,OnlineError,digest} from './online.js';
import {BossEventsV8Service} from './boss-events-v8.js';
import {EconomyRehearsalService} from './economy-rehearsal.js';
import {ArenaV15Service} from './arena-v15.js';
import {MarketV2Service} from './market-v2.js';
const requireRule=(ok:unknown,code:string,status=403)=>{if(!ok)throw new OnlineError(code,status);};
/** Session identity and canonical membership, never a run/account/realm chosen by the caller. */
export class AuthenticatedV13Service {
 constructor(readonly online:OnlineService){}
 async bindWorld(realmId:string){z.uuid().parse(realmId);return this.online.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(41652013)');
  const old=(await c.query('SELECT realm_id FROM akai_v13_world')).rows[0];
  requireRule(!old||old.realm_id===realmId,'GLOBAL_WORLD_ALREADY_BOUND');
  const realm=(await c.query('SELECT id FROM akai_boss_v8_realms WHERE id=$1 FOR UPDATE',[realmId])).rows[0];requireRule(realm,'EVENT_REALM_NOT_FOUND',404);
  const rows=(await c.query('SELECT r.id,r.account_id,r.closed FROM akai_economy_rehearsals r JOIN akai_boss_v8_members m ON m.run_id=r.id WHERE m.realm_id=$1 ORDER BY r.id FOR SHARE OF r',[realmId])).rows;
  requireRule(rows.length>0&&rows.length<=20&&!rows.some(r=>r.closed),'INVALID_ROSTER');
  if(!old)await c.query('INSERT INTO akai_v13_world VALUES(true,$1)',[realmId]);
  for(const r of rows)await c.query('INSERT INTO akai_v13_members(account_id,run_id) VALUES($1,$2) ON CONFLICT(account_id) DO NOTHING',[r.account_id,r.id]);
  return {bound:true,participants:rows.length,rehearsalOnly:true};
 });}
 async bindMarket(realmId:string){z.uuid().parse(realmId);return this.online.db.transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(41652013)');
  const old=(await c.query('SELECT realm_id FROM akai_v14_market')).rows[0];
  requireRule(!old||old.realm_id===realmId,'GLOBAL_MARKET_ALREADY_BOUND');
  const realm=(await c.query('SELECT id FROM akai_market_v2_realms WHERE id=$1 FOR UPDATE',[realmId])).rows[0];requireRule(realm,'MARKET_REALM_NOT_FOUND',404);
  const members=(await c.query('SELECT m.run_id FROM akai_v13_members m JOIN akai_boss_v8_members b ON b.run_id=m.run_id CROSS JOIN akai_v13_world w WHERE b.realm_id=w.realm_id ORDER BY m.run_id')).rows.map(r=>r.run_id);
  const roster=(await c.query('SELECT run_id FROM akai_market_v2_members WHERE realm_id=$1 ORDER BY run_id',[realmId])).rows.map(r=>r.run_id);
  requireRule(members.length>=2&&members.length<=20&&JSON.stringify(members)===JSON.stringify(roster),'MARKET_CANONICAL_ROSTER_REQUIRED');
  if(!old)await c.query('INSERT INTO akai_v14_market VALUES(true,$1)',[realmId]);
  return {bound:true,participants:members.length,rehearsalOnly:true};
 });}
 async setEnabled(accountId:string,enabled:boolean){z.uuid().parse(accountId);z.boolean().parse(enabled);const r=await this.online.db.pool.query('UPDATE akai_v13_members SET enabled=$2 WHERE account_id=$1',[accountId,enabled]);requireRule(r.rowCount,'MEMBER_NOT_ENROLLED',404);}
 private async membership(c:PoolClient,token:string,lock=false){
  if(lock)await c.query('SELECT token_hash FROM akai_sessions WHERE token_hash=$1 FOR SHARE',[digest(token)]);
  const account=await this.online.identity(token,c);
  const row=(await c.query(`SELECT m.run_id,w.realm_id FROM akai_v13_members m JOIN akai_boss_v8_members b ON b.account_id=m.account_id AND b.run_id=m.run_id CROSS JOIN akai_v13_world w WHERE b.realm_id=w.realm_id AND m.account_id=$1 AND m.enabled ${lock?'FOR SHARE OF m':''}`,[account])).rows[0];
  requireRule(row,'V13_NOT_ENROLLED');return {account,run:row.run_id as string,realm:row.realm_id as string};
 }
 async read(token:string){return this.online.db.transaction(async c=>{
  await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const m=await this.membership(c,token);
  const row=(await c.query('SELECT state,revision,closed FROM akai_economy_rehearsals WHERE id=$1 AND account_id=$2',[m.run,m.account])).rows[0];requireRule(row&&!row.closed,'V13_UNAVAILABLE',409);
  const event=(await c.query('SELECT state FROM akai_boss_v8_realms WHERE id=$1',[m.realm])).rows[0];
  const market=(await c.query('SELECT r.state FROM akai_market_v2_realms r JOIN akai_v14_market pin ON pin.realm_id=r.id JOIN akai_market_v2_members m ON m.realm_id=r.id WHERE m.run_id=$1',[m.run])).rows[0];
  const consumer=economyConsumersV9(EconomyRunV6Schema.parse(row.state),BossEventsV8Schema.parse(event.state),undefined,m.run);
  if(market){
   const book=MarketV2BookSchema.parse(market.state),now=Math.max(this.online.clock(),book.clockMs);
   // Project current expiry without economic writes, and replace private run IDs with public account IDs.
   for(const l of book.listings)if(l.status==='active'&&l.expiresAt<=now)l.status='expired';
   for(const o of book.offers)if(o.status==='pending'&&(o.expiresAt<=now||book.listings.find(l=>l.id===o.listingId)?.status!=='active'))o.status=o.expiresAt<=now?'expired':'closed';
   const members=(await c.query('SELECT m.run_id,m.account_id,m.enabled,COALESCE(p.suspended,false) suspended FROM akai_v13_members m LEFT JOIN akai_profiles p ON p.account_id=m.account_id')).rows;
   const publicId=(run:string)=>members.find(x=>x.run_id===run)?.account_id as string;
   const eligible=(run:string)=>members.some(x=>x.run_id===run&&x.enabled&&!x.suspended);
   const own=economyConsumersV9(EconomyRunV6Schema.parse(row.state),undefined,book,m.run).market!;
   consumer.market={...own,listings:own.listings.filter(l=>l.seller===m.run||eligible(l.seller)).map(l=>({...l,seller:publicId(l.seller)})),offers:own.offers.map(o=>({...o,buyer:publicId(o.buyer)})),trades:own.trades.map(t=>({...t,buyer:publicId(t.buyer),seller:publicId(t.seller)}))};
  }
  return {version:'authenticated-v13-1',rehearsalOnly:true,liveAccountModified:false,capacity:20,revision:Number(row.revision),consumer,wars:await new GuildWarsV19Service(this.online.db,this.online.clock).read(c,m.account),bossArchive:await readBossArchiveV18(c,m.realm,m.account,this.online.clock()),seasons:await new SeasonsV17Service(this.online.db,this.online.clock).read(c,m.account),guilds:await new GuildsV16Service(this.online.db,this.online.clock).read(c,m.account),arena:await new ArenaV15Service(this.online.db,this.online.clock).read(c,m.account)};
 });}
 async command(token:string,input:unknown,kind:'events'|'economy'|'market'|'arena'|'guilds'|'seasons'|'wars'='events'){
  if(kind==='economy')z.object({commandId:z.uuid(),expectedRevision:z.number().int().nonnegative().safe(),action:z.union([EconomyActionV6Schema,z.object({type:z.literal('settle')}).strict()])}).strict().parse(input);
  // Resolve once, then repeat authorization INSIDE the authoritative writer transaction after locks,
  // including on idempotent receipt replay. Revoked sessions/members cannot retrieve old receipts.
  const m=await this.online.db.transaction(c=>this.membership(c,token));
  const authorize=async(c:PoolClient,account:string)=>{
   const current=await this.membership(c,token,true);
   requireRule(current.account===account&&current.run===m.run&&current.realm===m.realm,'FORBIDDEN');
  };
  if(kind==='wars')return new GuildWarsV19Service(this.online.db,this.online.clock,authorize).command(m.run,input);
  if(kind==='seasons')return new SeasonsV17Service(this.online.db,this.online.clock,authorize).command(m.run,input);
  if(kind==='guilds')return new GuildsV16Service(this.online.db,this.online.clock,authorize).command(m.run,input);
  if(kind==='arena'){try{return await new ArenaV15Service(this.online.db,this.online.clock,authorize).command(m.run,input);}catch(e){if(e instanceof Error&&e.message==='COMMAND_ID_REUSED')throw new OnlineError('COMMAND_ID_REUSED',409);throw e;}}
  if(kind==='market'){
   const resolveMarket=async(c:PoolClient)=>{
    const r=(await c.query('SELECT p.realm_id FROM akai_v14_market p JOIN akai_market_v2_members m ON m.realm_id=p.realm_id WHERE m.run_id=$1',[m.run])).rows[0];
    requireRule(r,'V14_MARKET_UNAVAILABLE',409);return r.realm_id as string;
   };
   const realm=await this.online.db.transaction(resolveMarket);
   try{return await new MarketV2Service(this.online.db,this.online.clock,async(c,account)=>{await authorize(c,account);requireRule(await resolveMarket(c)===realm,'FORBIDDEN');},async(c,accounts)=>{
    const rows=(await c.query('SELECT account_id,enabled FROM akai_v13_members WHERE account_id=ANY($1::uuid[]) ORDER BY account_id FOR SHARE',[accounts])).rows;
    if(accounts.some(id=>!rows.some(r=>r.account_id===id&&r.enabled)))throw Error('V13_NOT_ENROLLED');
   }).command(realm,m.run,input);}catch(e){if(e instanceof Error&&e.message==='COMMAND_ID_REUSED')throw new OnlineError('COMMAND_ID_REUSED',409);throw e;}
  }
  try{return kind==='events'?await new BossEventsV8Service(this.online.db,this.online.clock,authorize).command(m.realm,m.run,input):await new EconomyRehearsalService(this.online.db,this.online.clock,authorize).command(m.run,input);}catch(e){
   if(e instanceof Error&&e.message==='COMMAND_ID_REUSED')throw new OnlineError('COMMAND_ID_REUSED',409);
   throw e;
  }
 }
}
