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
describe.skipIf(!url)('V19 authenticated guild wars',()=>{
 let base:Database,db:Database,online:OnlineService,economy:EconomyRehearsalService,market:MarketV2Service,boss:BossEventsV8Service,service:AuthenticatedV13Service,app:ReturnType<typeof buildServer>,schema:string,realm:string,now:number;
 let users:Array<{token:string;accountId:string;run:string;source:unknown}>;
 const headers=(token?:string)=>({'x-akai-client':'1',origin:'http://localhost:5173',...(token?{cookie:'akai_session='+token}:{})});
 beforeEach(async()=>{
  now=Date.parse('2026-10-21T18:00:00-03:00');base=new Database(url!);schema='v19_'+randomUUID().replaceAll('-','');await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);u.searchParams.set('application_name',schema);db=new Database(u.toString());await db.migrate();online=new OnlineService(db,()=>now);economy=new EconomyRehearsalService(db,()=>now);boss=new BossEventsV8Service(db,()=>now);market=new MarketV2Service(db,()=>now);service=new AuthenticatedV13Service(online);users=[];
  for(let n=0;n<4;n++){
   const user=await online.guest(),run=(await economy.stage(user.accountId,randomUUID())).id,r=await economy.inspect(run);r.state.paused=true;r.state.economy.highest.main=100;r.state.economy.balances.coin='2000000000';r.state.economy.balances.iron='100000';r.state.economy.economicThroughMs=now;r.state.economy.equipped.weapon=null;r.state.economy.inventory[0]!.enhancement=7;r.state.economy.inventory[0]!.qualityBp=10321;
   await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[run,r.state]);for(const k of ['coin','iron'] as const)await db.pool.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,$2,$3,$3)',[run,k,r.state.economy.balances[k]]);
   users.push({...user,run,source:(await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[user.accountId])).rows[0].snapshot});
  }
  const event=(await boss.stage(users.map(u=>u.run),randomUUID())).id;await service.bindWorld(event);realm=(await market.stage(users.map(u=>u.run),randomUUID())).id;await service.bindMarket(realm);
  app=buildServer(parseServerConfig({DATABASE_URL:u.toString(),V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}),false,{service:online});await app.ready();
 },30000);
 afterEach(async()=>{vi.restoreAllMocks();await app?.close();await db?.close();if(base){await base.pool.query('DROP SCHEMA '+schema+' CASCADE');await base.close();}});
 async function state(n=0){return service.read(users[n]!.token);}
 async function input(n=0,type='sync'){const s=await state(n);return{commandId:randomUUID(),expectedRevision:s.revision,warRevision:s.wars.revision,seasonId:s.wars.seasonId,action:{type}};}
 async function post(n:number,body:unknown){return app.inject({method:'POST',url:'/api/v1/test-v2/wars',payload:JSON.stringify(body),headers:{...headers(users[n]!.token),'content-type':'application/json'}});}
 async function act(n=0,type='sync'){return(await post(n,await input(n,type))).json();}
 async function guild(n:number,action:Record<string,unknown>){const s=await state(n);return service.command(users[n]!.token,{commandId:randomUUID(),expectedRevision:s.revision,guildRevision:s.guilds.revision,action},'guilds');}
 async function reconciled(){for(const u of users){expect(await economy.reconcile(u.run)).toEqual([]);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[u.accountId])).rows[0].snapshot).toEqual(u.source);}}
 async function fixture(){
  for(const [leader,member,name]of [[0,1,'Primeira'],[2,3,'Segunda']]as const){expect(await guild(leader,{type:'create',name})).toMatchObject({status:'applied'});const id=(await state(leader)).guilds.own!.id;await guild(leader,{type:'invite',accountId:users[member]!.accountId});await guild(member,{type:'accept',guildId:id});}
  // Explicit membership-age fixture, no claim of acquired social progression.
  await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1',[now-86400000]);expect(await act(0,'enroll')).toMatchObject({status:'applied'});expect(await act(2,'enroll')).toMatchObject({status:'applied'});return(await state()).wars;
 }
 it('keeps GET pure/private, denies untrusted fields, CSRF, query and disabled gates',async()=>{
  const s=await state();expect(s.wars).toMatchObject({phase:'registration',archives:[],matches:[],rewards:[]});expect((await state()).revision).toBe(s.revision);expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_commands')).rows[0].count).toBe('0');const body=await input();for(const extra of [{accountId:users[1]!.accountId},{coin:'1'},{now:now+1}])expect((await post(0,{...body,...extra})).statusCode).toBe(400);expect((await app.inject({method:'POST',url:'/api/v1/test-v2/wars',payload:body,headers:headers()})).statusCode).toBe(401);expect((await app.inject({method:'POST',url:'/api/v1/test-v2/wars',payload:body,headers:{...headers(users[0]!.token),origin:'https://evil.example'}})).statusCode).toBe(403);expect((await app.inject({method:'POST',url:'/api/v1/test-v2/wars?now=1',payload:body,headers:headers(users[0]!.token)})).statusCode).toBe(400);const off=buildServer(parseServerConfig({}),false,{service:online});try{expect((await off.inject({method:'POST',url:'/api/v1/test-v2/wars',payload:body,headers:headers(users[0]!.token)})).statusCode).toBe(404);}finally{await off.close();}await reconciled();
 });
 it('requires leader and two 24h members, freezes trusted snapshots, allows refresh only before opening',async()=>{
  await guild(0,{type:'create',name:'Novos'});expect(await act(0,'enroll')).toMatchObject({code:'WAR_MINIMUM_MEMBERS'});await guild(0,{type:'invite',accountId:users[1]!.accountId});await guild(1,{type:'accept',guildId:(await state()).guilds.own!.id});expect(await act(0,'enroll')).toMatchObject({code:'WAR_MINIMUM_MEMBERS'});await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1',[now-86400000]);expect(await act(1,'enroll')).toMatchObject({code:'WAR_LEADER_REQUIRED'});expect(await act(0,'enroll')).toMatchObject({status:'applied'});const p=(await db.pool.query('SELECT period FROM akai_war_v19_world')).rows[0].period;expect(p.enrollments[0].roster).toHaveLength(2);await act(0,'enroll');now=p.open;expect(await act(0,'enroll')).toMatchObject({code:'WAR_REGISTRATION_CLOSED'});await reconciled();
 });
 it('opens at exact boundary, blocks guild mutations, removes departed roster before pairing',async()=>{
  const w=await fixture();expect(await guild(1,{type:'leave'})).toMatchObject({status:'applied'});now=w.open;expect((await state()).wars.phase).toBe('opening_required');expect(await guild(3,{type:'leave'})).toMatchObject({code:'WAR_PROCESS_REQUIRED'});expect(await act()).toMatchObject({status:'applied'});expect((await state()).wars.matches).toEqual([]);now=w.close;await act();expect((await state()).wars.archives[0]!.matches).toEqual([]);expect((await state()).wars.rewards).toEqual([]);expect(await guild(3,{type:'leave'})).toMatchObject({status:'applied'});await reconciled();
 });
 it('uses frozen v2 duel and index target, one attack and one receipt under concurrency',async()=>{
  const w=await fixture();now=w.open-1;expect(await act(0,'attack')).toMatchObject({code:'WAR_NOT_ACTIVE'});now=w.open;await act();const s=await state();expect(s.wars.canAttack).toBe(true);const p=(await db.pool.query('SELECT period FROM akai_war_v19_world')).rows[0].period,f=p.matches[0].teams.flatMap((t:any)=>t.roster).find((f:any)=>f.accountId===users[0]!.accountId);const run=await economy.inspect(users[0]!.run);run.state.economy.equipped.weapon=run.state.economy.inventory[0]!.id;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[users[0]!.run,run.state]);const body=await input(0,'attack'),r=await Promise.all([post(0,body),post(0,body)]);expect(r[0]!.json()).toEqual(r[1]!.json());expect(r[0]!.json().status).toBe('applied');const audit=(await db.pool.query('SELECT payload FROM akai_war_v19_attacks')).rows[0].payload;expect(audit.attackerStats).toEqual(f.stats);expect(audit.targetId).toBe(s.wars.target!.accountId);expect(await act(0,'attack')).toMatchObject({code:'WAR_ATTACK_USED'});expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_attacks')).rows[0].count).toBe('1');await reconciled();
 });
 it('closes once, pays only attackers, preserves personal progression and public privacy',async()=>{
  const w=await fixture();now=w.open;await act();await act(0,'attack');const before=await Promise.all(users.map((_,i)=>state(i)));now=w.close-1;await act();expect((await state()).wars.archives).toEqual([]);now=w.close;const body=await input(),r=await Promise.all([post(0,body),post(0,body)]);expect(r[0]!.json()).toEqual(r[1]!.json());expect(r[0]!.json().closed).toBe('2026-10-19');const rewards=(await db.pool.query('SELECT * FROM akai_war_v19_rewards')).rows;expect(rewards).toHaveLength(1);expect(rewards[0].account_id).toBe(users[0]!.accountId);expect(['500000','250000','100000']).toContain(rewards[0].coin);for(let i=0;i<4;i++){const s=await state(i);expect(BigInt(s.consumer.balances.coin)-BigInt(before[i]!.consumer.balances.coin)).toBe(i?0n:BigInt(rewards[0].coin));expect(s.consumer.level).toBe(before[i]!.consumer.level);expect(s.consumer.balances.jade).toBe(before[i]!.consumer.balances.jade);const json=JSON.stringify(s.wars);for(const field of ['secret','seed','stats','joinedAt',users[i]!.run,realm])expect(json).not.toContain(field);}await act();expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_rewards')).rows[0].count).toBe('1');await reconciled();
 });
 it('rolls back rewards, XP, archive, wallet and receipt on outbox failure, then retries same UUID',async()=>{
  const w=await fixture();now=w.open;await act();await act(0,'attack');now=w.close;const before=await state(),body=await input();await db.pool.query("CREATE FUNCTION fail_war() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$; CREATE TRIGGER fail_war BEFORE INSERT ON akai_war_v19_events FOR EACH ROW EXECUTE FUNCTION fail_war()");expect((await post(0,body)).statusCode).toBe(500);expect((await state()).revision).toBe(before.revision);expect((await state()).consumer.balances).toEqual(before.consumer.balances);expect((await state()).wars.archives).toEqual([]);expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_rewards')).rows[0].count).toBe('0');await db.pool.query('DROP TRIGGER fail_war ON akai_war_v19_events');expect((await post(0,body)).json().status).toBe('applied');await reconciled();
 });
 it('rejects stale revisions, reused UUID payloads and attacks after the deadline',async()=>{
  const w=await fixture(),body=await input();await act();expect((await post(0,body)).json().code).toBe('STALE_REVISION');expect((await post(0,{...body,action:{type:'enroll'}})).statusCode).toBe(409);now=w.close;expect(await act(0,'attack')).toMatchObject({code:'WAR_NOT_ACTIVE'});expect((await state()).wars.archives).toEqual([]);await act();await reconciled();
 });
 it('skips dormant weeks and survives restart with append-only archive and one reward',async()=>{
  const w=await fixture();now=w.open;await act();await act(0,'attack');now=w.close+35*86400000;await db.pool.query('UPDATE akai_sessions SET expires_at=$1',[now+86400000]);await act();const restarted=new AuthenticatedV13Service(new OnlineService(db,()=>now));expect((await restarted.read(users[0]!.token)).wars.archives).toHaveLength(1);await act();expect((await state()).wars.archives).toHaveLength(1);expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_rewards')).rows[0].count).toBe('1');await expect(db.pool.query('DELETE FROM akai_war_v19_archives')).rejects.toThrow();await reconciled();
 });
 it('waits for war before closing a tracked season, dates winner XP in the original week',async()=>{
  await service.command(users[0]!.token,{commandId:randomUUID(),expectedRevision:(await state()).revision,seasonRevision:0,action:{type:'sync'}},'seasons');const w=await fixture();now=w.open;await act();await act(0,'attack');now=Date.parse('2026-10-26T00:00:00-03:00');let s=await state();expect(await service.command(users[0]!.token,{commandId:randomUUID(),expectedRevision:s.revision,seasonRevision:s.seasons.revision,action:{type:'sync'}},'seasons')).toMatchObject({code:'WAR_CLOSE_REQUIRED'});await act();s=await state();expect(await service.command(users[0]!.token,{commandId:randomUUID(),expectedRevision:s.revision,seasonRevision:s.seasons.revision,action:{type:'sync'}},'seasons')).toMatchObject({status:'applied'});for(const credit of(await db.pool.query("SELECT at FROM akai_guild_v16_credits WHERE source LIKE 'war:%'")).rows)expect(Number(credit.at)).toBe(w.close-1);await reconciled();
 });
 it.each(['disabled','suspended','closed'])('excludes %s fighters at settlement',async(mode)=>{
  const w=await fixture();now=w.open;await act();await act(0,'attack');if(mode==='disabled')await service.setEnabled(users[0]!.accountId,false);else if(mode==='closed')await db.pool.query('UPDATE akai_economy_rehearsals SET closed=true WHERE id=$1',[users[0]!.run]);else await db.pool.query('INSERT INTO akai_profiles(account_id,name,joined_at,suspended) VALUES($1,$2,$3,true) ON CONFLICT(account_id) DO UPDATE SET suspended=true',[users[0]!.accountId,'Suspenso',now]);now=w.close;await act(2);expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_rewards')).rows[0].count).toBe('0');await reconciled();
 });
 it('does not reward nonattackers or invent a winner for an empty confrontation',async()=>{
  const w=await fixture();now=w.close;await act();const a=(await state()).wars.archives[0]!;expect(a.matches).toHaveLength(1);expect(a.matches[0]!.winner).toBeNull();expect((await db.pool.query('SELECT count(*) FROM akai_war_v19_rewards')).rows[0].count).toBe('0');expect((await db.pool.query("SELECT count(*) FROM akai_guild_v16_credits WHERE source LIKE 'war:%'")).rows[0].count).toBe('0');await reconciled();
 });
 it('revalidates session after waiting for guild lock and before receipt replay',async()=>{
  await fixture();const body=await input();expect((await post(0,body)).json().status).toBe('applied');const lock=await db.pool.connect();await lock.query('BEGIN');await lock.query('SELECT pg_advisory_xact_lock(41652016)');
  try{const pending=post(0,body);await new Promise(r=>setTimeout(r,80));await db.pool.query('DELETE FROM akai_sessions WHERE account_id=$1',[users[0]!.accountId]);await lock.query('COMMIT');expect((await pending).statusCode).toBe(401);}finally{await lock.query('ROLLBACK');lock.release();}
 });
 it('uses persisted shared time when wall clock regresses',async()=>{
  const w=await fixture();now=w.open;await act();now=w.open-10000;expect((await state()).wars.phase).toBe('active');expect(await guild(1,{type:'leave'})).toMatchObject({code:'WAR_PROCESS_REQUIRED'});now=w.close;await act();now=w.open;expect((await state()).wars.phase).toBe('finished');await reconciled();
 });

 it('credits exactly100XP to the winning guild with no duplicated source',async()=>{
  const w=await fixture();now=w.open;await act();const p=(await db.pool.query('SELECT period FROM akai_war_v19_world')).rows[0].period,m=p.matches[0],a=m.teams[0].roster[0],b=m.teams[1].roster[0];
  // Explicit score fixture tests payout mapping; separate case validates authoritative native duel/seed.
  const attack=(accountId:string,targetId:string,side:number,hpB:number)=>({accountId,targetId,side,maxHp:10,result:{version:'arena-v15-1',won:false,hpA:1,hpB,elapsedMs:120000,attacks:10,reason:'timeout_defender'}});
  m.attacks=[attack(a.accountId,b.accountId,0,1),attack(b.accountId,a.accountId,1,5)];await db.pool.query('UPDATE akai_war_v19_world SET period=$1',[p]);now=w.close;await act();const credits=(await db.pool.query("SELECT * FROM akai_guild_v16_credits WHERE source LIKE 'war:%'")).rows;expect(credits).toHaveLength(1);expect(Number(credits[0].amount)).toBe(100);expect(Number(credits[0].at)).toBe(w.close-1);expect(credits[0].guild_id).toBe(m.teams[0].id);await act();expect((await db.pool.query('SELECT xp FROM akai_guild_v16_guilds WHERE id=$1',[m.teams[0].id])).rows[0].xp).toBe('100');await reconciled();
 });

 it('pays250Coin per eligible attacker on exact draw without winner XP',async()=>{
  const w=await fixture();now=w.open;await act();const p=(await db.pool.query('SELECT period FROM akai_war_v19_world')).rows[0].period,m=p.matches[0];m.attacks=m.teams.map((t:any,side:number)=>({accountId:t.roster[0].accountId,targetId:m.teams[1-side].roster[0].accountId,side,maxHp:10,result:{version:'arena-v15-1',won:false,hpA:1,hpB:5,elapsedMs:120000,attacks:10,reason:'timeout_defender'}}));await db.pool.query('UPDATE akai_war_v19_world SET period=$1',[p]);now=w.close;await act();expect((await db.pool.query('SELECT coin::text FROM akai_war_v19_rewards')).rows.map(r=>r.coin)).toEqual(['250000','250000']);expect((await db.pool.query("SELECT count(*) FROM akai_guild_v16_credits WHERE source LIKE 'war:%'")).rows[0].count).toBe('0');await reconciled();
 });

});
