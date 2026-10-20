import {spawn} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const preview=process.argv.includes('--preview'),origin='http://127.0.0.1:5198';
const child=spawn(process.execPath,['node_modules/vite/bin/vite.js',...(preview?['preview']:[]),'apps/client','--host','127.0.0.1','--port','5198','--strictPort'],{stdio:'ignore',env:{...process.env,VITE_GAME_MODE:'local'}});
let browser;
try{
 for(let i=0;i<150;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.locator('#game[data-load-status=ready]').waitFor();
 if(await page.locator('#nickname-setup').isVisible()){await page.locator('#starting-name').fill('Teste R3');await page.locator('#nickname-setup button').click();}
 await page.locator('#pause-battle').click();
 const balances=await page.locator('.resource-wallet [data-balance]').allTextContents();
 async function open(){await page.locator('#more').click();await page.locator('#combat-lab-open').click();await page.locator('#combat-lab').waitFor();}
 await open();
 await page.locator('#combat-lab [name=level]').fill('1000');await page.locator('#combat-lab [name=level]').dispatchEvent('change');
 await page.locator('#combat-lab [name=gear]').selectOption('legendary20');
 await page.locator('#combat-lab [name=enemy]').selectOption('shadow');
 await page.locator('#combat-lab-form button[type=submit]').click();
 assert.ok((await page.locator('#lab-stats').textContent()).includes('mágico'));
 assert.ok(await page.locator('#lab-hits li').count()>0);
 const first=await page.locator('#lab-hits').textContent();
 await page.locator('#combat-lab-form button[type=submit]').click();assert.equal(await page.locator('#lab-hits').textContent(),first);
 await page.locator('#combat-lab [name=floor]').fill('100');await page.locator('#combat-lab-form button[type=submit]').click();
 assert.ok((await page.locator('#lab-status').textContent()).includes('BOSS_CONTENT_RESERVED'));
 await page.locator('#combat-lab [name=floor]').fill('101');await page.locator('#combat-lab details summary').click();
 await page.locator('[data-lab-attribute=force]').fill('1000');await page.locator('[data-lab-attribute=vitality]').fill('1000');await page.locator('[data-lab-attribute=physical]').fill('1000');await page.locator('[data-lab-attribute=magic]').fill('1000');await page.locator('[data-lab-attribute=luck]').fill('1000');await page.locator('[data-lab-attribute=dexterity]').fill('1000');
 await page.locator('#combat-lab-form button[type=submit]').click();assert.ok((await page.locator('#lab-status').textContent()).includes('BUDGET'));
 await page.locator('#lab-preset').click();
 const layouts=[];
 for(const [width,height] of [[320,640],[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});
  const box=await page.locator('#combat-lab').evaluate(d=>({width:d.getBoundingClientRect().width,scrollWidth:d.scrollWidth,clientWidth:d.clientWidth,scrollHeight:d.scrollHeight,clientHeight:d.clientHeight}));
  assert.ok(box.width<=width);assert.ok(box.scrollWidth<=box.clientWidth+1);layouts.push({width,height,...box});
 }
 await page.locator('[data-lab-close]').click();
 for(let i=0;i<5;i++){await open();await page.locator('#combat-lab').press('Escape');}
 assert.equal(await page.locator('#combat-lab').count(),1);assert.equal(await page.locator('#game canvas').count(),1);
 assert.deepEqual(await page.locator('.resource-wallet [data-balance]').allTextContents(),balances);assert.deepEqual(errors,[]);
 await writeFile(`docs/combat-lab-${preview?'preview':'dev'}.json`,JSON.stringify({passed:true,fixture:'Synthetic equal-point builds, no production resource gains',checks:['deterministic-result','magical-enemy','boss-reserved','budget-error','resource-wallet-unchanged','five-open-close-cycles'],layouts,pageErrors:errors},null,2)+'\n');
 console.log('Combat lab smoke passed '+(preview?'preview':'dev'));
}finally{await browser?.close();child.kill();}
