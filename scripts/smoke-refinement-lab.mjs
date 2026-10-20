import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {initialEconomyV2,ECONOMY_XP_V2,refineItemV5} from '../packages/shared/dist/index.js';
const preview=process.argv.includes('--preview'),origin='http://127.0.0.1:5197';
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(preview?['preview']:[]),'apps/client','--host','127.0.0.1','--port','5197','--strictPort'],{stdio:'ignore',env:{...process.env,VITE_GAME_MODE:'local'}});
let browser;
function findSeed(n,outcome,protect=false){
 const s=initialEconomyV2('00000000-0000-4000-8000-000000000001',0);s.masteryMs=ECONOMY_XP_V2[999];Object.assign(s.inventory[0],{rarity:'legendary',level:50,enhancement:n});s.protection=1000;for(const k of Object.keys(s.balances))s.balances[k]='1000000000000000';
 for(let seed=1;seed<20000;seed++)if(refineItemV5(s,{itemId:s.inventory[0].id,expectedRevision:0,protect},seed).receipt.outcome===outcome)return seed;
 throw Error('Missing outcome fixture');
}
try{
 for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('#game[data-load-status=ready]').waitFor();
 if(await page.locator('#nickname-setup').isVisible()){await page.locator('#starting-name').fill('Refino R5');await page.locator('#nickname-setup button').click();}
 await page.locator('#pause-battle').click();const balances=await page.locator('.resource-wallet [data-balance]').allTextContents();
 const modal=page.locator('#refinement-lab'),field=n=>modal.locator(`[name=${n}]`),submit=modal.locator('[type=submit]');
 async function open(){await page.locator('#more').click();await page.locator('#refinement-lab-open').click();await modal.waitFor();}
 async function configure(n,seed,protect=false){await field('rarity').selectOption('legendary');await field('enhancement').fill(String(n));await field('enhancement').dispatchEvent('change');await field('seed').fill(String(seed));await field('seed').dispatchEvent('change');if(n>=7)await field('protect').setChecked(protect);}
 await open();
 await configure(7,4213,true);assert.ok((await page.locator('#refine-quote').textContent()).includes('Quebra por tentativa 0%'));
 assert.ok((await page.locator('#refine-warning').textContent()).includes('consumido no sucesso'));
 const walletBefore=await page.locator('#refine-wallet').textContent();await submit.click();assert.ok((await page.locator('#refine-status').textContent()).includes('Sucesso'));
 assert.ok((await page.locator('#refine-wallet').textContent()).includes('999 pergaminhos'));assert.notEqual(await page.locator('#refine-wallet').textContent(),walletBefore);
 const first=await page.locator('#refine-status').textContent();await configure(7,4213,true);await submit.click();assert.equal(await page.locator('#refine-status').textContent(),first);
 const cases=[];
 for(const [n,outcome,protect,label] of [[0,'maintained',false,'nível mantido'],[7,'destroyed',false,'item quebrado'],[7,'regressed',true,'perdeu 1 nível'],[12,'destroyed',false,'item quebrado']]){
  const seed=findSeed(n,outcome,protect);await configure(n,seed,protect);await submit.click();const status=await page.locator('#refine-status').textContent();assert.ok(status.includes(label));if(outcome==='destroyed')assert.ok(await submit.isDisabled());cases.push({n,outcome,protect,seed,status});
 }
 await configure(15,4213,true);assert.ok(await submit.isDisabled());assert.ok((await page.locator('#refine-warning').textContent()).includes('boss diário de Jade'));
 await field('rarity').selectOption('common');assert.ok(await submit.isDisabled());assert.ok((await page.locator('#refine-warning').textContent()).includes('LEGENDARY_REQUIRED'));
 await configure(7,4213,true);
 const layouts=[];for(const [width,height] of [[320,640],[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});const box=await modal.evaluate(e=>({width:e.getBoundingClientRect().width,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth}));assert.ok(box.width<=width);assert.ok(box.scrollWidth<=box.clientWidth+1);layouts.push({width,height,...box});
 }
 await page.setViewportSize({width:390,height:844});await modal.evaluate(e=>e.scrollTop=0);await modal.screenshot({path:'/tmp/akai-r5-lab.png'});
 await page.locator('[data-refine-close]').click();for(let i=0;i<5;i++){await open();await modal.press('Escape');}
 assert.equal(await modal.count(),1);assert.equal(await page.locator('#game canvas').count(),1);assert.deepEqual(await page.locator('.resource-wallet [data-balance]').allTextContents(),balances);assert.deepEqual(errors,[]);
 await writeFile(`docs/refinement-lab-${preview?'preview':'dev'}.json`,JSON.stringify({passed:true,fixture:'Synthetic item/wallet only; no real grants or debits',checks:['protected-success-debits-scroll','deterministic-reset','all-failure-kinds','high-range-locked','rarity-cap','wallet-unchanged','five-open-close-cycles'],cases,layouts,pageErrors:errors},null,2)+'\n');console.log('Refinement lab passed '+(preview?'preview':'dev'));
}finally{await browser?.close();child.kill();}
