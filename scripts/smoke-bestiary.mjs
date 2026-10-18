import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {ENEMY_TEMPLATES,enemyDefinition,newLoopState,LocalSnapshotSchema,CONFIG_VERSION,startEncounter} from '../packages/shared/dist/index.js';
const root=fileURLToPath(new URL('../',import.meta.url)),preview=process.argv.includes('--preview'),mode=preview?'preview':'dev';
const req=createRequire(new URL('../apps/client/package.json',import.meta.url));
const child=spawn(process.execPath,[resolve(dirname(req.resolve('vite/package.json')),'bin/vite.js'),...(preview?['preview']:[]),'--host','127.0.0.1','--port','5197','--strictPort'],{cwd:resolve(root,'apps/client'),env:{...process.env,VITE_GAME_MODE:'local'},stdio:'ignore'});
let browser;const errors=[];const templates=[];const evidence=resolve(root,'docs/bestiary');
try{
 const url='http://127.0.0.1:5197';for(let i=0;i<150;i++){try{if((await fetch(url)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,...(process.env.AKAI_CHROMIUM_EXECUTABLE?{executablePath:process.env.AKAI_CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.goto(url);await page.locator('#game[data-load-status=ready]').waitFor();
 const fixture=()=>LocalSnapshotSchema.parse({...newLoopState(),schemaVersion:3,configVersion:CONFIG_VERSION,mode:'local',generation:0,savedAt:Date.now(),lastReconciledAt:Date.now(),profile:{id:'local-test',name:'Playtest'},screen:'battle',activeMs:0,balances:{coin:'0',iron:'0',coal:'0',gold:'0',jade:'0',ruby:'0'}});
 async function seed(s){s.savedAt=s.lastReconciledAt=Date.now();const payload=LocalSnapshotSchema.parse(s),raw=JSON.stringify({formatVersion:1,payload,checksum:createHash('sha256').update(JSON.stringify(payload)).digest('hex')});
 await page.evaluate(async raw=>{const db=await new Promise((res,rej)=>{const q=indexedDB.open('akai-local',1);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error);});await new Promise((res,rej)=>{const tx=db.transaction('snapshots','readwrite');tx.objectStore('snapshots').put(raw,'current');tx.oncomplete=res;tx.onabort=rej;});db.close();},raw);
 await page.reload();await page.locator('#game[data-load-status=ready]').waitFor();}
 await mkdir(resolve(evidence,'screenshots'),{recursive:true});
 for(const t of ENEMY_TEMPLATES){const s=fixture();startEncounter(s,t.minFloor);s.battle.paused=true;
 s.battle.enemies=s.battle.enemies.map(e=>({...e,templateId:t.id,hp:enemyDefinition(s.battle.floor,t.id).hp,maxHp:enemyDefinition(s.battle.floor,t.id).hp}));await seed(s);
 const game=page.locator('#game');assert.deepEqual(JSON.parse(await game.getAttribute('data-enemy-ids')),[t.id,t.id,t.id]);assert.equal(Number(await game.getAttribute('data-contact-gap')),16);
 templates.push({id:t.id,gap:16,textures:Number(await game.getAttribute('data-texture-count')),objects:Number(await game.getAttribute('data-object-count'))});
 if(['slime-green','female-guard','male-orc','archer','shadow','zombie-3'].includes(t.id))await page.screenshot({path:resolve(evidence,'screenshots',`${t.id}-${mode}.png`)});
 }
 assert.equal(new Set(templates.map(t=>t.textures)).size,1);assert.equal(new Set(templates.map(t=>t.objects)).size,1);
 await page.locator('#more').click();await page.getByRole('button',{name:'Bestiário',exact:true}).click();assert.equal(await page.locator('.bestiary-card').count(),27);
 await page.locator('[data-bestiary-floor]').fill('1000');await page.locator('[data-bestiary-floor]').dispatchEvent('change');assert.match(await page.locator('[data-bestiary-note]').textContent(),/999/);
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(evidence,'screenshots',`catalog-${mode}.png`)});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#content').getAttribute('data-view'),'battle');
 const boss=fixture();startEncounter(boss,10);boss.battle.paused=true;await seed(boss);assert.equal(await page.locator('#game').getAttribute('data-contact-gap'),'22');assert.equal(await page.locator('#game').getAttribute('data-enemy-ids'),'["legacy"]');await page.screenshot({path:resolve(evidence,'screenshots',`boss-preserved-${mode}.png`)});
 await page.emulateMedia({reducedMotion:'no-preference'});
 const ranged=fixture();startEncounter(ranged,31);ranged.battle.heroHp=100000;ranged.battle.enemies.forEach(e=>{e.templateId='archer';e.hp=e.maxHp=100000;e.nextAt=2500;});await seed(ranged);
 await page.waitForFunction(()=>Number(document.querySelector('#game').dataset.rangedAttackCount)>0,{timeout:10000});
 assert.deepEqual(errors,[]);await writeFile(resolve(evidence,`browser-${mode}.json`),JSON.stringify({passed:true,mode,templates,bossPreserved:true,rangedAttack:true,pageErrors:errors},null,2)+'\n');console.log(`Bestiary browser passed (${mode}): ${templates.length} templates.`);
}catch(error){console.error({pageErrors:errors,completedTemplates:templates.length});throw error;}finally{await browser?.close();child.kill('SIGTERM');}
