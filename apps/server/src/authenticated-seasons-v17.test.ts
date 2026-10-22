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
describe.skipIf(!url)('V17 authenticated season closeout',()=>{
 let base:Database,db:Database,online:OnlineService,economy:EconomyRehearsalService,market:MarketV2Service,boss:BossEventsV8Service,service:AuthenticatedV13Service,app:ReturnType<typeof buildServer>,schema:string,realm:string,now:number;
 let users:Array<{token:string;accountId:string;run:string;source:unknown}>;
 const headers=(token?:string)=>({'x-akai-client':'1',origin:'http://localhost:5173',...(token?{cookie:'akai_session='+token}:{})});
 beforeEach(async()=>{
  now=Date.parse('2026-10-21T18:00:00-03:00');base=new Database(url!);schema='v17_'+randomUUID().replaceAll('-','');await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);u.searchParams.set('application_name',schema);db=new Database(u.toString());await db.migrate();online=new OnlineService(db,()=>now);economy=new EconomyRehearsalService(db,()=>now);boss=new BossEventsV8Service(db,()=>now);market=new MarketV2Service(db,()=>now);service=new AuthenticatedV13Service(online);users=[];
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
 async function input(n=0){const s=await state(n);return{commandId:randomUUID(),expectedRevision:s.revision,seasonRevision:s.seasons.revision,action:{type:'sync'}};}
 async function post(n:number,body:unknown){return app.inject({method:'POST',url:'/api/v1/test-v2/seasons',payload:JSON.stringify(body),headers:{...headers(users[n]!.token),'content-type':'application/json'}});}
 async function sync(n=0){return post(n,await input(n));}
 async function guild(n:number,action:Record<string,unknown>){const s=await state(n);return service.command(users[n]!.token,{commandId:randomUUID(),expectedRevision:s.revision,guildRevision:s.guilds.revision,action},'guilds');}
 async function reconciled(){for(const u of users){expect(await economy.reconcile(u.run)).toEqual([]);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[u.accountId])).rows[0].snapshot).toEqual(u.source);}}
 async function fixture(){
  await sync();const period=(await state()).seasons.tracked!;
  await guild(0,{type:'create',name:'Primeira'});await guild(0,{type:'invite',accountId:users[1]!.accountId});await guild(1,{type:'accept',guildId:(await state()).guilds.own!.id});await guild(2,{type:'create',name:'Segunda'});
  const a=(await state()).guilds.own!.id,b=(await state(2)).guilds.own!.id;
  // Explicit SQL ranking fixture; native arena/XP path is independently covered by V15/V16.
  for(const [i,u]of users.entries())await db.pool.query('INSERT INTO akai_arena_v15_entries VALUES($1,$2,$3,$4)',[period.id,u.accountId,i+1,[20,40,0,999][i]]);
  const result={version:'arena-v15-1',won:true,hpA:100,hpB:0,elapsedMs:1000,attacks:1,reason:'attacker'};
  for(const [a,b]of [[0,1],[1,2]])await db.pool.query('INSERT INTO akai_arena_v15_matches VALUES($1,$2,$3,$4,$5,true,$6)',[randomUUID(),period.id,users[a!]!.accountId,users[b!]!.accountId,now+1,{result}]);
  for(const [id,account,points]of [[a,users[0]!.accountId,5],[b,users[2]!.accountId,2]] as const)await db.pool.query('INSERT INTO akai_guild_v16_credits VALUES($1,$2,$3,$4,$5)',['fixture:'+id,account,id,points,now+1]);
  return period;
 }
 it('reads without writing and initializes tracking only on an authenticated strict command',async()=>{
  const first=await state();expect(first.seasons).toMatchObject({tracked:null,closeRequired:false,archives:[],rewards:[]});expect((await state()).revision).toBe(first.revision);expect((await db.pool.query('SELECT count(*) FROM akai_season_v17_commands')).rows[0].count).toBe('0');
  const body=await input();expect((await post(0,{...body,accountId:users[1]!.accountId})).statusCode).toBe(400);expect((await app.inject({url:'/api/v1/test-v2/state'})).statusCode).toBe(401);expect((await sync()).json().status).toBe('applied');expect((await state()).seasons.tracked).toMatchObject({id:'2026-10-19',trackedFrom:now});await reconciled();
 });
 it('closes at the exact boundary, pays participant trophies and eligible guild members once',async()=>{
  const p=await fixture(),before=await Promise.all(users.map((_,i)=>state(i)));now=p.end-1;expect((await state()).seasons.closeRequired).toBe(false);await sync();expect((await state()).seasons.archives).toEqual([]);now=p.end;expect((await state()).seasons.closeRequired).toBe(true);
  const body=await input(),r=await Promise.all([post(0,body),post(0,body)]);expect(r[0]!.json()).toEqual(r[1]!.json());expect(r[0]!.json()).toMatchObject({status:'applied',closed:p.id});
  // user3 has most trophies but no match; user2 participated by defending.
  for(const [i,amount]of [600000n,800000n,300000n,0n].entries()){const s=await state(i);expect(BigInt(s.consumer.balances.coin)-BigInt(before[i]!.consumer.balances.coin)).toBe(amount);expect(s.consumer.balances.jade).toBe(before[i]!.consumer.balances.jade);expect(s.consumer.level).toBe(before[i]!.consumer.level);}
  expect((await state()).seasons.archives[0]).toMatchObject({id:p.id,trackedFrom:p.trackedFrom,closedAt:now});expect((await state()).seasons.archives[0]!.guilds.map(g=>g.points)).toEqual(['5','2']);expect((await state(3)).seasons.rewards).toEqual([]);await sync();expect((await db.pool.query('SELECT count(*) FROM akai_season_v17_rewards')).rows[0].count).toBe('6');await reconciled();
 });
 it('freezes guild membership and arena mutations until the pending season closes',async()=>{
  const p=await fixture();now=p.end;expect(await guild(1,{type:'leave'})).toMatchObject({status:'rejected',code:'SEASON_CLOSE_REQUIRED'});let s=await state();expect(await service.command(users[0]!.token,{commandId:randomUUID(),expectedRevision:s.revision,arenaRevision:s.arena.revision,seasonId:s.arena.season.id,action:{type:'enroll'}},'arena')).toMatchObject({status:'rejected',code:'SEASON_CLOSE_REQUIRED'});
  await sync();expect(await guild(1,{type:'leave'})).toMatchObject({status:'applied'});s=await state();expect(await service.command(users[0]!.token,{commandId:randomUUID(),expectedRevision:s.revision,arenaRevision:s.arena.revision,seasonId:s.arena.season.id,action:{type:'enroll'}},'arena')).toMatchObject({status:'applied'});expect((await state()).arena.board.every(r=>r.trophies===0)).toBe(true);await reconciled();
 });
 it('rolls archive, every wallet, ledger and receipt back when outbox persistence fails',async()=>{
  const p=await fixture(),before=await Promise.all(users.map((_,i)=>state(i)));now=p.end;const body=await input();await db.pool.query("CREATE FUNCTION fail_season() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$; CREATE TRIGGER fail_season BEFORE INSERT ON akai_season_v17_events FOR EACH ROW EXECUTE FUNCTION fail_season()");
  expect((await post(0,body)).statusCode).toBe(500);expect((await state()).seasons.archives).toEqual([]);expect((await db.pool.query('SELECT count(*) FROM akai_season_v17_rewards')).rows[0].count).toBe('0');for(let i=0;i<4;i++)expect((await state(i)).consumer.balances).toEqual(before[i]!.consumer.balances);expect((await state()).revision).toBe(body.expectedRevision);
  await db.pool.query('DROP TRIGGER fail_season ON akai_season_v17_events');expect((await post(0,body)).json().status).toBe('applied');await reconciled();
 });
 it('does not pay recent joins, suspended or disabled members and ignores empty/inactive guilds',async()=>{
  const p=await fixture();await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1 WHERE account_id=$2',[p.end-86400000+1,users[1]!.accountId]);await service.setEnabled(users[2]!.accountId,false);now=p.end;await sync();const rewards=(await db.pool.query('SELECT * FROM akai_season_v17_rewards')).rows;expect(rewards.some(r=>r.account_id===users[2]!.accountId)).toBe(false);expect(rewards.some(r=>r.source==='guild'&&r.account_id===users[1]!.accountId)).toBe(false);expect((await state()).seasons.archives[0]!.guilds).toHaveLength(1);await reconciled();
 });
 it('rejects stale reviews without closing or paying, and requires a new UUID after re-review',async()=>{
  const p=await fixture(),body=await input();await sync(1);now=p.end;const r=await post(0,body);expect(r.json().code).toBe('STALE_SEASON_REVISION');expect((await state()).seasons.archives).toEqual([]);expect((await post(0,body)).json()).toEqual(r.json());expect((await post(0,{...body,expectedRevision:999})).statusCode).toBe(409);expect((await sync()).json().closed).toBe(p.id);await reconciled();
 });
 it('revalidates revoked sessions and disabled membership even for prior receipts',async()=>{
  const body=await input();await post(0,body);await service.setEnabled(users[0]!.accountId,false);expect((await post(0,body)).statusCode).toBe(403);await service.setEnabled(users[0]!.accountId,true);await db.pool.query('DELETE FROM akai_sessions WHERE account_id=$1',[users[0]!.accountId]);expect((await post(0,body)).statusCode).toBe(401);
 });
 it('skips dormant weeks, keeps immutable archives and clamps clock rollback',async()=>{
  const p=await fixture();now=p.end+35*86400000;await sync();const s=await state();expect(s.seasons.archives).toHaveLength(1);expect(s.seasons.tracked!.id).toBe(s.seasons.current.id);expect((await db.pool.query('SELECT count(*) FROM akai_season_v17_rewards')).rows[0].count).toBe('6');now=p.start;expect((await state()).seasons.current.id).toBe(s.seasons.current.id);await expect(db.pool.query('DELETE FROM akai_season_v17_archives')).rejects.toThrow();await expect(db.pool.query('UPDATE akai_season_v17_rewards SET coin=1')).rejects.toThrow();await reconciled();
 });
 it('does not retrospectively pay old matches and sources, or expose private receipts/run IDs',async()=>{
  const p=await fixture();const cutoff=p.trackedFrom+10;await db.pool.query('UPDATE akai_season_v17_world SET period=jsonb_set(period,\'{trackedFrom}\',to_jsonb($1::bigint))',[cutoff]);now=p.end;await sync();expect((await state()).seasons.rewards).toEqual([]);const text=JSON.stringify((await state()).seasons);for(const u of users)expect(text).not.toContain(u.run);expect(text).not.toContain('payload_hash');expect((await db.pool.query('SELECT count(*) FROM akai_season_v17_rewards')).rows[0].count).toBe('0');await reconciled();
 });
 it('serializes distinct competing closers without duplicate grants or lost wallet revisions',async()=>{
  const p=await fixture();now=p.end;const [a,b]=await Promise.all([input(),input(1)]),results=await Promise.all([post(0,a),post(1,b)]);expect(results.filter(r=>r.json().status==='applied')).toHaveLength(1);expect((await state()).seasons.archives).toHaveLength(1);expect((await db.pool.query('SELECT count(*) FROM akai_season_v17_rewards')).rows[0].count).toBe('6');await reconciled();
 });
});
