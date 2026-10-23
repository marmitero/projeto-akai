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
const preview=process.argv.includes('--preview'),port=preview?4194:5194,origin=`http://localhost:${port}`,schema='browser_v19_'+randomUUID().replaceAll('-','');
const base=new Database(process.env.TEST_DATABASE_URL);let db,app,child,browser,now=Date.parse('2026-10-21T18:00:00-03:00');
try{
 await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(process.env.TEST_DATABASE_URL);u.searchParams.set('options','-csearch_path='+schema);db=new Database(u.toString());await db.migrate();
 const online=new OnlineService(db,()=>now),economy=new EconomyRehearsalService(db,()=>now),boss=new BossEventsV8Service(db,()=>now),service=new AuthenticatedV13Service(online),users=[];
 for(let i=0;i<4;i++){
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
 async function open(page){await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();await page.locator('[data-v13-wallet]').filter({hasText:'Nível 1000'}).waitFor();await page.locator('#authenticated-guild-wars-v19 > summary').click();}
 for(const [i,user]of [users[0],users[2]].entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1280,height:900}});await context.addCookies([{name:'akai_session',value:user.token,domain:'localhost',path:'/api/v1',httpOnly:true,sameSite:'Strict'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(page);pages.push(page);
 }
 const [leader,other]=pages;
 async function refresh(page){const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/state'));await page.locator('[data-v13-refresh]').click();const dto=await(await response).json();await page.waitForFunction(revisions=>{const el=document.querySelector('#authenticated-guild-wars-v19');return el?.dataset.runRevision===String(revisions[0])&&el?.dataset.revision===String(revisions[1]);},[dto.revision,dto.wars.revision]);return dto;}
 async function action(page,type){await page.locator(`[data-v19-${type}]`).click();await page.locator('[data-v19-review]:visible').waitFor();const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/wars')&&r.request().method()==='POST');await page.locator('[data-v19-confirm]').click();const result=await(await response).json();assert.equal(result.status,'applied',JSON.stringify(result));await refresh(page);return result;}
 async function guild(n,action){const v=await service.read(users[n].token);return service.command(users[n].token,{commandId:randomUUID(),expectedRevision:v.revision,guildRevision:v.guilds.revision,action},'guilds');}
 for(const [a,b,name]of [[0,1,'Primeira Guerra'],[2,3,'Segunda Guerra']]){assert.equal((await guild(a,{type:'create',name})).status,'applied');await guild(a,{type:'invite',accountId:users[b].accountId});await guild(b,{type:'accept',guildId:(await service.read(users[a].token)).guilds.own.id});}
 // Explicit age fixture; social acquisition/playtest remains a separate gate.
 await db.pool.query('UPDATE akai_guild_v16_members SET joined_at=$1',[now-86400000]);const literal='<svg/onload=alert(1)>';await db.pool.query('INSERT INTO akai_profiles(account_id,name,joined_at) VALUES($1,$2,$3) ON CONFLICT(account_id) DO UPDATE SET name=EXCLUDED.name',[users[0].accountId,literal,now]);
 await refresh(leader);await action(leader,'enroll');await refresh(other);await action(other,'enroll');let w=(await service.read(users[0].token)).wars;now=w.open;await refresh(leader);await leader.locator('[data-v19-state]').filter({hasText:'Abertura pendente'}).waitFor();await action(leader,'sync');await action(leader,'attack');await refresh(other);await action(other,'attack');
 const before=await Promise.all(users.map(u=>service.read(u.token)));now=w.close;await refresh(leader);await leader.locator('[data-v19-state]').filter({hasText:'Fechamento pendente'}).waitFor();let lost;
 await leader.route('**/api/v1/test-v2/wars',async route=>{lost=route.request().postDataJSON();await route.fetch();await route.abort('failed');},{times:1});await leader.locator('[data-v19-sync]').click();await leader.locator('[data-v19-confirm]').click();await leader.locator('[data-v19-status]').filter({hasText:'Resposta não confirmada'}).waitFor();assert.equal((await db.pool.query('SELECT * FROM akai_war_v19_archives')).rowCount,1);
 await leader.reload();await leader.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(leader);await leader.locator('[data-v19-status]').filter({hasText:'Guerra atualizada'}).waitFor();await refresh(leader);assert.equal((await db.pool.query('SELECT * FROM akai_war_v19_commands WHERE account_id=$1 AND command_id=$2',[users[0].accountId,lost.commandId])).rowCount,1);
 for(const [i,page]of pages.entries()){await refresh(page);const userIndex=i?2:0,dto=await service.read(users[userIndex].token),reward=dto.wars.rewards[0];assert.ok(reward);assert.equal(BigInt(dto.consumer.balances.coin)-BigInt(before[userIndex].consumer.balances.coin),BigInt(reward.coin));const archive=page.locator(`[data-v19-archive="${w.seasonId}"]`);await archive.locator('summary').click();assert.ok((await archive.textContent()).includes(literal));assert.equal(await archive.locator('svg').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);for(const u of users)assert.ok(!JSON.stringify(dto.wars).includes(u.run));}
 for(const [i,u]of users.entries()){assert.deepEqual(await economy.reconcile(u.run),[]);if(i%2)assert.deepEqual((await service.read(u.token)).wars.rewards,[]);}
 await action(other,'sync');assert.equal((await db.pool.query('SELECT * FROM akai_war_v19_rewards')).rowCount,2);assert.deepEqual(errors,[]);console.log(JSON.stringify({authenticatedGuildWarsV19:true,preview,nativeDuels:true,lostResponseReloadReplay:true,onlyAttackersPaid:true,literalArchive:true,desktopMobile:true,reconciled:true}));
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await app?.close();await db?.close();await base.pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await base.close();}
