// Counterfactual lab only. Disposable adapters do not replace native modules or save real accounts.
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),schedule=args.schedule??'casual',seed=Number(args.seed??4213),days=Number(args.days??120),mode=args.mode??'calendar';
assert.ok(['best','regular','casual'].includes(schedule));assert.ok(['calendar','zero'].includes(mode));assert.ok(Number.isInteger(days)&&days>=1&&days<=120);
const root='docs/plans/hunts-builds/progression-bonus-v20/campaigns',id=randomUUID(),kernel=resolve('packages/shared/dist/.v21-kernel-'+id+'.mjs'),offline=resolve('packages/shared/dist/.v21-offline-'+id+'.mjs'),policy=resolve('scripts/economy-v2/.v21-policy-'+id+'.mjs'),files=[kernel,offline,policy];
const sha=x=>createHash('sha256').update(x).digest('hex'),native=await readFile('packages/shared/dist/economy-run-v6.js','utf8'),off=await readFile('packages/shared/dist/offline-v7.js','utf8'),controller=await readFile('scripts/economy-v2/campaign-policy.mjs','utf8'),model=await readFile('packages/shared/src/progression-bonus-v20/index.ts','utf8'),source=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8'));
const a=native.indexOf('function mastery('),b=native.indexOf('function grant(',a);assert.ok(a>=0&&b>a,'NATIVE_ADAPTER_CHANGED');
const helper=`\nimport {quoteMasterySegmentsV20} from './progression-bonus-v20/index.js';
const v21Start=Date.parse('2026-10-19T03:00:00Z'),v21Day=86400000,v21Mode=${JSON.stringify(mode)};
function v21Segments(from,to,offline){const segments=[];let cursor=from;while(cursor<to){const day=Math.floor((cursor-v21Start)/v21Day),start=v21Start+day*v21Day,hour=(cursor-start)/3600000;const guild=cursor>=v21Start+7*v21Day?1000:0,event=!offline&&hour>=12&&hour<18?3000:0;const end=Math.min(to,...[start+12*3600000,start+18*3600000,start+v21Day,v21Start+7*v21Day].filter(t=>t>cursor));segments.push({ms:end-cursor,bonusBps:v21Mode==='zero'?0:guild+event});cursor=end;}return segments;}
`;
const replacement=`function mastery(s,combatMs,activity,floor,reference){if(s.economy.masteryMs===ECONOMY_XP_V2[999]){s.xpCarry=0;return 0;}const end=s.encounter.combat.clockMs,segments=v21Segments(end-combatMs,end,!!s.offlineJob),q=quoteMasterySegmentsV20({masteryMs:s.economy.masteryMs,carry:s.xpCarry,qualifiedMs:combatMs,reference,segments},level=>benchmark(level,activity,floor));s.economy.masteryMs=q.masteryMs;s.xpCarry=q.carry;return q.gainedMs;}\n`;
try{
 await mkdir(root,{recursive:true});await writeFile(kernel,helper+native.slice(0,a)+replacement+native.slice(b));await writeFile(offline,off.replace("'./economy-run-v6.js'",JSON.stringify('./'+basename(kernel))));
 const imports=`\nimport {advanceRunV6} from ${JSON.stringify(pathToFileURL(kernel).href)};\nimport {beginOfflineV7,drainOfflineV7} from ${JSON.stringify(pathToFileURL(offline).href)};\n`;
 await writeFile(policy,controller.replace('initialRunV6,advanceRunV6,','initialRunV6,').replace('beginOfflineV7,drainOfflineV7,','')+imports);
 const {initialCampaign,campaignDay}=await import(pathToFileURL(policy).href),name=`${schedule}-swift-${seed}-${mode}`,checkpoint=resolve(root,name+'.checkpoint.json');let c;
 const provenance={adapterHash:sha(await readFile(new URL(import.meta.url))),version:'progression-counterfactual-v21-1',originalSourceHash:source.sourceHash,nativeHash:sha(native),offlineHash:sha(off),controllerHash:sha(controller),modelHash:sha(model),mode,schedule,seed,entitlement:'Counterfactual stable eligible rank1 guild beginning day8; event12–18 online only. No acquired guild history, no social Coin grants or live migration.'};
 if(args.resume==='true'){c=JSON.parse(await readFile(checkpoint,'utf8'));assert.deepEqual(c.v21,provenance,'CHECKPOINT_SOURCE_CHANGED');}else{c=initialCampaign({seed,schedule,build:'swift'});c.version='progression-counterfactual-v21-1';c.v21=provenance;}
 const baseline=JSON.parse(gunzipSync(await readFile(`docs/plans/hunts-builds/campaign-v10/samples/${schedule}-swift-${seed}.json.gz`)));
 while(c.day<days){const row=campaignDay(c);if(mode==='zero')assert.deepEqual(row,baseline.rows[c.day-1],'ZERO_BONUS_BASELINE_DIVERGED');await writeFile(checkpoint,JSON.stringify(c)+'\n');console.log(JSON.stringify({schedule,mode,day:c.day,level:row.level,floor:row.highest.main,masteryMs:row.masteryMs,maxDay:c.firstMaxDay,towerDay:c.firstTower1000Day,attackEvents:c.attackEvents}));}
 assert.ok(c.run.economy.masteryMs<=c.activeFarmMs+c.offlineMs);if(c.firstMaxDay!==null)assert.ok(c.firstMaxDay>=96);
 const report={...provenance,days:c.day,qualifiedMinimumDays:96,level:c.rows.at(-1).level,highest:c.run.economy.highest,firstMaxDay:c.firstMaxDay,firstTower1000Day:c.firstTower1000Day,censored:c.firstMaxDay===null,attackEvents:c.attackEvents,timeMs:{activeFarm:c.activeFarmMs,offline:c.offlineMs,events:c.eventMs,idle:c.idleMs},gross:c.gross,spent:c.spent,balances:c.run.economy.balances,earnedScrolls:c.earnedScrolls,spentScrolls:c.spentScrolls,checkpointSha256:sha(JSON.stringify(c)+'\n'),rows:c.rows.map(r=>({day:r.day,level:r.level,masteryMs:r.masteryMs,highest:r.highest})),integrityPassed:true,balanceApproved:false,activationReady:false,runtimeEnabled:false};
 await writeFile(resolve(root,name+'.json.gz'),gzipSync(Buffer.from(JSON.stringify(c)+'\n'),{level:9}));await writeFile(resolve(root,name+'.results.json'),JSON.stringify(report,null,2)+'\n');await unlink(checkpoint);console.log(JSON.stringify({finished:true,schedule,mode,days:c.day,maxDay:c.firstMaxDay,towerDay:c.firstTower1000Day,censored:report.censored}));
}finally{await Promise.all(files.map(f=>unlink(f).catch(()=>{})));}
