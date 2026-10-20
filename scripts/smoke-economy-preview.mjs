import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const preview=process.argv.includes('--preview'),origin='http://127.0.0.1:5196';
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(preview?['preview']:[]),'apps/client','--host','127.0.0.1','--port','5196','--strictPort'],{stdio:'ignore',env:{...process.env,VITE_GAME_MODE:'local'}});
let browser;
try{
 for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 async function ready(){await page.locator('#game[data-load-status=ready]').waitFor();if(await page.locator('#nickname-setup').isVisible()){await page.locator('#starting-name').fill('Economia R6');await page.locator('#nickname-setup button').click();}}
 await page.goto(origin);await ready();await page.locator('#pause-battle').click();
 const balances=await page.locator('.resource-wallet [data-balance]').allTextContents();const modal=page.locator('#economy-preview');
 async function open(){await page.locator('#more').click();await page.locator('#economy-preview-open').click();await modal.waitFor();}
 async function step(){await page.locator('#v6-step').click();await page.waitForFunction(()=>!document.querySelector('#v6-step').disabled);}
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('akai-economy-v6-preview-1')));
 await open();await page.locator('#v6-step').click();await page.waitForFunction(()=>!document.querySelector('#v6-step').disabled);assert.ok((await state()).killSequence>0);
 await page.locator('#economy-preview details summary').click();await page.locator('#v6-scenario').click();
 await page.locator('[data-v6-tab=hero]').click();const before=await state();await page.locator('[data-attribute=force]').click();assert.equal((await state()).economy.attributes.force,1);assert.ok(BigInt((await state()).economy.balances.coin)<BigInt(before.economy.balances.coin));
 await page.locator('[data-v6-tab=gear]').click();await page.locator('#v6-protect').check();const scrolls=(await state()).economy.protection;await page.locator('#v6-refine').click();assert.equal((await state()).economy.protection,scrolls-1);
 await page.locator('[data-v6-tab=battle]').click();await page.locator('#v6-activity').selectOption('iron');await page.locator('#v6-floor').fill('1');await page.locator('#v6-select').click();const huntBefore=await state();await step();const huntAfter=await state();assert.ok(BigInt(huntAfter.economy.balances.iron)>BigInt(huntBefore.economy.balances.iron));assert.equal(huntAfter.economy.balances.coin,huntBefore.economy.balances.coin);assert.equal(huntAfter.economy.protection,huntBefore.economy.protection);
 await page.locator('#v7-duration').selectOption('60000');const offlineBefore=await state();await page.locator('#v7-offline').click();await page.waitForFunction(()=>!document.querySelector('#v7-offline').disabled);const offlineAfter=await state();assert.equal(offlineAfter.offlineJob,null);assert.equal(offlineAfter.economy.offline.usedMs,60000);assert.ok(offlineAfter.killSequence>offlineBefore.killSequence);assert.equal(offlineAfter.economy.balances.coin,offlineBefore.economy.balances.coin);assert.deepEqual(offlineAfter.economy.highest,offlineBefore.economy.highest);
 const saved=await state();await page.locator('[data-v6-close]').click();await page.reload();await ready();await open();assert.deepEqual(await state(),saved);
 const layouts=[];for(const [width,height] of [[320,640],[390,844],[844,390],[1280,800]]){await page.setViewportSize({width,height});const box=await modal.evaluate(e=>({width:e.getBoundingClientRect().width,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}));assert.ok(box.width<=width);assert.ok(box.scrollWidth<=box.clientWidth+1);layouts.push({width,height,...box});}
 await page.setViewportSize({width:390,height:844});await modal.evaluate(e=>e.scrollTop=0);await modal.screenshot({path:'/tmp/akai-r6-preview.png'});
 await page.locator('[data-v6-close]').click();for(let i=0;i<5;i++){await open();await modal.press('Escape');}assert.equal(await modal.count(),1);assert.equal(await page.locator('#game canvas').count(),1);
 assert.deepEqual(await page.locator('.resource-wallet [data-balance]').allTextContents(),balances);assert.deepEqual(errors,[]);
 await writeFile(`docs/economy-preview-${preview?'preview':'dev'}.json`,JSON.stringify({passed:true,fixture:'Isolated local preview, no real-account currency or migration',checks:['starter-fight','train-debit','protected-refine','hunt-material-only','offline-cleared-hunt-material-and-quota','save-reload','production-wallet-unchanged','five-open-close-cycles'],layouts,pageErrors:errors},null,2)+'\n');console.log('Economy preview passed '+(preview?'preview':'dev'));
}finally{await browser?.close();child.kill();}
