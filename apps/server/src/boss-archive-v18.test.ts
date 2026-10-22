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
describe.skipIf(!url)('V18 canonical daily boss archive and guild XP',()=>{
 let base:Database,db:Database,online:OnlineService,economy:EconomyRehearsalService,market:MarketV2Service,boss:BossEventsV8Service,service:AuthenticatedV13Service,app:ReturnType<typeof buildServer>,schema:string,realm:string,now:number;
 let users:Array<{token:string;accountId:string;run:string;source:unknown}>;
 const headers=(token?:string)=>({'x-akai-client':'1',origin:'http://localhost:5173',...(token?{cookie:'akai_session='+token}:{})});
 beforeEach(async()=>{
  now=Date.parse('2026-10-21T23:59:40-03:00');base=new Database(url!);schema='v18_'+randomUUID().replaceAll('-','');await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);u.searchParams.set('application_name',schema);db=new Database(u.toString());await db.migrate();online=new OnlineService(db,()=>now);economy=new EconomyRehearsalService(db,()=>now);boss=new BossEventsV8Service(db,()=>now);market=new MarketV2Service(db,()=>now);service=new AuthenticatedV13Service(online);users=[];
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
 async function eventInput(n=0,action:Record<string,unknown>={type:'sync'}){return{commandId:randomUUID(),expectedRevision:(await state(n)).revision,action};}
 async function post(n:number,body:unknown){return app.inject({method:'POST',url:'/api/v1/test-v2/events',payload:JSON.stringify(body),headers:{...headers(users[n]!.token),'content-type':'application/json'}});}
 async function event(n=0,action:Record<string,unknown>={type:'sync'}){return post(n,await eventInput(n,action));}
 async function guild(n:number,action:Record<string,unknown>){const s=await state(n);return service.command(users[n]!.token,{commandId:randomUUID(),expectedRevision:s.revision,guildRevision:s.guilds.revision,action},'guilds');}
 async function season(){const s=await state();return service.command(users[0]!.token,{commandId:randomUUID(),expectedRevision:s.revision,seasonRevision:s.seasons.revision,action:{type:'sync'}},'seasons');}
 async function reconciled(){for(const u of users){expect(await economy.reconcile(u.run)).toEqual([]);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[u.accountId])).rows[0].snapshot).toEqual(u.source);}}
 async function eligibleGuild(){expect(await guild(0,{type:'create',name:'Boss Guild'})).toMatchObject({status:'applied'});await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1',[now-86400000]);return(await state()).guilds.own!.id;}
 async function fixture(damage='1000000'){
  const id=await eligibleGuild();expect((await event(0,{type:'join',mode:'boss'})).json().status).toBe('applied');await event(0,{type:'leave'});const realmId=(await db.pool.query('SELECT realm_id FROM akai_v13_world')).rows[0].realm_id,s=await boss.inspect(realmId),m=s.daily.members[users[0]!.accountId]!;
  // Explicit snapshot fixture for closing math, no forged HTTP damage or synthetic Jade grant.
  m.damage=damage;m.contributionDamage='999000000';m.qualifiedMs=1000;s.daily.hp=s.daily.maxHp-Number(damage);await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realmId,s]);return{id,realmId,end:s.daily.endMs,date:s.daily.date};
 }
 it('keeps GET pure, captures the first eligible binding and exposes no private audit',async()=>{
  const empty=await state();expect(empty.bossArchive).toMatchObject({own:null,archives:[],closeRequired:false});await eligibleGuild();await event(0,{type:'join',mode:'boss'});const s=await state();expect(s.bossArchive.own).toMatchObject({eligible:true,guildId:s.guilds.own!.id});await state();expect((await db.pool.query('SELECT * FROM akai_boss_v18_bindings')).rowCount).toBe(1);const json=JSON.stringify(s.bossArchive);for(const u of users)expect(json).not.toContain(u.run);expect(json).not.toMatch(/"(baseline_damage|joined_at|secret|seed|stats|payload_hash)"/);await reconciled();
 });
 it('archives before reset and credits exactly one XP/source with replay and concurrent close',async()=>{
  const f=await fixture(),before=await state();now=f.end;const body=await eventInput(),r=await Promise.all([post(0,body),post(0,body)]);expect(r[0]!.json()).toEqual(r[1]!.json());const s=await state();expect(s.guilds.own!.xp).toBe('1');expect(s.bossArchive.archives).toHaveLength(1);expect(s.bossArchive.archives[0]).toMatchObject({date:f.date,end:f.end,hp:99000000,contributors:[{damage:'1000000',contributionDamage:'999000000',guildXp:1,guildId:f.id}]});expect(s.consumer.balances).toEqual(before.consumer.balances);expect((await boss.inspect(f.realmId)).daily.members).toEqual({});await event();expect((await db.pool.query('SELECT * FROM akai_guild_v16_credits')).rowCount).toBe(1);expect((await db.pool.query('SELECT at FROM akai_guild_v16_credits')).rows[0].at).toBe(String(f.end-1));await reconciled();
 });
 it('rolls back archive, XP, source, wallets and receipt on R8 outbox failure',async()=>{
  const f=await fixture(),before=await state();now=f.end;const body=await eventInput();await db.pool.query("CREATE FUNCTION fail_v18() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V18_OUTBOX'; END $$; CREATE TRIGGER fail_v18 BEFORE INSERT ON akai_boss_v8_events FOR EACH ROW EXECUTE FUNCTION fail_v18()");expect((await post(0,body)).statusCode).toBe(500);expect((await state()).guilds.own!.xp).toBe('0');expect((await state()).bossArchive.archives).toEqual([]);expect((await state()).consumer.balances).toEqual(before.consumer.balances);expect((await boss.inspect(f.realmId)).daily.date).toBe(f.date);await db.pool.query('DROP TRIGGER fail_v18 ON akai_boss_v8_events');expect((await post(0,body)).json().status).toBe('applied');await reconciled();
 });
 it('blocks membership and weekly close until the Sunday boss is archived; includes its damage and XP',async()=>{
  now=Date.parse('2026-10-25T23:59:40-03:00');await season();const f=await fixture();now=f.end;expect(await guild(0,{type:'leave'})).toMatchObject({status:'rejected',code:'BOSS_CLOSE_REQUIRED'});expect(await season()).toMatchObject({status:'rejected',code:'BOSS_CLOSE_REQUIRED'});await event();expect(await season()).toMatchObject({status:'applied'});const s=await state();expect(s.seasons.archives[0]!.boss).toEqual([{accountId:users[0]!.accountId,name:'Viajante',damage:'1000000'}]);expect(s.seasons.archives[0]!.guilds[0]!.points).toBe('1');expect(s.seasons.rewards).toEqual([{seasonId:'2026-10-19',source:'guild',coin:'300000'}]);await reconciled();
 });
 it('does not grant XP to a recent binding or recapture eligibility on reentry',async()=>{
  await guild(0,{type:'create',name:'Recentes'});await event(0,{type:'join',mode:'boss'});await event(0,{type:'leave'});expect((await state()).bossArchive.own!.eligible).toBe(false);await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1',[now-86400000]);await event(0,{type:'join',mode:'boss'});await event(0,{type:'leave'});expect((await state()).bossArchive.own!.eligible).toBe(false);const realmId=(await db.pool.query('SELECT realm_id FROM akai_v13_world')).rows[0].realm_id,s=await boss.inspect(realmId);s.daily.members[users[0]!.accountId]!.damage='1000000';s.daily.members[users[0]!.accountId]!.contributionDamage='1000000';s.daily.hp-=1000000;await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realmId,s]);now=s.daily.endMs;await event();expect((await state()).guilds.own!.xp).toBe('0');await reconciled();
 });
 it('does not transfer a frozen boss contribution to another guild',async()=>{
  const f=await fixture();await guild(0,{type:'leave'});await guild(0,{type:'create',name:'Outra Guilda'});now=f.end;await event();expect((await state()).guilds.own!.xp).toBe('0');expect((await state()).bossArchive.archives[0]!.contributors[0]!.guildXp).toBe(0);await reconciled();
 });
 it('never turns post-kill contribution into guild XP',async()=>{
  const f=await fixture('0');now=f.end;await event();const s=await state();expect(s.guilds.own!.xp).toBe('0');expect(s.bossArchive.archives[0]!.contributors[0]).toMatchObject({damage:'0',contributionDamage:'999000000',guildXp:0});await reconciled();
 });
 it('skips dormant editions, retains immutable archives/bindings and survives service reconstruction',async()=>{
  const f=await fixture();now=f.end+35*86400000;await db.pool.query('UPDATE akai_sessions SET expires_at=$1',[now+86400000]);await event();expect((await state()).bossArchive.archives).toHaveLength(1);service=new AuthenticatedV13Service(online);await event();expect((await state()).guilds.own!.xp).toBe('1');await expect(db.pool.query('DELETE FROM akai_boss_v18_archives')).rejects.toThrow();await expect(db.pool.query('UPDATE akai_boss_v18_bindings SET eligible=true')).rejects.toThrow();await reconciled();
 });
 it('excludes damage before the first authenticated entry from XP',async()=>{
  await eligibleGuild();const realmId=(await db.pool.query('SELECT realm_id FROM akai_v13_world')).rows[0].realm_id,s=await boss.inspect(realmId);s.daily.members[users[0]!.accountId]={accountId:users[0]!.accountId,name:'Anterior',highestFloor:100,suspended:false,damage:'20000000',contributionDamage:'20000000',qualifiedMs:0};s.daily.hp-=20000000;await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realmId,s]);await event(0,{type:'join',mode:'boss'});await event(0,{type:'leave'});const next=await boss.inspect(realmId);next.daily.members[users[0]!.accountId]!.damage='21000000';next.daily.members[users[0]!.accountId]!.contributionDamage='21000000';next.daily.hp-=1000000;await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realmId,next]);now=next.daily.endMs;await event();expect((await state()).guilds.own!.xp).toBe('1');await reconciled();
 });
 it('connects actual native combat damage to a durable archive and guild XP',async()=>{
  await eligibleGuild();const {presetBuildV3}=await import('@akai/shared'),r=await economy.inspect(users[0]!.run),e=presetBuildV3(1000,'swift','legendary20');e.accountId=users[0]!.accountId;e.highest.main=1000;e.balances=r.state.economy.balances;e.economicThroughMs=now;for(const item of e.inventory)item.enhancement=15;r.state.economy=e;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[users[0]!.run,r.state]);await db.pool.query("INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,'masteryMs',$2,$2)",[users[0]!.run,String(e.masteryMs)]);expect((await event(0,{type:'join',mode:'boss'})).json().status).toBe('applied');now+=10000;expect((await event(0,{type:'heartbeat'})).json().status).toBe('applied');const realmId=(await db.pool.query('SELECT realm_id FROM akai_v13_world')).rows[0].realm_id,s=await boss.inspect(realmId);expect(BigInt(s.daily.members[users[0]!.accountId]!.damage)).toBeGreaterThan(0n);now=s.daily.endMs;for(let i=0;i<5&&(await state()).bossArchive.archives.length===0;i++)await event();expect((await state()).bossArchive.archives[0]!.contributors[0]!.guildXp).toBeGreaterThan(0);await reconciled();
 });
 it.each(['session','member'])('rechecks revoked %s after the guild lock even for event receipt replay',async kind=>{
  const body=await eventInput();await post(0,body);const hold=await db.pool.connect();await hold.query('BEGIN');await hold.query('SELECT pg_advisory_xact_lock(41652016)');let seen!:()=>void;const resolved=new Promise<void>(r=>{seen=r;}),identity=online.identity.bind(online);vi.spyOn(online,'identity').mockImplementation(async(token,c)=>{const id=await identity(token,c);seen();return id;});const pending=post(0,body);try{await resolved;if(kind==='session')await db.pool.query('UPDATE akai_sessions SET revoked=true WHERE account_id=$1',[users[0]!.accountId]);else await service.setEnabled(users[0]!.accountId,false);await hold.query('COMMIT');expect((await pending).statusCode).toBe(kind==='session'?401:403);}finally{await hold.query('ROLLBACK');hold.release();}
 });
 it.each(['suspended','disabled','closed'])('does not credit an unavailable contributor: %s',async kind=>{
  const f=await fixture();if(kind==='disabled')await service.setEnabled(users[0]!.accountId,false);else if(kind==='closed')await db.pool.query('UPDATE akai_economy_rehearsals SET closed=true WHERE id=$1',[users[0]!.run]);else await db.pool.query('INSERT INTO akai_profiles(account_id,name,joined_at,suspended) VALUES($1,$2,$3,true) ON CONFLICT(account_id) DO UPDATE SET suspended=true',[users[0]!.accountId,'Suspenso',now]);now=f.end;expect((await event(1)).json().status).toBe('applied');expect((await db.pool.query('SELECT xp FROM akai_guild_v16_guilds WHERE id=$1',[f.id])).rows[0].xp).toBe('0');expect((await state(1)).bossArchive.archives[0]!.contributors[0]!.guildXp).toBe(0);
 });
});
