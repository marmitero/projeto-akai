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
import {BossEventsV8Service} from '../apps/server/dist/boss-events-v8.js';
import {AuthenticatedV13Service} from '../apps/server/dist/authenticated-v13.js';
import {buildServer} from '../apps/server/dist/app.js';
import {parseServerConfig} from '../apps/server/dist/config.js';
import {presetBuildV3} from '../packages/shared/dist/index.js';
if(!process.env.TEST_DATABASE_URL)throw Error('TEST_DATABASE_URL must be isolated');
const preview=process.argv.includes('--preview'),port=preview?4187:5187,origin=`http://localhost:${port}`,schema='browser_v13_'+randomUUID().replaceAll('-','');
const base=new Database(process.env.TEST_DATABASE_URL);let db,app,child,browser,now=Date.parse('2026-10-21T18:00:00-03:00');
try{
 await base.pool.query('CREATE SCHEMA '+schema);const u=new URL(process.env.TEST_DATABASE_URL);u.searchParams.set('options','-csearch_path='+schema);db=new Database(u.toString());await db.migrate();
 const online=new OnlineService(db,()=>now),economy=new EconomyRehearsalService(db,()=>now),boss=new BossEventsV8Service(db,()=>now),service=new AuthenticatedV13Service(online),users=[];
 for(let i=0;i<2;i++){
  const user=await online.guest(),run=(await economy.stage(user.accountId,randomUUID())).id,row=await economy.inspect(run),e=presetBuildV3(1000,'swift','legendary20');e.accountId=user.accountId;e.highest.main=1000;e.economicThroughMs=now;
  for(const item of e.inventory){const old=item.id;item.id=user.accountId+'/'+old;item.enhancement=15;for(const key of Object.keys(e.equipped))if(e.equipped[key]===old)e.equipped[key]=item.id;}
  row.state.economy=e;row.state.paused=true;await db.pool.query('UPDATE akai_economy_rehearsals SET state=$2 WHERE id=$1',[run,row.state]);await db.pool.query("INSERT INTO akai_economy_rehearsal_ledger VALUES($1,0,'masteryMs',$2,$2)",[run,String(e.masteryMs)]);users.push({...user,run});
 }
 const realm=(await boss.stage(users.map(x=>x.run),randomUUID())).id;await service.bindWorld(realm);
 app=buildServer(parseServerConfig({DATABASE_URL:u.toString(),PUBLIC_ORIGIN:origin,V13_HTTP_TEST:'true',V13_TEST_DATABASE:'true'}),false,{service:online});await app.listen({host:'127.0.0.1',port:3000});
 const require=createRequire(new URL('../apps/client/package.json',import.meta.url)),vite=resolve(dirname(require.resolve('vite/package.json')),'bin/vite.js');let output='';
 child=spawn(process.execPath,[vite,...(preview?['preview']:[]),'apps/client','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_GAME_MODE:'online'},stdio:['ignore','pipe','pipe']});child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);
 let ready=false;for(let i=0;i<150;i++){try{if((await fetch(origin)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert.ok(ready,output.slice(-1500));
 browser=await chromium.launch({...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const pages=[],errors=[];
 for(const [i,user]of users.entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1280,height:900}});await context.addCookies([{name:'akai_session',value:user.token,domain:'localhost',path:'/api/v1',httpOnly:true,sameSite:'Strict'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));
  await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();await page.locator('[data-v13-wallet]').filter({hasText:'Nível 1000'}).waitFor();await page.locator('[data-v13-action="boss"]').click();await page.waitForFunction(()=>document.querySelector('[data-v13-status]')?.textContent==='Atualizado.');pages.push(page);
 }
 const book=await boss.inspect(realm);book.daily.hp=1;await db.pool.query('UPDATE akai_boss_v8_realms SET state=$2 WHERE id=$1',[realm,book]);now+=10000;
 await pages[0].locator('[data-v13-action="sync"]').click();await pages[0].locator('[data-v13-broadcast]').filter({hasText:'250 jade'}).waitFor();await pages[1].locator('[data-v13-refresh]').click();await pages[1].locator('[data-v13-broadcast]').filter({hasText:'250 jade'}).waitFor();
 assert.equal(await pages[0].locator('[data-v13-broadcast]').innerText(),await pages[1].locator('[data-v13-broadcast]').innerText());
 for(const page of pages)await page.locator('[data-v13-close]').click();
 // Accelerated server clock belongs only to this synthetic test process, not an HTTP field.
 for(let i=0;i<62;i++){now+=10000;for(const user of users){const view=await service.read(user.token);const r=await service.command(user.token,{commandId:randomUUID(),expectedRevision:view.revision,action:{type:'heartbeat'}});assert.equal(r.status,'applied');}}
 for(const [i,page]of pages.entries()){
  await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();
  await page.locator('[data-v13-refresh]').click();await page.waitForFunction(()=>!document.querySelector('[data-v13-wallet]')?.textContent?.includes('Jade 0'));
  const dto=await page.evaluate(async()=>{const r=await fetch('/api/v1/test-v2/state',{headers:{'X-Akai-Client':'1'}});return r.json();});assert.equal(dto.consumer.accountId,users[i].accountId);assert.ok(BigInt(dto.consumer.balances.jade)>=3000n);assert.doesNotMatch(JSON.stringify(dto),/"(seed|secret|runs|sessions|offlineJob|archive)":/);
  const legacy=await page.evaluate(async()=>{const r=await fetch('/api/v1/state',{headers:{'X-Akai-Client':'1'}});return r.json();});assert.equal(legacy.snapshot.balances.jade,'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.deepEqual(await economy.reconcile(users[i].run),[]);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({authenticatedV13:true,preview,twoSessionsOneWorld:true,oneBroadcast:true,redacted:true,isolatedJade:true,desktopAndMobile:true}));
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await app?.close();await db?.close();await base.pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await base.close();}
