// Disposable H29 native-grant kernel; no repository/native module is rewritten.
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve,basename} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createCadenceV29} from './progression-cadence-v29.mjs';
import {WORLD_START_V24} from './progression-panel-v24.mjs';
export function replaceOnceV29(s,a,b){assert.equal(s.split(a).length,2,'V29_SOURCE_ANCHOR_CHANGED: '+a);return s.replace(a,b);}
export async function createAdapterV29({mode='calendar',observe=true,startHour=0,savedTrace,savedCadence}={}){
 assert.ok(['zero','calendar'].includes(mode));assert.ok([0,12,20].includes(startHour));const id=randomUUID(),kernel=resolve(`packages/shared/dist/.v29-kernel-${id}.mjs`),offline=resolve(`packages/shared/dist/.v29-offline-${id}.mjs`),policy=resolve(`scripts/economy-v2/.v29-policy-${id}.mjs`),observer=resolve(`scripts/economy-v2/.v29-trace-${id}.mjs`),files=[kernel,offline,policy,observer];
 const dispose=()=>Promise.all(files.map(f=>unlink(f).catch(e=>{if(e.code!=='ENOENT')throw e;})));
 const [native,off,controller,baseTrace]=await Promise.all(['packages/shared/dist/economy-run-v6.js','packages/shared/dist/offline-v7.js','scripts/economy-v2/campaign-policy.mjs','scripts/economy-v2/progression-trace-v24.mjs'].map(p=>readFile(p,'utf8')));
 const cadence=createCadenceV29({mode,start:WORLD_START_V24+startHour*3600000,saved:savedCadence});
 let traceCode=replaceOnceV29(baseTrace,'export function createTraceV24(saved){','export function createTraceV29(saved,externalFrom){');
 traceCode=replaceOnceV29(traceCode,"if(!e)span('externalTransitionMs',s.nextAt-3000,s.nextAt,key(s));","if(!e)span('externalTransitionMs',externalFrom(s,s.nextAt),s.nextAt,key(s));");
 traceCode=replaceOnceV29(traceCode,"e.combat.clockMs-3000,e.combat.clockMs,key(s))","e.wave===1?externalFrom(s,e.combat.clockMs):e.combat.clockMs-3000,e.combat.clockMs,key(s))");
 traceCode=replaceOnceV29(traceCode,"at-3000,at,key(s));add(group(key(s)),wave===1?'encounters':'waves');","wave===1?externalFrom(s,at):at-3000,at,key(s));add(group(key(s)),wave===1?'encounters':'waves');");
 const a=native.indexOf('function mastery('),b=native.indexOf('function grant(',a);assert.ok(a>=0&&b>a);
 const helper=`\nexport let observerV23=null,cadenceV29=null;let lastVictoryV29=null;export function setLabV29(trace,cadence){observerV23=trace;cadenceV29=cadence;}\n`;
 const mastery=native.slice(a,b).replace('function mastery(','function originalMasteryV29(')+`\nfunction mastery(s,Q,activity,floor,reference){const before={masteryMs:s.economy.masteryMs,carry:s.xpCarry};const result=originalMasteryV29(s,Q,activity,floor,reference);const after={masteryMs:s.economy.masteryMs,carry:s.xpCarry};lastVictoryV29={at:s.encounter.combat.clockMs,Q,before,after};observerV23?.mastery({...before,offline:!!s.offlineJob},{...after,at:lastVictoryV29.at},Q,activity,reference,level=>benchmark(level,activity,floor));return result;}\n`;
 let code=helper+native.slice(0,a)+mastery+native.slice(b)+'\nexport {benchmark as benchmarkV29};\n';
 code=replaceOnceV29(code,'function draw(s, key, bound, entropy) {','function originalDrawV29(s, key, bound, entropy) {');
 code=replaceOnceV29(code,'function start(s, at, wave = 1, hp, entropy, frozenStats) {','function start(s, at, wave = 1, hp, entropy, frozenStats) {\n observerV23?.start(s,at,wave);if(wave===1)cadenceV29.start(s,at);');
 code=replaceOnceV29(code,'e.combatMs += r.state.clockMs - before;','e.combatMs += r.state.clockMs - before;\n observerV23?.combat(s,before,r.state.clockMs);');
 code=replaceOnceV29(code,'s.encounter = null;\n        s.nextAt = at + 3000;',"s.nextAt = e.combat.status==='victory'?cadenceV29.schedule(s,at,e,lastVictoryV29):at+3000;\n        s.encounter = null;");
 code=replaceOnceV29(code,'export function advanceRunV6(','function originalAdvanceRunV29(');code=replaceOnceV29(code,'export function applyEconomyActionV6(','function originalActionV29(');
 code+=`\nfunction draw(s,key,bound,entropy){const before=s.seed,value=originalDrawV29(s,key,bound,entropy);observerV23?.rng(s,key,bound,before,value);return value;}
export function advanceRunV6(...args){cadenceV29.sync(args[0]);observerV23?.beginAdvance(args[0]);try{const r=originalAdvanceRunV29(...args);observerV23?.endAdvance(r.state);return r;}catch(e){observerV23?.abortAdvance();throw e;}}
export function applyEconomyActionV6(s,action,...rest){const r=originalActionV29(s,action,...rest);if(action.type==='select'||action.type==='pause'&&action.paused)cadenceV29.cancel(s.economy.economicThroughMs,'action');observerV23?.action(s,action,r);return r;}
`;
 let offCode=replaceOnceV29(off,"'./economy-run-v6.js'",JSON.stringify('./'+basename(kernel)));offCode=replaceOnceV29(offCode,'export function beginOfflineV7(','function originalBeginV29(');offCode=replaceOnceV29(offCode,'export function drainOfflineV7(','function originalDrainV29(');
 offCode+=`\nimport {cadenceV29} from ${JSON.stringify('./'+basename(kernel))};
export function beginOfflineV7(s,...args){const r=originalBeginV29(s,...args);if(!s.offlineJob)cadenceV29.cancel(s.economy.economicThroughMs,'offline-entry');return r;}
export function drainOfflineV7(s,...args){const r=originalDrainV29(s,...args);if(!r.state.offlineJob)cadenceV29.cancel(r.state.economy.economicThroughMs,'offline-return');return r;}
`;
 let p=replaceOnceV29(controller,"START=Date.parse('2026-10-19T03:00:00Z')","START=Date.parse('2026-10-19T03:00:00Z')+"+startHour*3600000);
 p=replaceOnceV29(p,'initialRunV6,advanceRunV6,applyEconomyActionV6,beginOfflineV7,drainOfflineV7,','initialRunV6,');
 for(const [fn,name]of [['farm','originalFarmV29'],['manage','originalManageV29'],['policy','originalPolicyV29'],['weekly','originalWeeklyV29']])p=replaceOnceV29(p,`export function ${fn}(`,`function ${name}(`);
 p+=`\nimport {advanceRunV6,applyEconomyActionV6,observerV23,cadenceV29} from ${JSON.stringify(pathToFileURL(kernel).href)};
import {beginOfflineV7,drainOfflineV7} from ${JSON.stringify(pathToFileURL(offline).href)};
export function farm(c,...args){const from=c.run.economy.economicThroughMs,native=observerV23?.nativeWall()??0;const r=originalFarmV29(c,...args);observerV23?.farm(from,c.run.economy.economicThroughMs,(observerV23?.nativeWall()??0)-native);return r;}
export function manage(c){const r=originalManageV29(c);observerV23?.need(c);return r;}
export function policy(c){const before={at:c.run.economy.economicThroughMs,need:c.need?.resource??null,amount:c.need?.amount??null,activity:c.run.economy.activity,floor:c.run.economy.floor,masteryMs:c.run.economy.masteryMs,seed:c.run.seed};const r=originalPolicyV29(c);observerV23?.decision(before,c);return r;}
export function weekly(c){const from=c.run.economy.economicThroughMs,event=c.eventMs,r=originalWeeklyV29(c);if(c.eventMs>event)cadenceV29.cancel(from,'weekly');observerV23?.event(c.eventMs-event,c.run.economy.masteryMs);return r;}
`;
 try{await writeFile(kernel,code);await writeFile(offline,offCode);await writeFile(policy,p);await writeFile(observer,traceCode);const {createTraceV29}=await import(pathToFileURL(observer).href),trace=observe?createTraceV29(savedTrace,(s,until)=>cadence.externalFrom(s,until)):null,k=await import(pathToFileURL(kernel).href);k.setLabV29(trace,cadence);const campaign=await import(pathToFileURL(policy).href),offModule=await import(pathToFileURL(offline).href);return {kernel:k,campaign,offline:offModule,trace,cadence,dispose};}catch(e){await dispose();throw e;}
}
