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
describe.skipIf(!url)('V15 authenticated arena on canonical runs',()=>{
 let base:Database,db:Database,online:OnlineService,economy:EconomyRehearsalService,market:MarketV2Service,boss:BossEventsV8Service,service:AuthenticatedV13Service,app:ReturnType<typeof buildServer>,schema:string,realm:string,now:number;
 let users:Array<{token:string;accountId:string;run:string;source:unknown}>;
 const headers=(token?:string)=>({'x-akai-client':'1',origin:'http://localhost:5173',...(token?{cookie:'akai_session='+token}:{})});
 beforeEach(async()=>{
  now=Date.parse('2026-10-21T18:00:00-03:00');base=new Database(url!);schema='v15_'+randomUUID().replaceAll('-','');await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(url!);u.searchParams.set('options','-csearch_path='+schema);u.searchParams.set('application_name',schema);db=new Database(u.toString());await db.migrate();online=new OnlineService(db,()=>now);economy=new EconomyRehearsalService(db,()=>now);boss=new BossEventsV8Service(db,()=>now);market=new MarketV2Service(db,()=>now);service=new AuthenticatedV13Service(online);users=[];
  for(let n=0;n<8;n++){
   const user=await online.guest(),run=(await economy.stage(user.accountId,randomUUID())).id,r=await economy.inspect(run);r.state.paused=true;r.state.economy.highest.main=100;r.state.economy.balances.coin='2000000000';r.state.economy.balances.iron='100000';r.state.economy.economicThroughMs=now;r.state.economy.equipped.weapon=null;r.state.economy.inventory[0]!.enhancement=7;r.state.economy.inventory[0]!.qualityBp=10321;
   await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[run,r.state]);for(const k of ['coin','iron'] as const)await db.pool.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,$2,$3,$3)',[run,k,r.state.economy.balances[k]]);
   users.push({...user,run,source:(await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[user.accountId])).rows[0].snapshot});
  }
  const event=(await boss.stage(users.map(u=>u.run),randomUUID())).id;await service.bindWorld(event);realm=(await market.stage(users.map(u=>u.run),randomUUID())).id;await service.bindMarket(realm);
  app=buildServer(parseServerConfig({DATABASE_URL:u.toString(),V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}),false,{service:online});await app.ready();
 },30000);
 afterEach(async()=>{vi.restoreAllMocks();await app?.close();await db?.close();if(base){await base.pool.query('DROP SCHEMA '+schema+' CASCADE');await base.close();}});
 async function state(n=0){return service.read(users[n]!.token);}
 async function input(n:number,action:Record<string,unknown>){const s=await state(n);return {commandId:randomUUID(),expectedRevision:s.revision,arenaRevision:s.arena.revision,seasonId:s.arena.season.id,action};}
 async function post(n:number,body:unknown){return app.inject({method:'POST',url:'/api/v1/test-v2/arena',payload:JSON.stringify(body),headers: {...headers(users[n]!.token), 'content-type':'application/json'}});}
 async function act(n:number,action:Record<string,unknown>){return post(n,await input(n,action));}
 async function reconciled(){for(const u of users){expect(await economy.reconcile(u.run)).toEqual([]);expect((await db.pool.query('SELECT snapshot FROM akai_accounts WHERE id=$1',[u.accountId])).rows[0].snapshot).toEqual(u.source);}}

 it('keeps GET read-only, enrolls real canonical accounts and exposes only eligible higher opponents',async()=>{
  expect((await state()).arena).toMatchObject({enrolled:false,board:[],opponents:[]});expect((await db.pool.query('SELECT * FROM akai_arena_v15_entries')).rowCount).toBe(0);
  expect((await act(0,{type:'enroll'})).json().status).toBe('applied');
  const board=(await state()).arena.board;expect(board).toHaveLength(8);expect(board.map(x=>x.accountId).sort()).toEqual(users.map(x=>x.accountId).sort());
  const first=users.findIndex(x=>x.accountId===board[0]!.accountId),last=users.findIndex(x=>x.accountId===board[7]!.accountId);
  expect((await state(first)).arena.opponents).toEqual([]);expect((await state(last)).arena.opponents.map(x=>x.position)).toEqual([7,6,5,4,3]);await reconciled();
 });
 async function pair(){await act(0,{type:'enroll'});const board=(await state()).arena.board;return {attacker:users.findIndex(x=>x.accountId===board[2]!.accountId),defender:users.findIndex(x=>x.accountId===board[1]!.accountId)};}
 it('resolves once, stores immutable audit, preserves wallets and rejects stale or reused commands',async()=>{
  const {attacker,defender}=await pair(),body=await input(attacker,{type:'challenge',opponentId:users[defender]!.accountId}),before=await Promise.all(users.map(u=>economy.inspect(u.run)));
  const results=await Promise.all([post(attacker,body),post(attacker,body)]);expect(results[0]!.json()).toEqual(results[1]!.json());expect(results[0]!.json().status).toBe('applied');
  expect((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount).toBe(1);const match=(await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rows[0];expect(match.audit.seed).toBeGreaterThan(0);expect(match.audit.attackerStats.intervalMs).toBeGreaterThanOrEqual(200);
  for(const [i,u]of users.entries()){const after=(await economy.inspect(u.run)).state.economy;expect({...after,revision:0}).toEqual({...before[i]!.state.economy,revision:0});}
  const dto=await state(attacker);expect(dto.arena.challengesUsed).toBe(1);expect(dto.arena.nextAt).toBe(now+60000);expect(dto.arena.history).toHaveLength(1);expect((await state(defender)).arena.history).toHaveLength(1);
  for(const u of users)expect(JSON.stringify(dto)).not.toContain(u.run);expect(JSON.stringify(dto.arena)).not.toMatch(/"(seed|secret|attackerStats|defenderStats)":/);
  expect((await post(attacker,{...body,action:{type:'enroll'}})).statusCode).toBe(409);expect((await post(attacker,{...body,commandId:randomUUID()})).json().code).toBe('STALE_REVISION');
  await expect(db.pool.query('DELETE FROM akai_arena_v15_matches')).rejects.toThrow();await reconciled();
 });
 it('serializes competing challenges against one board revision',async()=>{
  await pair();const board=(await state()).arena.board,a=users.findIndex(x=>x.accountId===board[3]!.accountId),b=users.findIndex(x=>x.accountId===board[4]!.accountId),target=board[0]!.accountId;
  const one=await input(a,{type:'challenge',opponentId:target}),two=await input(b,{type:'challenge',opponentId:target}),results=await Promise.all([post(a,one),post(b,two)]);expect(results.filter(r=>r.json().status==='applied')).toHaveLength(1);expect(results.filter(r=>r.json().code==='STALE_ARENA_REVISION')).toHaveLength(1);expect((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount).toBe(1);await reconciled();
 });
 it('samples time after queued locks and never rewinds the arena cursor',async()=>{
  const body=await input(0,{type:'enroll'}),hold=await db.pool.connect();await hold.query('BEGIN');await hold.query('SELECT pg_advisory_xact_lock(41652015)');const pending=post(0,body);
  try{let waiting=false;for(let i=0;i<200;i++){const r=await base.pool.query("SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND query LIKE 'SELECT pg_advisory_xact_lock(41652015)%'",[schema]);if(r.rowCount){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}expect(waiting).toBe(true);now+=10000;await hold.query('UPDATE akai_arena_v15_world SET clock_ms=$1',[now+10000]);await hold.query('COMMIT');expect((await pending).json().status).toBe('applied');expect((await state()).arena.serverNow).toBe(now+10000);await reconciled();}finally{await hold.query('ROLLBACK');hold.release();}
 });
 it('swaps only the winning pair and gives +20 trophies, while loss floors trophies at zero',async()=>{
  const {attacker,defender}=await pair();const row=await economy.inspect(users[attacker]!.run);const {presetBuildV3}=await import('@akai/shared');const e=presetBuildV3(1000,'swift','legendary20');e.accountId=users[attacker]!.accountId;e.highest.main=1000;e.economicThroughMs=now;for(const item of e.inventory)item.enhancement=15;row.state.economy=e;
  await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[users[attacker]!.run,row.state]);
  const old=(await state(attacker)).arena;expect((await act(attacker,{type:'challenge',opponentId:users[defender]!.accountId})).json().status).toBe('applied');
  const next=(await state(attacker)).arena;expect(next.history[0]!.won).toBe(true);expect(next.own).toMatchObject({position:2,trophies:20});expect(next.board.find(x=>x.accountId===users[defender]!.accountId)).toMatchObject({position:3,trophies:0});expect(next.board[0]).toEqual(old.board[0]);
  now+=60000;expect((await act(defender,{type:'challenge',opponentId:users[attacker]!.accountId})).json().status).toBe('applied');expect((await state(defender)).arena.own!.trophies).toBe(0);
 });
 it('enforces cooldown, rolling quota across weekly reset, and requires explicit reenrollment',async()=>{
  const {attacker,defender}=await pair(),action={type:'challenge',opponentId:users[defender]!.accountId};await act(attacker,action);expect((await act(attacker,{type:'challenge',opponentId:(await state(attacker)).arena.opponents[0]!.accountId})).json().code).toBe('ARENA_COOLDOWN');
  now=Date.parse('2026-10-25T23:50:00-03:00');await act(0,{type:'enroll'});
  // Twenty immutable historical matches in the final hour of the old week.
  for(let i=0;i<20;i++)await db.pool.query('INSERT INTO akai_arena_v15_matches VALUES($1,$2,$3,$4,$5,false,$6)',[randomUUID(),(await state()).arena.season.id,users[attacker]!.accountId,users[defender]!.accountId,now,{result:{version:'arena-v15-1',won:false,hpA:0,hpB:1,elapsedMs:1000,attacks:2,reason:'defender'}}]);
  now+=20*60000;const s=await state(attacker);expect(s.arena.enrolled).toBe(false);expect(s.arena.board).toEqual([]);expect(s.arena.challengesUsed).toBe(20);expect((await act(attacker,{type:'enroll'})).json().status).toBe('applied');expect((await act(attacker,action)).json().code).toBe('DAILY_CHALLENGE_LIMIT');expect((await state(attacker)).arena.history.length).toBe(21);await reconciled();
 });
 it('rejects stale board and expired season without consuming a challenge',async()=>{
  const {attacker,defender}=await pair(),body=await input(attacker,{type:'challenge',opponentId:users[defender]!.accountId});await db.pool.query('UPDATE akai_arena_v15_world SET revision=revision+1');expect((await post(attacker,body)).json().code).toBe('STALE_ARENA_REVISION');
  const next=await input(attacker,{type:'enroll'});now+=5*86400000;expect((await post(attacker,next)).json().code).toBe('ARENA_SEASON_CHANGED');expect((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount).toBe(0);await reconciled();
 });
 it('rejects forged inputs, IDOR, low floors, missing CSRF and disabled routes',async()=>{
  const body=await input(0,{type:'enroll'});for(const extra of [{actor:users[1]!.run},{seed:1},{now:now+1},{stats:{attack:999}},{action:{type:'challenge',opponentId:randomUUID(),attack:999}}])expect((await post(0,{...body,...extra})).statusCode).toBe(400);
  expect((await app.inject({method:'POST',url:'/api/v1/test-v2/arena',headers:headers(),payload:body})).statusCode).toBe(401);
  expect((await app.inject({method:'POST',url:'/api/v1/test-v2/arena',headers:{...headers(users[0]!.token),origin:'https://evil.example'},payload:body})).statusCode).toBe(403);
  expect((await app.inject({method:'POST',url:'/api/v1/test-v2/arena?accountId='+users[1]!.accountId,headers:headers(users[0]!.token),payload:body})).statusCode).toBe(400);
  const off=buildServer(parseServerConfig({}),false,{service:online});try{expect((await off.inject({method:'POST',url:'/api/v1/test-v2/arena',headers:headers(users[0]!.token),payload:body})).statusCode).toBe(404);}finally{await off.close();}
  const r=await economy.inspect(users[0]!.run);r.state.economy.highest.main=4;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[users[0]!.run,r.state]);expect((await post(0,body)).json().code).toBe('COMPLETE_FLOOR_FIVE');await reconciled();
 });
 it('requires a valid higher target, blocks event participants and filters disabled defenders',async()=>{
  const {attacker,defender}=await pair();expect((await act(attacker,{type:'challenge',opponentId:users[attacker]!.accountId})).json().code).toBe('OPPONENT_NOT_ELIGIBLE');
  await service.setEnabled(users[defender]!.accountId,false);expect((await state(attacker)).arena.opponents.some(x=>x.accountId===users[defender]!.accountId)).toBe(false);expect((await act(attacker,{type:'challenge',opponentId:users[defender]!.accountId})).json().code).toBe('OPPONENT_NOT_ELIGIBLE');await service.setEnabled(users[defender]!.accountId,true);
  const s=await state(defender);expect((await service.command(users[defender]!.token,{commandId:randomUUID(),expectedRevision:s.revision,action:{type:'join',mode:'protection'}})).status).toBe('applied');expect((await act(attacker,{type:'challenge',opponentId:users[defender]!.accountId})).json().code).toBe('EVENT_ACTIVITY_ACTIVE');await reconciled();
 });
 it.each(['session','member'])('rechecks revoked %s after advisory lock even for receipt replay',async kind=>{
  const body=await input(0,{type:'enroll'});await post(0,body);const hold=await db.pool.connect();await hold.query('BEGIN');await hold.query('SELECT pg_advisory_xact_lock(41652015)');let seen!:()=>void;const resolved=new Promise<void>(r=>{seen=r;});const identity=online.identity.bind(online);vi.spyOn(online,'identity').mockImplementation(async(token,c)=>{const id=await identity(token,c);seen();return id;});const pending=post(0,body);
  try{await resolved;if(kind==='session')await db.pool.query('UPDATE akai_sessions SET revoked=true WHERE account_id=$1',[users[0]!.accountId]);else await service.setEnabled(users[0]!.accountId,false);await hold.query('COMMIT');expect((await pending).statusCode).toBe(kind==='session'?401:403);}finally{await hold.query('ROLLBACK');hold.release();}
 });
 it('rolls back ranks, both runs, quota and receipts on outbox failure, then safely retries',async()=>{
  const {attacker,defender}=await pair(),body=await input(attacker,{type:'challenge',opponentId:users[defender]!.accountId}),before=await state(attacker),runs=await Promise.all(users.map(u=>economy.inspect(u.run)));
  await db.pool.query("CREATE FUNCTION v15_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'V15_OUTBOX'; END $$");await db.pool.query('CREATE TRIGGER v15_fail BEFORE INSERT ON akai_arena_v15_events FOR EACH ROW EXECUTE FUNCTION v15_fail()');expect((await post(attacker,body)).statusCode).toBe(500);expect((await state(attacker)).arena).toEqual(before.arena);expect(await Promise.all(users.map(u=>economy.inspect(u.run)))).toEqual(runs);expect((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount).toBe(0);
  await db.pool.query('DROP TRIGGER v15_fail ON akai_arena_v15_events');expect((await post(attacker,body)).json().status).toBe('applied');await reconciled();
 });
 it('commits bounded native settlement without a duel when either side has backlog',async()=>{
  const {attacker,defender}=await pair(),r=await economy.inspect(users[defender]!.run);r.state.paused=false;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[users[defender]!.run,r.state]);now+=8*3600000;
  expect((await act(attacker,{type:'challenge',opponentId:users[defender]!.accountId})).json().status).toBe('settling');expect((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount).toBe(0);expect((await state(attacker)).arena.challengesUsed).toBe(0);await reconciled();
 });
});
