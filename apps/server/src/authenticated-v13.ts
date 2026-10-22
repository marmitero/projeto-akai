import {z} from 'zod';
import type {PoolClient} from 'pg';
import {EconomyRunV6Schema,BossEventsV8Schema,MarketV2BookSchema,economyConsumersV9} from '@akai/shared';
import {OnlineService,OnlineError,digest} from './online.js';
import {BossEventsV8Service} from './boss-events-v8.js';
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
  const market=(await c.query('SELECT r.state FROM akai_market_v2_realms r JOIN akai_market_v2_members m ON m.realm_id=r.id WHERE m.run_id=$1',[m.run])).rows[0];
  return {version:'authenticated-v13-1',rehearsalOnly:true,liveAccountModified:false,capacity:20,revision:Number(row.revision),consumer:economyConsumersV9(EconomyRunV6Schema.parse(row.state),BossEventsV8Schema.parse(event.state),market?MarketV2BookSchema.parse(market.state):undefined,m.run)};
 });}
 async command(token:string,input:unknown){
  // Resolve once, then repeat authorization INSIDE the authoritative writer transaction after locks,
  // including on idempotent receipt replay. Revoked sessions/members cannot retrieve old receipts.
  const m=await this.online.db.transaction(c=>this.membership(c,token));
  const writer=new BossEventsV8Service(this.online.db,this.online.clock,async(c,account)=>{
   const current=await this.membership(c,token,true);
   requireRule(current.account===account&&current.run===m.run&&current.realm===m.realm,'FORBIDDEN');
  });
  return writer.command(m.realm,m.run,input);
 }
}
