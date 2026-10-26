// Disposable observer adapter, with fail-closed source anchors; never modifies repository/native modules.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createTraceV24} from './progression-trace-v24.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
export function replaceOnceV24(source,anchor,replacement){assert.equal(source.split(anchor).length,2,'TRACE_SOURCE_ANCHOR_CHANGED: '+anchor);return source.replace(anchor,replacement);}
export async function createAdapterV24({mode='calendar',observe=true,savedTrace,startHour=0}={}){
 assert.ok(['calendar','zero'].includes(mode));assert.ok([0,12,20].includes(startHour));const id=randomUUID(),kernel=resolve(`packages/shared/dist/.v24-kernel-${id}.mjs`),offline=resolve(`packages/shared/dist/.v24-offline-${id}.mjs`),policy=resolve(`scripts/economy-v2/.v24-policy-${id}.mjs`),files=[kernel,offline,policy];
 const dispose=()=>Promise.all(files.map(f=>unlink(f).catch(e=>{if(e.code!=='ENOENT')throw e;})));
 const native=await readFile('packages/shared/dist/economy-run-v6.js','utf8'),off=await readFile('packages/shared/dist/offline-v7.js','utf8'),controller=await readFile('scripts/economy-v2/campaign-policy.mjs','utf8');
 const shiftedController=replaceOnceV24(controller,"START=Date.parse('2026-10-19T03:00:00Z')","START=Date.parse('2026-10-19T03:00:00Z')+"+(startHour*3600000));
 const sources={windowPolicyHash:sha(shiftedController),nativeHash:sha(native),offlineHash:sha(off),controllerHash:sha(controller),modelHash:sha(await readFile('packages/shared/src/progression-bonus-v22/index.ts')),factoryHash:sha(await readFile(new URL(import.meta.url))),observerHash:sha(await readFile(new URL('./progression-trace-v24.mjs',import.meta.url)))};
 const a=native.indexOf('function mastery('),b=native.indexOf('function grant(',a);assert.ok(a>=0&&b>a,'NATIVE_ADAPTER_CHANGED');
 // World calendar/rates remain V22. Only the disposable controller creation clock is shifted.
 // The zero arm grants mastery with the original native function, not a V22 quote.
 const helper=`\nimport {quoteMasterySegmentsV22} from './progression-bonus-v22/index.js';
export let observerV23=null;export function setObserverV23(value){observerV23=value;}
const v22Start=Date.parse('2026-10-19T03:00:00Z'),v22Day=86400000,v22Mode=${JSON.stringify(mode)};
function v22Segments(from,to,offline){const segments=[];let cursor=from;while(cursor<to){const day=Math.floor((cursor-v22Start)/v22Day),start=v22Start+day*v22Day,hour=(cursor-start)/3600000;const guild=cursor>=v22Start+7*v22Day?1000:0,event=!offline&&hour>=12&&hour<18?3000:0;const end=Math.min(to,...[start+12*3600000,start+18*3600000,start+v22Day,v22Start+7*v22Day].filter(t=>t>cursor));segments.push({ms:end-cursor,bonusBps:v22Mode==='zero'?0:guild+event});cursor=end;}return segments;}
`;
 const candidateMastery=`function originalMasteryV23(s,combatMs,activity,floor,reference){if(s.economy.masteryMs===ECONOMY_XP_V2[999]){s.xpCarry=0;return 0;}const end=s.encounter.combat.clockMs,segments=v22Segments(end-combatMs,end,!!s.offlineJob),q=quoteMasterySegmentsV22({masteryMs:s.economy.masteryMs,carry:s.xpCarry,qualifiedMs:combatMs,reference,segments},level=>benchmark(level,activity,floor));s.economy.masteryMs=q.masteryMs;s.xpCarry=q.carry;return q.gainedMs;}
function mastery(s,Q,activity,floor,reference){const before={masteryMs:s.economy.masteryMs,carry:s.xpCarry,offline:!!s.offlineJob};const result=originalMasteryV23(s,Q,activity,floor,reference);observerV23?.mastery(before,{masteryMs:s.economy.masteryMs,carry:s.xpCarry,at:s.encounter.combat.clockMs},Q,activity,reference,level=>benchmark(level,activity,floor));return result;}
`;
 const wrapper=candidateMastery.slice(candidateMastery.indexOf('function mastery('));
 const mastery=mode==='zero'?native.slice(a,b).replace('function mastery(','function originalMasteryV23(')+wrapper:candidateMastery;
 let code=helper+native.slice(0,a)+mastery+native.slice(b)+'\nexport {v22Segments as segmentsV24};\n';
 code=replaceOnceV24(code,'function draw(s, key, bound, entropy) {','function originalDrawV23(s, key, bound, entropy) {');
 code=replaceOnceV24(code,'function start(s, at, wave = 1, hp, entropy, frozenStats) {','function start(s, at, wave = 1, hp, entropy, frozenStats) {\n observerV23?.start(s,at,wave);');
 code=replaceOnceV24(code,'e.combatMs += r.state.clockMs - before;','e.combatMs += r.state.clockMs - before;\n observerV23?.combat(s,before,r.state.clockMs);');
 code=replaceOnceV24(code,'export function advanceRunV6(','function originalAdvanceRunV23(');
 code=replaceOnceV24(code,'export function applyEconomyActionV6(','function originalActionV23(');
 code+=`\nfunction draw(s,key,bound,entropy){const before=s.seed;const value=originalDrawV23(s,key,bound,entropy);observerV23?.rng(s,key,bound,before,value);return value;}
export function advanceRunV6(...args){observerV23?.beginAdvance(args[0]);try{const r=originalAdvanceRunV23(...args);observerV23?.endAdvance(r.state);return r;}catch(error){observerV23?.abortAdvance();throw error;}}
export function applyEconomyActionV6(s,action,...rest){const result=originalActionV23(s,action,...rest);observerV23?.action(s,action,result);return result;}
`;
 try{
  await writeFile(kernel,code);await writeFile(offline,replaceOnceV24(off,"'./economy-run-v6.js'",JSON.stringify('./'+basename(kernel))));
  let p=replaceOnceV24(shiftedController,'initialRunV6,advanceRunV6,applyEconomyActionV6,beginOfflineV7,drainOfflineV7,','initialRunV6,');
  for(const [fn,name]of [['farm','originalFarmV23'],['manage','originalManageV23'],['policy','originalPolicyV23'],['weekly','originalWeeklyV23']])p=replaceOnceV24(p,`export function ${fn}(`,`function ${name}(`);
  p+=`\nimport {advanceRunV6,applyEconomyActionV6,observerV23} from ${JSON.stringify(pathToFileURL(kernel).href)};
import {beginOfflineV7,drainOfflineV7} from ${JSON.stringify(pathToFileURL(offline).href)};
export function farm(c,...args){const from=c.run.economy.economicThroughMs,native=observerV23?.nativeWall()??0;const result=originalFarmV23(c,...args);observerV23?.farm(from,c.run.economy.economicThroughMs,(observerV23?.nativeWall()??0)-native);return result;}
export function manage(c){const result=originalManageV23(c);observerV23?.need(c);return result;}
export function policy(c){const before={at:c.run.economy.economicThroughMs,need:c.need?.resource??null,amount:c.need?.amount??null,activity:c.run.economy.activity,floor:c.run.economy.floor,masteryMs:c.run.economy.masteryMs,seed:c.run.seed};const result=originalPolicyV23(c);observerV23?.decision(before,c);return result;}
export function weekly(c){const from=c.eventMs;const result=originalWeeklyV23(c);observerV23?.event(c.eventMs-from,c.run.economy.masteryMs);return result;}
`;
  await writeFile(policy,p);const k=await import(pathToFileURL(kernel).href),trace=observe?createTraceV24(savedTrace):null;k.setObserverV23(trace);
  const campaign=await import(pathToFileURL(policy).href),offModule=await import(pathToFileURL(offline).href);
  return {campaign,kernel:k,offline:offModule,trace,sources,dispose};
 }catch(e){await dispose();throw e;}
}
