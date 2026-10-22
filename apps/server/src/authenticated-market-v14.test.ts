import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Database} from './database.js';
import {OnlineService} from './online.js';
import {EconomyRehearsalService} from './economy-rehearsal.js';
import {BossEventsV8Service} from './boss-events-v8.js';
import {MarketV2Service} from './market-v2.js';
import {AuthenticatedV13Service} from './authenticated-v13.js';
import {buildServer} from './app.js';
import {parseServerConfig} from './config.js';
const url=process.env.TEST_DATABASE_URL;
describe.skipIf(!url)('V14 authenticated market on the canonical test wallet',()=>{
 let base:Database,db:Database,online:OnlineService,economy:EconomyRehearsalService,market:MarketV2Service,boss:BossEventsV8Service,service:AuthenticatedV13Service,app:ReturnType<typeof buildServer>,schema:string,realm:string,now:number;
 let users:Array<{token:string;accountId:string;run:string;source:unknown}>;
 const headers=(token?:string)=>({'x-akai-client':'1',origin:'http://localhost:5173',...(token?{cookie:'akai_session='+token}:{})});
 beforeEach(async()=>{
  now=Date.parse('2026-10-21T18:00:00-03:00');base=new Database(url!);schema='v14_'+randomUUID().replaceAll('-','');await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);u.searchParams.set('application_name',schema);db=new Database(u.toString());await db.migrate();online=new OnlineService(db,()=>now);economy=new EconomyRehearsalService(db,()=>now);boss=new BossEventsV8Service(db,()=>now);market=new MarketV2Service(db,()=>now);service=new AuthenticatedV13Service(online);users=[];
  for(let n=0;n<3;n++){
   const user=await online.guest(),run=(await economy.stage(user.accountId,randomUUID())).id,r=await economy.inspect(run);r.state.paused=true;r.state.economy.highest.main=100;r.state.economy.balances.coin='2000000000';r.state.economy.balances.iron='100000';r.state.economy.economicThroughMs=now;r.state.economy.equipped.weapon=null;r.state.economy.inventory[0]!.enhancement=7;r.state.economy.inventory[0]!.qualityBp=10321;
   await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[run,r.state]);for(const k of ['coin','iron'] as const)await db.pool.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,$2,$3,$3)',[run,k,r.state.economy.balances[k]]);
   users.push({...user,run,source:(await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[user.accountId])).rows[0].snapshot});
  }
  const event=(await boss.stage(users.map(u=>u.run),randomUUID())).id;await service.bindWorld(event);realm=(await market.stage(users.map(u=>u.run),randomUUID())).id;await service.bindMarket(realm);
  app=buildServer(parseServerConfig({DATABASE_URL:u.toString(),V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}),false,{service:online});await app.ready();
 },30000);
 afterEach(async()=>{vi.restoreAllMocks();await app?.close();await db?.close();if(base){await base.pool.query('DROP SCHEMA '+schema+' CASCADE');await base.close();}});
 async function state(n=0){return service.read(users[n]!.token);}
 async function input(n:number,action:Record<string,unknown>){return {commandId:randomUUID(),expectedRevision:(await state(n)).revision,action};}
 async function post(n:number,body:unknown){return app.inject({method:'POST',url:'/api/v1/test-v2/market',payload:JSON.stringify(body),headers: {...headers(users[n]!.token), 'content-type':'application/json'}});}
 async function act(n:number,action:Record<string,unknown>){return post(n,await input(n,action));}
 async function listing(){const item=(await state()).consumer.inventory[0]!;const r=await act(0,{type:'list.item',itemId:item.id,price:'200000001',currency:'coin'});expect(r.json().status).toBe('applied');return {id:r.json().listingId as string,item};}
 async function reconciled(){for(const u of users){expect(await economy.reconcile(u.run)).toEqual([]);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[u.accountId])).rows[0].snapshot).toEqual(u.source);}}
 it('derives actor/realm from session, rejects forged fields, currencies, origins and missing membership',async()=>{
  const body=await input(0,{type:'sync'});
  expect((await app.inject({method:'POST',url:'/api/v1/test-v2/market',headers:headers(),payload:body})).statusCode).toBe(401);
  const outsider=await online.guest();expect((await app.inject({method:'POST',url:'/api/v1/test-v2/market',headers:headers(outsider.token),payload:body})).statusCode).toBe(403);
  for(const payload of [{...body,actor:users[1]!.run},{...body,realmId:realm},{...body,action:{type:'list.resource',resource:'jade',quantity:'1000',price:'2000',currency:'coin'}},{...body,action:{type:'list.resource',resource:'iron',quantity:'1000',price:'2000',currency:'ruby'}},{...body,action:{type:'sync',now:now+999}}])expect((await post(0,payload)).statusCode).toBe(400);
  expect((await app.inject({method:'POST',url:'/api/v1/test-v2/market',headers:{...headers(users[0]!.token),origin:'https://evil.example'},payload:body})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:'/api/v1/test-v2/market?accountId='+users[1]!.accountId,headers:headers(users[0]!.token),payload:body})).statusCode).toBe(400);
  await reconciled();
 });
 it('pins the exact canonical roster and never changes the market binding',async()=>{
  expect(await service.bindMarket(realm)).toMatchObject({bound:true,participants:3});
  await expect(db.pool.query('DELETE FROM akai_v14_market')).rejects.toThrow();
  await expect(service.bindMarket(randomUUID())).rejects.toThrow('GLOBAL_MARKET_ALREADY_BOUND');
  // A separate isolated binding cannot admit a subset of the authenticated event roster.
  await db.pool.query('DROP TRIGGER akai_v14_market_immutable ON akai_v14_market');await db.pool.query('DELETE FROM akai_v14_market');
  await db.pool.query('DELETE FROM akai_market_v2_members WHERE run_id=$1',[users[2]!.run]);
  await expect(service.bindMarket(realm)).rejects.toThrow('MARKET_CANONICAL_ROSTER_REQUIRED');expect((await state()).consumer.market).toBeNull();expect((await act(0,{type:'sync'})).statusCode).toBe(409);
 });
 it('trades one exact instance once under competing buyers and replays the durable receipt',async()=>{
  const l=await listing(),inputs=await Promise.all([input(1,{type:'buy',listingId:l.id}),input(2,{type:'buy',listingId:l.id})]),results=await Promise.all([post(1,inputs[0]),post(2,inputs[1])]);expect(results.filter(r=>r.json().status==='applied')).toHaveLength(1);const winner=results.findIndex(r=>r.json().status==='applied')+1;
  const before=await market.inspect(realm);expect((await post(winner,inputs[winner-1])).json()).toEqual(results[winner-1]!.json());expect(await market.inspect(realm)).toEqual(before);expect(before.book.trades).toHaveLength(1);expect((await state(winner)).consumer.inventory).toContainEqual(l.item);
  expect((await post(winner,{...inputs[winner-1],action:{type:'sync'}})).statusCode).toBe(409);expect((await state()).consumer.balances.coin).toBe('2080000000');await reconciled();
 });
 it('keeps private runs/realms, foreign offers/history and wallets out of the read-only DTO',async()=>{
  const l=await listing();await act(1,{type:'offer',listingId:l.id,price:'190000001',currency:'coin'});
  const before=await market.inspect(realm),a=await state(0),b=await state(1),outsider=await state(2);expect(a.consumer.market!.offers).toHaveLength(1);expect(b.consumer.market!.offers).toHaveLength(1);expect(outsider.consumer.market!.offers).toHaveLength(0);expect(a.consumer.market!.listings[0]!.seller).toBe(users[0]!.accountId);
  for(const dto of [a,b,outsider]){const json=JSON.stringify(dto);for(const u of users)expect(json).not.toContain(u.run);expect(json).not.toContain(realm);expect(json).not.toMatch(/"(seed|secret|runs|sessions|archive|offlineJob)":/);}
  expect(await market.inspect(realm)).toEqual(before);
  await act(0,{type:'offer.accept',offerId:a.consumer.market!.offers[0]!.id});expect((await state(2)).consumer.market!.trades).toHaveLength(0);await reconciled();
 });
 it('revalidates offer funds, supports withdrawal/rejection/acceptance and conserves the same wallet',async()=>{
  const l=await listing();await act(1,{type:'offer',listingId:l.id,price:'1990000000',currency:'coin'});let oid=(await state(1)).consumer.market!.offers.at(-1)!.id;
  await act(1,{type:'list.resource',resource:'iron',quantity:'1000',price:'10000',currency:'coin'});expect((await act(0,{type:'offer.accept',offerId:oid})).json().code).toBe('INSUFFICIENT_FUNDS');expect((await act(1,{type:'offer.withdraw',offerId:oid})).json().status).toBe('applied');
  await act(1,{type:'offer',listingId:l.id,price:'100000001',currency:'coin'});oid=(await state(0)).consumer.market!.offers.at(-1)!.id;expect((await act(0,{type:'offer.reject',offerId:oid})).json().status).toBe('applied');
  await act(1,{type:'offer',listingId:l.id,price:'100000001',currency:'coin'});oid=(await state(0)).consumer.market!.offers.at(-1)!.id;expect((await act(0,{type:'offer.accept',offerId:oid})).json().status).toBe('applied');await reconciled();
 });
 it('projects expiry without writes, claims escrow once and preserves cancellation cooldown',async()=>{
  const l=await listing();await act(1,{type:'offer',listingId:l.id,price:'100000',currency:'coin'});now+=73*3600000;const before=await market.inspect(realm),view=await state();expect(view.consumer.market!.listings[0]!.status).toBe('expired');expect(view.consumer.market!.offers[0]!.status).toBe('expired');expect(await market.inspect(realm)).toEqual(before);
  expect((await act(0,{type:'claim',listingId:l.id})).json().status).toBe('applied');expect((await act(0,{type:'claim',listingId:l.id})).json().code).toBe('NOT_CLAIMABLE');
  const next=await listing();expect((await act(0,{type:'cancel',listingId:next.id})).json().status).toBe('applied');await act(0,{type:'claim',listingId:next.id});expect((await act(0,{type:'list.item',itemId:l.item.id,price:'100000',currency:'coin'})).json().code).toBe('RELIST_COOLDOWN');await reconciled();
 });
 it('blocks disabled and suspended sellers, and event participation on either side',async()=>{
  const l=await listing();await service.setEnabled(users[0]!.accountId,false);expect((await state(1)).consumer.market!.listings).toHaveLength(0);expect((await act(1,{type:'buy',listingId:l.id})).json().code).toBe('V13_NOT_ENROLLED');await service.setEnabled(users[0]!.accountId,true);
  await db.pool.query('INSERT INTO akai_profiles(account_id,name,joined_at,suspended) VALUES($1,$2,$3,true)',[users[0]!.accountId,'V14seller',now]);expect((await act(1,{type:'buy',listingId:l.id})).json().code).toBe('ACCOUNT_SUSPENDED');await db.pool.query('UPDATE akai_profiles SET suspended=false WHERE account_id=$1',[users[0]!.accountId]);
  expect((await service.command(users[0]!.token,await input(0,{type:'join',mode:'protection'}))).status).toBe('applied');expect((await act(1,{type:'buy',listingId:l.id})).json().code).toBe('EVENT_ACTIVITY_ACTIVE');await reconciled();
 });
 it.each(['session','member'])('rechecks revoked %s access after locks even on a queued receipt replay',async(kind)=>{
  const body=await input(0,{type:'sync'});await post(0,body);const before=await market.inspect(realm),hold=await db.pool.connect();await hold.query('BEGIN');await hold.query('SELECT id FROM akai_market_v2_realms WHERE id=$1 FOR UPDATE',[realm]);
  let seen!:()=>void;const resolved=new Promise<void>(r=>{seen=r;});const identity=online.identity.bind(online);vi.spyOn(online,'identity').mockImplementation(async(token,c)=>{const id=await identity(token,c);seen();return id;});const pending=post(0,body);
  try{await resolved;if(kind==='session')await db.pool.query('UPDATE akai_sessions SET revoked=true WHERE account_id=$1',[users[0]!.accountId]);else await service.setEnabled(users[0]!.accountId,false);await hold.query('COMMIT');expect((await pending).statusCode).toBe(kind==='session'?401:403);}finally{await hold.query('ROLLBACK');hold.release();}expect(await market.inspect(realm)).toEqual(before);
 });
 it('samples market time after a queued lock and cannot rewind its persisted cursor',async()=>{
  const body=await input(0,{type:'sync'}),hold=await db.pool.connect();await hold.query('BEGIN');await hold.query('SELECT id FROM akai_market_v2_realms WHERE id=$1 FOR UPDATE',[realm]);const pending=post(0,body);
  try{
   let waiting=false;for(let i=0;i<200;i++){const r=await base.pool.query("SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND query LIKE 'SELECT state FROM akai_market_v2_realms%'",[schema]);if(r.rowCount){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}expect(waiting).toBe(true);
   now+=10000;const book=(await hold.query('SELECT state FROM akai_market_v2_realms WHERE id=$1',[realm])).rows[0].state;book.clockMs=now+10000;await hold.query('UPDATE akai_market_v2_realms SET state=$2 WHERE id=$1',[realm,book]);await hold.query('COMMIT');expect((await pending).json().status).toBe('applied');expect((await market.inspect(realm)).book.clockMs).toBe(book.clockMs);await reconciled();
  }finally{await hold.query('ROLLBACK');hold.release();}
 });
 it('rolls back transfer, fees, ledger and receipt on outbox failure and safely retries',async()=>{
  const l=await listing(),body=await input(1,{type:'buy',listingId:l.id}),before=await market.inspect(realm);
  await db.pool.query("CREATE FUNCTION v14_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V14_OUTBOX'; END $$");await db.pool.query('CREATE TRIGGER v14_fail BEFORE INSERT ON akai_market_v2_events FOR EACH ROW EXECUTE FUNCTION v14_fail()');
  expect((await post(1,body)).statusCode).toBe(500);expect(await market.inspect(realm)).toEqual(before);expect((await db.pool.query('SELECT 1 FROM akai_market_v2_commands WHERE run_id=$1 AND command_id=$2',[users[1]!.run,body.commandId])).rowCount).toBe(0);
  await db.pool.query('DROP TRIGGER v14_fail ON akai_market_v2_events');expect((await post(1,body)).json().status).toBe('applied');await reconciled();
 });
 it('commits bounded backlog without applying the requested listing',async()=>{
  const r=await economy.inspect(users[0]!.run);r.state.paused=false;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[users[0]!.run,r.state]);now+=8*3600000;
  expect((await act(0,{type:'list.resource',resource:'iron',quantity:'1000',price:'10000',currency:'coin'})).json().status).toBe('settling');expect((await market.inspect(realm)).book.listings).toHaveLength(0);await reconciled();
 });
 it('keeps routes off by default and refuses stale purchases without a second transfer',async()=>{
  const off=buildServer(parseServerConfig({}),false,{service:online});try{expect((await off.inject({method:'POST',url:'/api/v1/test-v2/market',headers:headers(users[0]!.token),payload:await input(0,{type:'sync'})})).statusCode).toBe(404);}finally{await off.close();}
  const l=await listing(),body=await input(1,{type:'buy',listingId:l.id});await act(1,{type:'sync'});expect((await post(1,body)).json().code).toBe('STALE_REVISION');expect((await market.inspect(realm)).book.trades).toHaveLength(0);await reconciled();
 });
});
