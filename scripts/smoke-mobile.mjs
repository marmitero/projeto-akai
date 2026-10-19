// Android Chromium emulation against the compiled LAN entry point, not localhost dev.
// --loopback-alias uses a fixed-target test proxy when this host has no LAN adapter.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { chooseLanAddress } from './mobile-network.mjs';
import { startMobilePreview } from './mobile-preview.mjs';
const online=process.argv.includes('--online'),alias=process.argv.includes('--loopback-alias');
if(online&&!process.env.TEST_DATABASE_URL)throw Error('Online mobile smoke requires an isolated TEST_DATABASE_URL.');
const ip=alias?'192.168.77.20':chooseLanAddress(),port=5176,origin=`http://${ip}:${port}`;
let preview,browser,proxy,api;const sockets=new Set();
const output=[],errors=[],failedAssets=[],apiResponses=[];
const ready=async(url)=>{for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Not ready: '+url);};
try{
 if(online){
  const {Database}=await import('../apps/server/dist/database.js');const db=new Database(process.env.TEST_DATABASE_URL);await db.migrate();await db.close();
  api=spawn(process.execPath,['apps/server/dist/index.js'],{env:{...process.env,NODE_ENV:'test',DATABASE_URL:process.env.TEST_DATABASE_URL,PUBLIC_ORIGIN:origin,LAN_PREVIEW:'true',HOST:'127.0.0.1',PORT:'3000',COOKIE_SECURE:'false',MONETIZATION_MODE:'off',GOOGLE_CLIENT_ID:undefined,LOG_LEVEL:'silent'},stdio:['ignore','pipe','pipe']});
  api.stderr.on('data',x=>output.push(String(x)));await ready('http://127.0.0.1:3000/health');
 }
 preview=await startMobilePreview({ip,port,mode:online?'online':'local',...(alias?{listenHost:'127.0.0.1'}:{})});
 let proxyOptions;
 if(alias){
  proxy=http.createServer((req,res)=>{
   let url;try{url=new URL(req.url);}catch{res.writeHead(400).end();return;}
   if(url.host!==new URL(origin).host){res.writeHead(403).end();return;}
   const upstream=http.request({hostname:'127.0.0.1',port,path:url.pathname+url.search,method:req.method,headers:req.headers},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
   upstream.on('error',()=>{res.writeHead(502).end();});req.pipe(upstream);
  });
  proxy.on('connect',(req,socket,head)=>{
   if(req.url!==new URL(origin).host){socket.destroy();return;}
   const upstream=net.connect(port,'127.0.0.1',()=>{socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);});
   sockets.add(upstream);sockets.add(socket);upstream.on('error',()=>socket.destroy());socket.on('close',()=>{upstream.destroy();sockets.delete(socket);sockets.delete(upstream);});
  });
  proxy.on('connection',s=>{sockets.add(s);s.once('close',()=>sockets.delete(s));});
  proxy.listen(0,'127.0.0.1');await once(proxy,'listening');proxyOptions={server:`http://127.0.0.1:${proxy.address().port}`};
 }
 browser=await chromium.launch({headless:true,...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1,...(proxyOptions?{proxy:proxyOptions}:{})});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{
  if(r.request().resourceType()==='image'&&r.status()>=400)failedAssets.push(r.url());
  if(r.url().includes('/api/v1/')&&r.request().method()==='POST')apiResponses.push({path:new URL(r.url()).pathname,status:r.status()});
 });
 await page.goto(origin+'/__mobile');assert.equal(await page.locator('img').evaluate(i=>i.naturalWidth),320);assert.equal(await page.locator('img').getAttribute('alt'),'QR Code para abrir o jogo');
 const qrData=await page.locator('img').evaluate(i=>{const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const g=c.getContext('2d');g.drawImage(i,0,0);return {width:c.width,height:c.height,data:Array.from(g.getImageData(0,0,c.width,c.height).data)};});
 if(process.env.AKAI_JSQR_MODULE){const {default:decode}=await import(process.env.AKAI_JSQR_MODULE);assert.equal(decode(new Uint8ClampedArray(qrData.data),qrData.width,qrData.height).data,origin);}
 await Promise.all([page.waitForURL(origin+'/'),page.getByRole('link',{name:'Jogar neste aparelho'}).tap()]);
 await page.waitForLoadState('domcontentloaded');
 const security=await page.evaluate(()=>({secure:isSecureContext,uuid:typeof crypto.randomUUID,subtle:typeof crypto.subtle}));
 assert.deepEqual(security,{secure:false,uuid:'undefined',subtle:'undefined'});
 let recovery;
 if(online){
  await page.locator('#guest-start').tap();await page.getByRole('button',{name:'Guardei a chave. Entrar'}).waitFor();recovery=(await page.locator('#login-message').textContent()).match(/[A-Za-z0-9_-]{43}$/)[0];await page.getByRole('button',{name:'Guardei a chave. Entrar'}).tap();
 }
 await page.locator(`#game[data-load-status=ready]${online?'[data-mode=online]':''}`).waitFor({timeout:30000});
 await page.locator('[data-route=mine]').first().tap();
 for(let i=0;i<3;i++){await page.locator('#mine-target').tap();await page.waitForFunction(n=>document.querySelector('.mine-summary [data-balance=iron]')?.textContent?.trim()===String(n),i+1);}
 if(!online){await page.locator('#more').tap();await page.locator('#save').tap();await page.waitForFunction(()=>!document.querySelector('#save').disabled);}
 await page.reload();await page.locator('#game[data-load-status=ready]').waitFor();await page.locator('[data-route=mine]').first().tap();assert.equal((await page.locator('.mine-summary [data-balance=iron]').textContent()).trim(),'3');
 const layouts=[];
 for(const [width,height] of [[320,640],[360,800],[390,844],[412,915],[844,390]]){
  await page.setViewportSize({width,height});
  for(const route of ['battle','mine','upgrades']){
   await page.locator(`[data-route=${route}]`).first().tap();await page.waitForTimeout(100);
   const box=await page.evaluate(()=>({width:innerWidth,body:document.documentElement.scrollWidth,canvases:document.querySelectorAll('#game canvas').length}));
   assert.ok(box.body<=box.width+1,JSON.stringify({width,height,route,box}));assert.equal(box.canvases,1);layouts.push({width,height,route,...box});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('[data-route=battle]').first().tap();
 await page.screenshot({path:join(tmpdir(),'akai-mobile-battle-390.png')});
 if(online){
  await context.clearCookies();await page.reload();await page.locator('#online-key').fill(recovery);await page.locator('#recover-online button').tap();await page.getByRole('button',{name:'Guardei a chave. Entrar'}).tap();await page.locator('#game[data-load-status=ready]').waitFor();await page.locator('[data-route=mine]').first().tap();assert.equal((await page.locator('.mine-summary [data-balance=iron]').textContent()).trim(),'3');
  assert.ok(apiResponses.some(r=>r.path==='/api/v1/commands'&&r.status===200));
 }
 // No source/environment leak; local mode never proxies to an unrelated API.
 for(const path of ['/.env','/src/main.ts','/@fs/etc/passwd','/package.json'])assert.ok((await context.request.get(origin+path)).status()>=400,path);
 assert.equal((await context.request.get(origin+'/__mobile',{headers:{Origin:'http://evil.test'}})).status(),403);
 if(!online)assert.equal((await context.request.get(origin+'/api/v1/auth/config')).status(),404);
 assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);
 const report={mode:online?'online':'local',transport:alias?'HTTP private-IP origin via fixed loopback test proxy':'bound private LAN interface',security,layouts,apiResponses,pageErrors:errors,failedAssets,physicalAndroidTested:false};
 await mkdir('docs',{recursive:true});await writeFile(`docs/mobile-${online?'online':'local'}-validation.json`,JSON.stringify(report,null,2)+'\n');console.log('AKAI_MOBILE_SMOKE_OK',report.mode);
}finally{
 await browser?.close();await preview?.close();for(const s of sockets)s.destroy();if(proxy)await new Promise(r=>proxy.close(r));if(api){api.kill('SIGTERM');await Promise.race([once(api,'exit'),new Promise(r=>setTimeout(r,3000))]);if(api.exitCode===null)api.kill('SIGKILL');}
 if(output.length)console.error(output.join('').slice(-1000));
}
