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
const preview=process.argv.includes('--preview'),port=preview?4188:5188,origin=`http://localhost:${port}`,schema='browser_v14_'+randomUUID().replaceAll('-','');
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
 async function open(page){await page.locator('#more').click();await page.locator('#authenticated-v13-open').click();await page.locator('[data-v13-wallet]').filter({hasText:'Nível 1000'}).waitFor();await page.locator('#authenticated-market-v14 > summary').click();}
 for(const [i,user]of users.entries()){
  const context=await browser.newContext({viewport:i?{width:390,height:844}:{width:1280,height:900}});await context.addCookies([{name:'akai_session',value:user.token,domain:'localhost',path:'/api/v1',httpOnly:true,sameSite:'Strict'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));await page.goto(origin);await page.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(page);pages.push(page);
 }
 const [seller,buyer]=pages;
 async function refresh(page){const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/state'));await page.locator('[data-v13-refresh]').click();const dto=await(await response).json();await page.waitForFunction(revision=>document.querySelector('#authenticated-market-v14')?.dataset.revision===String(revision),dto.revision);}
 async function confirm(page,trigger,status='applied'){
  await trigger.click();await page.locator('[data-v14-review]:visible').waitFor();
  const response=page.waitForResponse(r=>r.url().endsWith('/api/v1/test-v2/market')&&r.request().method()==='POST');await page.locator('[data-v14-confirm]').click();const body=await(await response).json();assert.equal(body.status,status,JSON.stringify(body));await page.waitForFunction(()=>document.querySelector('[data-v14-retry]').hidden);await refresh(page);return body;
 }
 async function list(page,asset,price='200000,001'){
  await page.locator('[data-v14-asset]').selectOption(asset);await page.locator('[data-v14-price]').fill(price);return confirm(page,page.locator('[data-v14-list]'));
 }
 const itemId=users[0].accountId+'/market-item',original=(await service.read(users[0].token)).consumer.inventory.find(i=>i.id===itemId);
 const listed=await list(seller,itemId);await refresh(buyer);
 const before=(await market.inspect(marketRealm)).book.trades.length;
 // Commit the purchase but lose its response. Reload must resend exactly the persisted intent.
 let lostBody;await buyer.route('**/api/v1/test-v2/market',async route=>{lostBody=route.request().postDataJSON();await route.fetch();await route.abort('failed');},{times:1});
 await buyer.locator(`[data-listing-id="${listed.listingId}"] [data-v14-action="buy"]`).click();await buyer.locator('[data-v14-confirm]').click();await buyer.locator('[data-v14-status]').filter({hasText:'Resposta não confirmada'}).waitFor();
 assert.equal((await market.inspect(marketRealm)).book.trades.length,before+1);await buyer.reload();await buyer.waitForFunction(()=>!!document.querySelector('#game[data-mode=online][data-load-status=ready]'));await open(buyer);await buyer.locator('[data-v14-status]').filter({hasText:'Operação confirmada'}).waitFor();
 assert.equal((await market.inspect(marketRealm)).book.trades.length,before+1);assert.equal((await db.pool.query('SELECT count(*)::int n FROM akai_market_v2_commands WHERE run_id=$1 AND command_id=$2',[users[1].run,lostBody.commandId])).rows[0].n,1);assert.deepEqual((await service.read(users[1].token)).consumer.inventory.find(i=>i.id===itemId),original);
 const resale=await list(buyer,itemId,'210000');await refresh(seller);await seller.locator('[data-v14-price]').fill('190000,001');
 const offer=()=>seller.locator(`[data-listing-id="${resale.listingId}"] [data-v14-action="offer"]`);
 await confirm(seller,offer());await refresh(buyer);await confirm(buyer,buyer.locator('[data-v14-action="offer.reject"]'));
 await refresh(seller);await confirm(seller,offer());await confirm(seller,seller.locator('[data-v14-action="offer.withdraw"]'));
 await confirm(seller,offer());await refresh(buyer);await confirm(buyer,buyer.locator('[data-v14-action="offer.accept"]'));assert.deepEqual((await service.read(users[0].token)).consumer.inventory.find(i=>i.id===itemId),original);
 await refresh(seller); // The counterpart's accepted offer changed this account's revision; review fresh data before a new listing.
 const cancel=await list(seller,'resource:iron','1000');await confirm(seller,seller.locator(`[data-listing-id="${cancel.listingId}"] [data-v14-action="cancel"]`));await confirm(seller,seller.locator(`[data-listing-id="${cancel.listingId}"] [data-v14-action="claim"]`));await seller.locator('[data-v14-asset]').selectOption('resource:iron');await seller.locator('[data-v14-price]').fill('1000');const rejected=await confirm(seller,seller.locator('[data-v14-list]'),'rejected');assert.equal(rejected.code,'RELIST_COOLDOWN');
 // Explicitly assert the rejection receipt instead of accepting a helper failure as evidence.
 const cooldown=(await market.inspect(marketRealm)).book.listings.length;assert.equal(cooldown,3);
 const expired=await list(seller,'resource:coal','1000');now+=73*3600000;await refresh(seller);await confirm(seller,seller.locator(`[data-listing-id="${expired.listingId}"] [data-v14-action="claim"]`));
 for(const [i,page]of pages.entries()){
  await refresh(page);const dto=await service.read(users[i].token);const json=JSON.stringify(dto);for(const user of users)assert.ok(!json.includes(user.run));assert.ok(!json.includes(marketRealm));assert.doesNotMatch(json,/"(seed|secret|runs|sessions|offlineJob|archive)":/);assert.deepEqual(await economy.reconcile(users[i].run),[]);
  const legacy=await page.evaluate(async()=>{const r=await fetch('/api/v1/state',{headers:{'X-Akai-Client':'1'}});return r.json();});assert.equal(legacy.snapshot.balances.coin,'0');assert.equal(legacy.snapshot.balances.jade,'0');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({authenticatedMarketV14:true,preview,exactItem:true,lostResponseReload:true,oneTrade:true,offers:true,cancelClaim:true,expiry:true,redacted:true,legacyUnchanged:true,desktopAndMobile:true}));
}finally{await browser?.close();if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(r=>child.once('exit',r));}await app?.close();await db?.close();await base.pool.query('DROP SCHEMA IF EXISTS '+schema+' CASCADE');await base.close();}
