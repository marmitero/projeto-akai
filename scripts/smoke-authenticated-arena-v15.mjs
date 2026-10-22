// Isolated synthetic browser fixtures; no production accounts or personal data.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {Database} from '../apps/server/dist/database.js';
import {OnlineService} from '../apps/server/dist/online.js';
import {EconomyRehearsalService} from '../apps/server/dist/economy-rehearsal.js';
import {MarketV2Service} from '../apps/server/dist/market-v2.js';
import {BossEventsV8Service} from '../apps/server/dist/boss-events-v8.js';
import {AuthenticatedV13Service} from '../apps/server/dist/authenticated-v13.js';
import {buildServer} from '../apps/server/dist/app.js';
import {parseServerConfig} from '../apps/server/dist/config.js';
import {presetBuildV3} from '../packages/shared/dist/index.js';
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL must be isolated');
const preview=process.argv.includes('--preview'),port=preview?4189:5189,origin=`http://localhost:${port}`,schema='browser_v15_'+randomUUID().replaceAll('-','');
const base=new Database(process.env.TEST_DATABASE_URL);let db,app,child,browser,now=Date.parse('2026-10-21T18:00:00-03:00');
try{
 await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(process.env.TEST_DATABASE_URL);u.searchParams.set('options','-csearch_path='+schema);db=new Database(u.toString());await db.migrate();
 const online=new OnlineService(db,()=>now),economy=new EconomyRehearsalService(db,()=>now),boss=new BossEventsV8Service(db,()=>now),service=new AuthenticatedV13Service(online),users=[];
 for(let i=0;i<2;i++){
  const user=await online.guest(),run=(await economy.stage(user.accountId,randomUUID())).id,row=await economy.inspect(run),e=presetBuildV3(1000,'swift','legendary20');e.accountId=user.accountId;e.highest.main=1000;e.economicThroughMs=now;
  for(const item of e.inventory){const old=item.id;item.id=user.accountId+'/'+old;item.enhancement=15;for(const key of Object.keys(e.equipped))if(e.equipped[key]===old)e.equipped[key]=item.id;}
  e.balances.coin='2000000000';e.balances.iron='100000';e.balances.coal='100000';e.inventory.push({...e.inventory[0],id:user.accountId+'/market-item',enhancement:7,qualityBp:10321});row.state.economy=e;row.state.paused=true;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[run,row.state]);await db.pool.query("INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,'masteryMs',$2,$2)",[run,String(e.masteryMs)]);for(const k of ['coin','iron','coal'])await db.pool.query('INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,$2,$3,$3)',[run,k,e.balances[k]]);await db.pool.query("UPDATE akai_accounts SET snapshot=jsonb_set(snapshot,'{battle,paused}','true'::jsonb) WHERE id=$1",[user.accountId]);users.push({...user,run});
 }
 const realm=(await boss.stage(users.map(x=>x.run),randomUUID())).id;await service.bindWorld(realm);const market=new MarketV2Service(db,()=>now),marketRealm=(await market.stage(users.map(x=>x.run),randomUUID())).id;await service.bindMarket(marketRealm);
 app=buildServer(parseServerConfig({DATABASE_URL:u.toString(),PUBLIC_ORIGIN:origin,V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}),false,{service:online});await app.listen({host:'127.0.0.1',port:3000});
 const require=createRequire(new URL('../apps/client/package.json',import.meta.url)),vite=resolve(dirname(require.resolve('vite/package.json')),'bin/vite.js');let output='';
 child=spawn(process.execPath,[vite,...(preview?['preview']:[]),'apps/client','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_GAME_MODE:'online'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,output.slice(-1500));
 browser=await chromium.launch({...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pages=[],errors=[];
 async function open(page){await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();await page.locator('[data-v13-wallet]').filter({hasText:'Nível 1000'}).waitFor();await page.locator('#authenticated-arena-v15 > summary').click();}
 for(const [i,user]of users.entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1280,height:900}});await context.addCookies([{name:'akai_session',value:user.token,domain:'localhost',path:'/api/v1',httpOnly:true,sameSite:'Strict'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(page);pages.push(page);
 }
 const [first,second]=pages;
 async function refresh(page){const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/state'));await page.locator('[data-v13-refresh]').click();const dto=await(await response).json();await page.waitForFunction(revision=>document.querySelector('#authenticated-arena-v15')?.dataset.runRevision===String(revision),dto.revision);}
 async function confirm(page,trigger,status='applied'){
  await trigger.click();await page.locator('[data-v15-review]:visible').waitFor();const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/arena')&&r.request().method()==='POST');await page.locator('[data-v15-confirm]').click();const body=await(await response).json();assert.equal(body.status,status,JSON.stringify(body));await page.waitForFunction(()=>document.querySelector('[data-v15-retry]').hidden);await refresh(page);return body;
 }
 await confirm(first,first.locator('[data-v15-enroll]'));await refresh(second);
 const board=(await service.read(users[0].token)).arena.board;assert.equal(board.length,2);const attackerIndex=users.findIndex(u=>u.accountId===board[1].accountId),defenderIndex=1-attackerIndex,attacker=pages[attackerIndex],defender=pages[defenderIndex];
 assert.equal(await defender.locator('[data-v15-opponent]').count(),0);await defender.locator('[data-v15-opponents]').filter({hasText:'Nenhum adversário elegível acima'}).waitFor();
 const balances=await Promise.all(users.map(u=>economy.inspect(u.run)));
 // Server commits but browser loses response; reload replays the same intent once.
 let lostBody;await attacker.route('**/api/v1/test-v2/arena',async route=>{lostBody=route.request().postDataJSON();await route.fetch();await route.abort('failed');},{times:1});await attacker.locator('[data-v15-opponent]').click();await attacker.locator('[data-v15-confirm]').click();await attacker.locator('[data-v15-status]').filter({hasText:'Resposta não confirmada'}).waitFor();assert.equal((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount,1);
 await attacker.reload();await attacker.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(attacker);await attacker.locator('[data-v15-status]').filter({hasText:'Arena atualizada'}).waitFor();assert.equal((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount,1);assert.equal((await db.pool.query('SELECT * FROM akai_arena_v15_commands WHERE account_id=$1 AND command_id=$2',[users[attackerIndex].accountId,lostBody.commandId])).rowCount,1);
 await refresh(attacker);await refresh(defender);assert.equal(await attacker.locator('[data-v15-match]').count(),1);assert.equal(await defender.locator('[data-v15-match]').count(),1);
 for(const [i,u]of users.entries())assert.deepEqual({...((await economy.inspect(u.run)).state.economy),revision:0},{...balances[i].state.economy,revision:0});
 // An intent reviewed before another command must reject, never silently challenge a new target.
 now+=60000;for(const p of pages)await refresh(p);const state=await service.read(users[0].token),lowIndex=users.findIndex(u=>u.accountId===state.arena.board[1].accountId),low=pages[lowIndex],other=pages[1-lowIndex];await low.locator('[data-v15-opponent]').click();
 await confirm(other,other.locator('[data-v15-enroll]')); // No board change, but may invalidate the actor only if the same account; force board revision through an isolated test fixture.
 await db.pool.query('UPDATE akai_arena_v15_world SET revision=revision+1');
 const response=low.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/arena')&&r.request().method()==='POST');await low.locator('[data-v15-confirm]').click();assert.equal((await(await response).json()).code,'STALE_ARENA_REVISION');await low.locator('[data-v15-status]').filter({hasText:'A classificação mudou'}).waitFor();assert.equal((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount,1);await refresh(low);await confirm(low,low.locator('[data-v15-opponent]'));assert.equal((await db.pool.query('SELECT * FROM akai_arena_v15_matches')).rowCount,2);
 for(const [i,page]of pages.entries()){
  await refresh(page);const dto=await service.read(users[i].token),json=JSON.stringify(dto);for(const user of users)assert.ok(!json.includes(user.run));assert.doesNotMatch(JSON.stringify(dto.arena),/"(seed|secret|attackerStats|defenderStats)":/);assert.deepEqual(await economy.reconcile(users[i].run),[]);
  const legacy=await page.evaluate(async()=>{const r=await fetch('/api/v1/state',{headers:{'X-Akai-Client':'1'}});return r.json();});assert.equal(legacy.snapshot.balances.coin,'0');assert.equal(legacy.snapshot.balances.jade,'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({authenticatedArenaV15:true,preview,realOpponents:true,lostResponseReload:true,oneMatch:true,explicitStaleReview:true,redacted:true,legacyUnchanged:true,desktopAndMobile:true}));
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await app?.close();await db?.close();await base.pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await base.close();}
