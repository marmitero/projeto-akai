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
const preview=process.argv.includes('--preview'),port=preview?4190:5190,origin=`http://localhost:${port}`,schema='browser_v16_'+randomUUID().replaceAll('-','');
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
 async function open(page){await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();await page.locator('[data-v13-wallet]').filter({hasText:'Nível 1000'}).waitFor();await page.locator('#authenticated-guilds-v16 > summary').click();}
 for(const [i,user]of users.entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1280,height:900}});await context.addCookies([{name:'akai_session',value:user.token,domain:'localhost',path:'/api/v1',httpOnly:true,sameSite:'Strict'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(page);pages.push(page);
 }
 const [leader,member]=pages;
 async function refresh(page){const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/state'));await page.locator('[data-v13-refresh]').click();const dto=await(await response).json();await page.waitForFunction(revisions=>{const el=document.querySelector('#authenticated-guilds-v16');return el?.dataset.runRevision===String(revisions[0])&&el?.dataset.revision===String(revisions[1]);},[dto.revision,dto.guilds.revision]);}
 async function confirm(page,trigger,status='applied'){
  await trigger.click();await page.locator('[data-v16-review]:visible').waitFor();const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/guilds')&&r.request().method()==='POST');await page.locator('[data-v16-confirm]').click();const body=await(await response).json();assert.equal(body.status,status,JSON.stringify(body));await page.waitForFunction(()=>document.querySelector('[data-v16-retry]').hidden);await refresh(page);return body;
 }
 let lostBody;await leader.route('**/api/v1/test-v2/guilds',async route=>{lostBody=route.request().postDataJSON();await route.fetch();await route.abort('failed');},{times:1});await leader.locator('[data-v16-name]').fill('Guilda Browser');await leader.locator('[data-v16-create]').click();await leader.locator('[data-v16-confirm]').click();await leader.locator('[data-v16-status]').filter({hasText:'Resposta não confirmada'}).waitFor();assert.equal((await db.pool.query('SELECT * FROM akai_guild_v16_guilds')).rowCount,1);
 await leader.reload();await leader.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(leader);await leader.locator('[data-v16-status]').filter({hasText:'Guilda atualizada'}).waitFor();assert.equal((await db.pool.query('SELECT * FROM akai_guild_v16_commands WHERE account_id=$1 AND command_id=$2',[users[0].accountId,lostBody.commandId])).rowCount,1);assert.equal((await service.read(users[0].token)).consumer.balances.coin,'1999500000');await refresh(leader);
 const guildId=(await service.read(users[0].token)).guilds.own.id;await leader.locator('[data-v16-player]').selectOption(users[1].accountId);await confirm(leader,leader.locator('[data-v16-invite]'));await refresh(member);await confirm(member,member.locator(`[data-v16-accept="${guildId}"]`));await refresh(leader);
 const text='<img src=x onerror=alert(1)>';await leader.locator('[data-v16-message]').fill(text);await confirm(leader,leader.locator('[data-v16-send]'));await refresh(member);assert.equal(await member.locator('[data-v16-chat] img').count(),0);assert.ok((await member.locator('[data-v16-chat]').textContent()).includes(text));
 await leader.locator('[data-v16-color]').selectOption('3');await leader.locator('[data-v16-pixel="7"]').click();await confirm(leader,leader.locator('[data-v16-save-emblem]'));assert.equal((await service.read(users[0].token)).guilds.own.emblem[7],3);
 await confirm(leader,leader.locator(`[data-v16-role="officer"][data-v16-target="${users[1].accountId}"]`));await confirm(leader,leader.locator(`[data-v16-role="leader"][data-v16-target="${users[1].accountId}"]`));await refresh(member);assert.equal((await service.read(users[1].token)).guilds.own.role,'leader');
 // Technical fixture for the level gate; actual arena XP is separately exercised by SQL integration.
 await db.pool.query('UPDATE akai_guild_v16_guilds SET xp=100');await db.pool.query('UPDATE akai_guild_v16_world SET revision=revision+1');await refresh(member);await confirm(member,member.locator('[data-v16-upgrade]'));assert.equal((await service.read(users[1].token)).consumer.balances.coin,'1999000000');assert.equal((await service.read(users[1].token)).guilds.own.level,2);
 await member.locator('[data-v16-save-emblem]').click();now+=3000;await refresh(leader);await leader.locator('[data-v16-message]').fill('Concorrência real');await confirm(leader,leader.locator('[data-v16-send]'));
 const staleResponse=member.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/guilds')&&r.request().method()==='POST');await member.locator('[data-v16-confirm]').click();assert.equal((await(await staleResponse).json()).code,'STALE_GUILD_REVISION');await member.locator('[data-v16-status]').filter({hasText:'As guildas mudaram'}).waitFor();await refresh(member);await confirm(member,member.locator('[data-v16-save-emblem]'));
 await refresh(leader);await confirm(leader,leader.locator('[data-v16-leave]'));await refresh(member);await member.locator('[data-v16-player]').selectOption(users[0].accountId);await confirm(member,member.locator('[data-v16-invite]'));await refresh(leader);await confirm(leader,leader.locator(`[data-v16-accept="${guildId}"]`));assert.equal(await leader.locator('[data-v16-message]').count(),1);assert.equal(await leader.locator('[data-v16-chat] [data-v16-chat-id]').count(),0);
 await refresh(member);const leave=await confirm(member,member.locator('[data-v16-leave]'),'rejected');assert.equal(leave.code,'TRANSFER_LEADERSHIP_FIRST');await refresh(leader);await confirm(leader,leader.locator('[data-v16-leave]'));await refresh(member);await confirm(member,member.locator('[data-v16-leave]'));assert.deepEqual((await service.read(users[1].token)).guilds.directory,[]);
 for(const [i,page]of pages.entries()){
  await refresh(page);const dto=await service.read(users[i].token),json=JSON.stringify(dto);for(const user of users)assert.ok(!json.includes(user.run));assert.doesNotMatch(JSON.stringify(dto.guilds),/"(seed|secret|balances|archive|state)":/);assert.deepEqual(await economy.reconcile(users[i].run),[]);
  const legacy=await page.evaluate(async()=>{const r=await fetch('/api/v1/state',{headers:{'X-Akai-Client':'1'}});return r.json();});assert.equal(legacy.snapshot.balances.coin,'0');assert.equal(legacy.snapshot.balances.jade,'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({authenticatedGuildsV16:true,preview,lostResponseReload:true,oneDebit:true,invites:true,rolesTransfer:true,emblem:true,privateLiteralChat:true,reentryPrivacy:true,exactUpgradeCost:true,explicitStaleReview:true,leaveClose:true,redacted:true,legacyUnchanged:true,desktopAndMobile:true}));
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await app?.close();await db?.close();await base.pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await base.close();}
