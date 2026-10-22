import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {presetBuildV3,attributeCost} from '@akai/shared';
import {Database} from './database.js';
import {OnlineService} from './online.js';
import {EconomyRehearsalService} from './economy-rehearsal.js';
import {BossEventsV8Service} from './boss-events-v8.js';
import {AuthenticatedV13Service} from './authenticated-v13.js';
import {buildServer} from './app.js';
import {parseServerConfig} from './config.js';
const url=process.env.TEST_DATABASE_URL;
describe('V13 configuration',()=>{
 it('is off by default and refuses production, unspecified test DB or public origin',()=>{
  expect(parseServerConfig({}).V13_HTTP_TEST).toBe(false);
  for(const extra of [{},{NODE_ENV:'production'},{PUBLIC_ORIGIN:'https://example.com',COOKIE_SECURE:'true'}])expect(()=>parseServerConfig({DATABASE_URL:'postgres://test',V13_HTTP_TEST:'true',...extra})).toThrow();
  expect(parseServerConfig({DATABASE_URL:'postgres://test',V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}).V13_HTTP_TEST).toBe(true);
 });
});
describe.skipIf(!url)('V13 authenticated canonical event HTTP',()=>{
 let base:Database,db:Database,online:OnlineService,economy:EconomyRehearsalService,boss:BossEventsV8Service,api:AuthenticatedV13Service,app:ReturnType<typeof buildServer>,schema:string,realm:string,now:number;
 let members:Array<{user:Awaited<ReturnType<OnlineService['guest']>>;run:string;source:unknown}>;
 const headers=(token?:string)=>({'x-akai-client':'1',origin:'http://localhost:5173',...(token?{cookie:'akai_session='+token}:{})});
 beforeEach(async()=>{
  now=Date.parse('2026-10-21T18:00:00-03:00');base=new Database(url!);schema='v13_'+randomUUID().replaceAll('-','');await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);db=new Database(u.toString());await db.migrate();online=new OnlineService(db,()=>now);economy=new EconomyRehearsalService(db,()=>now);boss=new BossEventsV8Service(db,()=>now);api=new AuthenticatedV13Service(online);members=[];
  for(let i=0;i<3;i++){
   const user=await online.guest(),run=(await economy.stage(user.accountId,randomUUID())).id;
   const snapshot=(await economy.inspect(run)).state,e=presetBuildV3(1000,'swift','legendary20');e.accountId=user.accountId;e.highest.main=1000;e.economicThroughMs=now;
   for(const item of e.inventory){const old=item.id;item.id=user.accountId+'/'+old;item.enhancement=15;for(const slot of Object.keys(e.equipped) as (keyof typeof e.equipped)[])if(e.equipped[slot]===old)e.equipped[slot]=item.id;}
   snapshot.economy=e;snapshot.paused=true;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[run,snapshot]);await db.pool.query("INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,'masteryMs',$2,$2)",[run,String(e.masteryMs)]);
   members.push({user,run,source:(await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[user.accountId])).rows[0].snapshot});
  }
  realm=(await boss.stage(members.slice(0,2).map(m=>m.run),randomUUID())).id;await api.bindWorld(realm);
  app=buildServer(parseServerConfig({DATABASE_URL:u.toString(),V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}),false,{service:online});await app.ready();
 },30000);
 afterEach(async()=>{vi.restoreAllMocks();await app?.close();await db?.close();if(base){await base.pool.query('DROP SCHEMA '+schema+' CASCADE');await base.close();}});
 async function state(n=0){return app.inject({method:'GET',url:'/api/v1/test-v2/state',headers:headers(members[n]!.user.token)});}
 async function command(n:number,action:Record<string,unknown>){const view=(await state(n)).json(),body={commandId:randomUUID(),expectedRevision:view.revision,action};return {body,response:await app.inject({method:'POST',url:'/api/v1/test-v2/events',headers:headers(members[n]!.user.token),payload:body})};}
 it('derives ownership from session and returns only redacted own consumers without economic writes',async()=>{
  expect((await app.inject({url:'/api/v1/test-v2/state',headers:headers()})).statusCode).toBe(401);
  expect((await state(2)).statusCode).toBe(403);
  const before=await economy.inspect(members[0]!.run),r=await state();expect(r.statusCode).toBe(200);expect(r.json().consumer.accountId).toBe(members[0]!.user.accountId);expect(JSON.stringify(r.json())).not.toMatch(/"(seed|secret|runs|sessions|offlineJob|archive)":/);
  expect((await app.inject({url:'/api/v1/test-v2/state?accountId='+members[1]!.user.accountId,headers:headers(members[0]!.user.token)})).statusCode).toBe(400);
  expect(await economy.inspect(members[0]!.run)).toEqual(before);
  const forged=await app.inject({method:'POST',url:'/api/v1/test-v2/events',headers:headers(members[0]!.user.token),payload:{commandId:randomUUID(),expectedRevision:0,actor:members[1]!.run,action:{type:'sync'}}});expect(forged.statusCode).toBe(400);
  expect((await app.inject({url:'/api/v1/test-v2/state',headers:{...headers(members[0]!.user.token),origin:'https://evil.example'}})).statusCode).toBe(403);
 });
 it('pins exactly one world, is idempotent and cannot enroll another private realm',async()=>{
  expect(await api.bindWorld(realm)).toMatchObject({bound:true,participants:2});
  const other=(await boss.stage([members[2]!.run],randomUUID())).id;
  await expect(api.bindWorld(other)).rejects.toThrow('GLOBAL_WORLD_ALREADY_BOUND');expect((await state(2)).statusCode).toBe(403);
  await expect(db.pool.query('UPDATE akai_v13_world SET realm_id=$1',[other])).rejects.toThrow();
  await api.setEnabled(members[0]!.user.accountId,false);expect((await state()).statusCode).toBe(403);await api.setEnabled(members[0]!.user.accountId,true);expect((await state()).statusCode).toBe(200);
 });
 it('accepts only server time/damage, credits the same isolated wallet once and preserves live wealth',async()=>{
  expect((await command(0,{type:'join',mode:'boss'})).response.json().status).toBe('applied');
  expect((await command(0,{type:'heartbeat',damage:'99999',at:now+100000})).response.statusCode).toBe(400);
  for(let i=0;i<62;i++){now+=10000;expect((await command(0,{type:'heartbeat'})).response.json().status).toBe('applied');}
  const view=(await state()).json();expect(view.consumer.balances.jade).toBe('453000');expect(view.consumer.event.broadcasts).toHaveLength(1);expect(view.consumer.event.broadcasts[0].jade).toBe(250);
  const receipt=await command(0,{type:'heartbeat'}),before=await economy.inspect(members[0]!.run);expect((await app.inject({method:'POST',url:'/api/v1/test-v2/events',headers:headers(members[0]!.user.token),payload:receipt.body})).json()).toEqual(receipt.response.json());expect(await economy.inspect(members[0]!.run)).toEqual(before);
  const reused=await app.inject({method:'POST',url:'/api/v1/test-v2/events',headers:headers(members[0]!.user.token),payload:{...receipt.body,action:{type:'leave'}}});expect(reused.statusCode).toBe(409);expect(await economy.inspect(members[0]!.run)).toEqual(before);
  expect(await economy.reconcile(members[0]!.run)).toEqual([]);for(const m of members)expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[m.user.accountId])).rows[0].snapshot).toEqual(m.source);
 },30000);
 it('serializes two participants through one death, ranking and broadcast',async()=>{
  await command(0,{type:'join',mode:'boss'});await command(1,{type:'join',mode:'boss'});const b=await boss.inspect(realm);b.daily.hp=1;await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realm,b]);now+=10000;
  await Promise.all([command(0,{type:'heartbeat'}),command(1,{type:'heartbeat'})]);const a=(await state()).json().consumer.event,other=(await state(1)).json().consumer.event;expect(a.hp).toBe(0);expect(other.hp).toBe(0);expect(a.broadcasts).toEqual(other.broadcasts);expect(a.broadcasts).toHaveLength(1);expect((await db.pool.query("SELECT * FROM akai_boss_v8_rewards WHERE realm_id=$1 AND kind='last-hit'",[realm])).rows).toHaveLength(1);
 });
 it('rechecks revoked sessions inside the writer even on a queued receipt replay',async()=>{
  const first=await command(0,{type:'join',mode:'boss'}),before=await economy.inspect(members[0]!.run),hold=await db.pool.connect();await hold.query('BEGIN');await hold.query('SELECT id FROM akai_boss_v8_realms WHERE id=$1 FOR UPDATE',[realm]);
  let seen!:()=>void;const resolved=new Promise<void>(r=>{seen=r;});const identity=online.identity.bind(online);vi.spyOn(online,'identity').mockImplementation(async(token,c)=>{const id=await identity(token,c);seen();return id;});
  const pending=app.inject({method:'POST',url:'/api/v1/test-v2/events',headers:headers(members[0]!.user.token),payload:first.body});
  try{await resolved;await db.pool.query('UPDATE akai_sessions SET revoked=true WHERE account_id=$1',[members[0]!.user.accountId]);await hold.query('COMMIT');expect((await pending).statusCode).toBe(401);}finally{await hold.query('ROLLBACK');hold.release();}
  expect(await economy.inspect(members[0]!.run)).toEqual(before);
 });
 it('rolls back event, wallet and receipt on outbox failure, then allows the same request to retry',async()=>{
  await command(0,{type:'join',mode:'boss'});const b=await boss.inspect(realm);b.daily.hp=1;await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realm,b]);const before=await economy.inspect(members[0]!.run);now+=10000;
  await db.pool.query("CREATE FUNCTION v13_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V13_OUTBOX'; END $$");await db.pool.query('CREATE TRIGGER v13_fail BEFORE INSERT ON akai_boss_v8_events FOR EACH ROW EXECUTE FUNCTION v13_fail()');
  const failed=await command(0,{type:'heartbeat'});expect(failed.response.statusCode).toBe(500);expect(await economy.inspect(members[0]!.run)).toEqual(before);expect(await boss.inspect(realm)).toEqual(b);
  await db.pool.query('DROP TRIGGER v13_fail ON akai_boss_v8_events');const retry=await app.inject({method:'POST',url:'/api/v1/test-v2/events',headers:headers(members[0]!.user.token),payload:failed.body});expect(retry.json().status).toBe('applied');expect((await state()).json().consumer.balances.jade).toBe('450000');
 });
 it('plays the same v2 run and buys an attribute with earned Coin, excluding event time and operator close',async()=>{
  const run=(await economy.inspect(members[0]!.run)).state;for(const key of Object.keys(run.economy.attributes) as (keyof typeof run.economy.attributes)[])run.economy.attributes[key]=0;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[members[0]!.run,run]);
  const act=async(action:Record<string,unknown>)=>app.inject({method:'POST',url:'/api/v1/test-v2/economy',headers:headers(members[0]!.user.token),payload:{commandId:randomUUID(),expectedRevision:(await state()).json().revision,action}});
  expect((await act({type:'select',activity:'main',floor:1})).json().status).toBe('applied');for(let i=0;i<12;i++){now+=10000;expect((await act({type:'settle'})).json().status).toBe('applied');}
  const before=(await state()).json().consumer,quote=attributeCost('force',1);expect(BigInt(before.balances.coin)).toBeGreaterThanOrEqual(BigInt(quote.coin));expect((await act({type:'train',attribute:'force'})).json().status).toBe('applied');const after=(await state()).json().consumer;expect(after.attributes.force).toBe(1);expect(BigInt(after.balances.coin)).toBe(BigInt(before.balances.coin)-BigInt(quote.coin));
  expect((await act({type:'train',attribute:'force',cost:'0'})).statusCode).toBe(400);expect((await act({type:'close'})).statusCode).toBe(400);
  await command(0,{type:'join',mode:'boss'});expect((await act({type:'pause',paused:true})).json().code).toBe('EVENT_ACTIVITY_ACTIVE');expect(await economy.reconcile(members[0]!.run)).toEqual([]);
 });
 it('does not register authenticated test routes unless explicitly enabled',async()=>{
  const off=buildServer(parseServerConfig({}),false,{service:online});try{expect((await off.inject({url:'/api/v1/test-v2/state',headers:headers(members[0]!.user.token)})).statusCode).toBe(404);}finally{await off.close();}
 });
});
