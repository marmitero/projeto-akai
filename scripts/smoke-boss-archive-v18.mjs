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
const preview=process.argv.includes('--preview'),port=preview?4193:5193,origin=`http://localhost:${port}`,schema='browser_v18_'+randomUUID().replaceAll('-','');
const base=new Database(process.env.TEST_DATABASE_URL);let db,app,child,browser,now=Date.parse('2026-10-25T23:59:40-03:00');
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
 async function open(page){await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();await page.locator('[data-v13-wallet]').filter({hasText:'Nível 1000'}).waitFor();await page.locator('#authenticated-boss-archive-v18 > summary').click();}
 for(const [i,user]of users.entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1280,height:900}});await context.addCookies([{name:'akai_session',value:user.token,domain:'localhost',path:'/api/v1',httpOnly:true,sameSite:'Strict'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(page);pages.push(page);
 }
 const [leader,member]=pages;
 async function refresh(page){const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/state'));await page.locator('[data-v13-refresh]').click();const dto=await(await response).json();await page.waitForFunction(revisions=>{const el=document.querySelector('#authenticated-seasons-v17');return el?.dataset.runRevision===String(revisions[0])&&el?.dataset.revision===String(revisions[1]);},[dto.revision,dto.seasons.revision]);}
 async function guild(n,action){const s=await service.read(users[n].token);return service.command(users[n].token,{commandId:randomUUID(),expectedRevision:s.revision,guildRevision:s.guilds.revision,action},'guilds');}
 let dto=await service.read(users[0].token);await service.command(users[0].token,{commandId:randomUUID(),expectedRevision:dto.revision,seasonRevision:dto.seasons.revision,action:{type:'sync'}},'seasons');
 assert.equal((await guild(0,{type:'create',name:'Guilda Boss'})).status,'applied');await guild(0,{type:'invite',accountId:users[1].accountId});const gid=(await service.read(users[0].token)).guilds.own.id;await guild(1,{type:'accept',guildId:gid});await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1',[now-2*86400000]);
 const literal='<svg/onload=alert(1)>';await db.pool.query('INSERT INTO akai_profiles(account_id,name,joined_at) VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET name=EXCLUDED.name',[users[0].accountId,literal,now]);await refresh(leader);
 async function uiEvent(page,selector){const type=selector.includes('action="boss"')?'join':selector.includes('action="leave"')?'leave':'sync',response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/events')&&r.request().method()==='POST'&&r.request().postDataJSON().action.type===type);await page.locator(selector).click();const result=await(await response).json();assert.ok(['applied','settling'].includes(result.status),JSON.stringify(result));await refresh(page);return result;}
 await uiEvent(leader,'[data-v13-action="boss"]');assert.ok((await leader.locator('[data-v18-state]').textContent()).includes('Vínculo registrado'));now+=10000;await uiEvent(leader,'#authenticated-boss-archive-v18 [data-v13-action="sync"]');let realmState=await boss.inspect(realm);assert.ok(BigInt(realmState.daily.members[users[0].accountId].damage)>0n);const end=realmState.daily.endMs,date=realmState.daily.date;await uiEvent(leader,'[data-v13-action="leave"]');now=end;await refresh(leader);await leader.locator('[data-v18-state]').filter({hasText:'Fechamento pendente'}).waitFor();
 // Lose the acknowledgement after commit. Subsequent sync/replay must not create another source.
 let lost;await leader.route('**/api/v1/test-v2/events',async route=>{if(lost||route.request().postDataJSON().action.type!=='sync'){await route.continue();return;}lost=route.request().postDataJSON();await route.fetch();await route.abort('failed');});await leader.locator('#authenticated-boss-archive-v18 [data-v13-action="sync"]').click();await leader.locator(`[data-v18-archive="${date}"]`).waitFor();await leader.reload();await leader.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(leader);await leader.locator(`[data-v18-archive="${date}"]`).waitFor();
 const replay=await leader.evaluate(async body=>{const r=await fetch('/api/v1/test-v2/events',{method:'POST',headers:{'X-Akai-Client':'1','Content-Type':'application/json'},body:JSON.stringify(body)});return r.json();},lost);assert.equal(replay.status,'applied');await uiEvent(leader,'#authenticated-boss-archive-v18 [data-v13-action="sync"]');dto=await service.read(users[0].token);const contributor=dto.bossArchive.archives[0].contributors.find(m=>m.accountId===users[0].accountId);assert.ok(contributor.guildXp>0&&contributor.guildXp<=100);assert.equal(dto.guilds.own.xp,String(contributor.guildXp));assert.equal((await db.pool.query('SELECT * FROM akai_guild_v16_credits')).rowCount,1);
 const balances=await Promise.all(users.map(u=>service.read(u.token)));await leader.locator('#authenticated-seasons-v17 > summary').click();await leader.locator('[data-v17-sync]').click();const close=leader.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/seasons')&&r.request().method()==='POST');await leader.locator('[data-v17-confirm]').click();assert.equal((await(await close).json()).status,'applied');await refresh(leader);
 for(const [i,page]of pages.entries()){
  await refresh(page);const s=await service.read(users[i].token);assert.equal(BigInt(s.consumer.balances.coin)-BigInt(balances[i].consumer.balances.coin),300000n);assert.equal(s.seasons.archives[0].boss[0].damage,contributor.damage);const archive=page.locator(`[data-v18-archive="${date}"]`);await archive.locator('summary').click();assert.ok((await archive.textContent()).includes(literal));assert.equal(await archive.locator('svg').count(),0);assert.deepEqual(await economy.reconcile(users[i].run),[]);for(const u of users)assert.ok(!JSON.stringify(s.bossArchive).includes(u.run));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({bossArchiveV18:true,preview,nativeDamage:true,oneGuildXpSource:true,lostResponseReplayReload:true,weeklyBossRanking:true,seasonGuildCoin:true,literalArchive:true,desktopMobile:true,reconciled:true}));
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await app?.close();await db?.close();await base.pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await base.close();}
