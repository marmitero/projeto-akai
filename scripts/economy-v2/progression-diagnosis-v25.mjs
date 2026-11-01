// Read-only accounting. Full private evidence is verified before any diagnosis.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditPanelV24} from './audit-progression-panel-v24.mjs';
import {NEW_CASES_V24,caseKeyV24,WORLD_START_V24,DAY_V24} from './progression-panel-v24.mjs';

const sha=x=>createHash('sha256').update(x).digest('hex');
const fields=['combatMs','internalTransitionMs','externalTransitionMs','pausedMs','unclassifiedMs','qualifiedVictoryMs','creditMs','sameEncounterBaseMs','directExtraMs','referenceLossMs','benchmarkLossMs','maximumCapLossMs'];
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const nonnegative=x=>assert.ok(Number.isSafeInteger(x)&&x>=0,'INVALID_DIAGNOSTIC_COUNTER');
export function decomposeTimeV25(trace,{start,phase='all',expectedCredit,expectedWall}={}){
 assert.ok(['all','preMax'].includes(phase));nonnegative(start);nonnegative(expectedCredit);nonnegative(expectedWall);
 const totals=Object.fromEntries(fields.map(k=>[k,0])),activities={};
 for(const [key,g]of Object.entries(trace.groups))if(phase==='all'||key.endsWith('/preMax')){
  assert.match(key,/^(online|offline)\/(main|coal|iron|gold)\/(preMax|afterMax)$/);
  const activity=key.split('/').slice(0,2).join('/');activities[activity]??=Object.fromEntries(fields.map(k=>[k,0]));
  for(const field of fields){const n=g[field]??0;nonnegative(n);totals[field]+=n;activities[activity][field]+=n;nonnegative(totals[field]);}
 }
 // A return jump is outside advanceRunV6 (e.g. an absence ended early).
 // V24 has no phase-tagged return jumps; never invent their pre-maximum allocation.
 if(phase==='preMax'){assert.equal(trace.returnJumpMs,0,'PREMAX_RETURN_JUMP_NOT_LOCALIZED');assert.ok(Number.isSafeInteger(trace.maxReachedAtMs));assert.equal(expectedWall,trace.maxReachedAtMs-start);}
 const eventMs=phase==='all'?trace.eventMs:(trace.eventByPhase.preMax??0),returnJumpMs=phase==='all'?trace.returnJumpMs:0;
 nonnegative(eventMs);nonnegative(returnJumpMs);assert.equal(totals.unclassifiedMs,0,'UNCLASSIFIED_TIME');
 assert.equal(totals.qualifiedVictoryMs,totals.sameEncounterBaseMs+totals.referenceLossMs+totals.benchmarkLossMs+totals.maximumCapLossMs);
 assert.equal(totals.creditMs,totals.sameEncounterBaseMs+totals.directExtraMs);
 const unqualifiedEncounterMs=totals.combatMs+totals.internalTransitionMs-totals.qualifiedVictoryMs;nonnegative(unqualifiedEncounterMs);
 const wallMs=totals.combatMs+totals.internalTransitionMs+totals.externalTransitionMs+totals.pausedMs+eventMs+returnJumpMs;
 assert.equal(wallMs,expectedWall,'WALL_RECONCILIATION');assert.equal(totals.creditMs,expectedCredit,'CREDIT_RECONCILIATION');
 const components={unqualifiedEncounterMs,externalTransitionMs:totals.externalTransitionMs,pausedMs:totals.pausedMs,eventMs,returnJumpMs,referenceLossMs:totals.referenceLossMs,benchmarkLossMs:totals.benchmarkLossMs,maximumCapLossMs:totals.maximumCapLossMs,directExtraMs:totals.directExtraMs===0?0:-totals.directExtraMs};
 assert.equal(sum(Object.values(components)),wallMs-totals.creditMs,'TIME_CREDIT_IDENTITY');
 return {phase,wallMs,creditMs:totals.creditMs,components,activities};
}
export function compareDecompositionV25(baseline,candidate){
 assert.equal(baseline.phase,candidate.phase);assert.deepEqual(Object.keys(baseline.components),Object.keys(candidate.components));
 const difference=Object.fromEntries(Object.keys(baseline.components).map(k=>[k,candidate.components[k]-baseline.components[k]]));
 const wallDifferenceMs=candidate.wallMs-baseline.wallMs,creditDifferenceMs=candidate.creditMs-baseline.creditMs,netDifferenceMs=sum(Object.values(difference));
 assert.equal(netDifferenceMs,wallDifferenceMs-creditDifferenceMs);
 return {difference,wallDifferenceMs,creditDifferenceMs,netDifferenceMs};
}
export function firstDifferencesV25(baseline,candidate){
 assert.equal(baseline.trace.days.length,candidate.trace.days.length);assert.equal(baseline.campaign.rows.length,candidate.campaign.rows.length);
 const result={};for(const k of ['drawDigest','actionDigest','decisionDigest'])result[k]=candidate.trace.days.find((d,i)=>d[k]!==baseline.trace.days[i][k])?.day??null;
 result.masteryDay=candidate.campaign.rows.find((r,i)=>r.masteryMs!==baseline.campaign.rows[i].masteryMs)?.day??null;
 result.floorDay=candidate.campaign.rows.find((r,i)=>r.highest.main!==baseline.campaign.rows[i].highest.main)?.day??null;
 return result;
}
export async function diagnosePanelV25(root='docs/plans/hunts-builds/progression-panel-v24/local'){
 const audit=await auditPanelV24(root),rows=[];
 for(const config of NEW_CASES_V24){
  const key=caseKeyV24(config),arms={};
  for(const mode of ['zero','calendar']){
   const raw=gunzipSync(await readFile(`${root}/${key}-${mode}.json.gz`)),p=JSON.parse(raw),a=audit.rows.find(r=>r.key===key);
   // Bind the bytes used here to the audit, including changes made during the read.
   assert.equal(sha(raw),mode==='zero'?a.baselineHash:a.candidateHash);
   const start=WORLD_START_V24+config.startHour*3600000,full=decomposeTimeV25(p.trace,{start,expectedCredit:p.campaign.run.economy.masteryMs,expectedWall:120*DAY_V24});
   const preMax=p.trace.maxReachedAtMs!==null?decomposeTimeV25(p.trace,{start,phase:'preMax',expectedCredit:8294400000,expectedWall:p.trace.maxReachedAtMs-start}):null;
   arms[mode]={p,full,preMax,hash:sha(raw)};
  }
  const {zero:b,calendar:c}=arms,a=audit.rows.find(r=>r.key===key);
  assert.equal(b.preMax===null,c.preMax===null,'UNEXPECTED_MIXED_CENSORING');
  rows.push({key,config,nonRegression:a.nonRegression,primaryGain:a.primaryGain,baselineHash:b.hash,candidateHash:c.hash,
   full:{baseline:b.full,candidate:c.full,...compareDecompositionV25(b.full,c.full)},
   preMax:b.preMax?{baseline:b.preMax,candidate:c.preMax,...compareDecompositionV25(b.preMax,c.preMax)}:null,
   firstDifference:firstDifferencesV25(b.p,c.p),
   // These action/RNG totals span all120days, not the pre-maximum interval.
   actionDifference:Object.fromEntries([...new Set([...Object.keys(b.p.trace.actionCategories),...Object.keys(c.p.trace.actionCategories)])].sort().map(k=>[k,(c.p.trace.actionCategories[k]??0)-(b.p.trace.actionCategories[k]??0)])),
   rngDifference:Object.fromEntries([...new Set([...Object.keys(b.p.trace.rng),...Object.keys(c.p.trace.rng)])].sort().map(k=>[k,(c.p.trace.rng[k]??0)-(b.p.trace.rng[k]??0)]))});
 }
 return JSON.parse(JSON.stringify({version:'progression-diagnosis-v25-1',sourcePanelHash:sha(JSON.stringify(audit)),diagnosticHash:sha(await readFile(new URL(import.meta.url))),integrityPassed:true,pairs:rows.length,negativePairs:rows.filter(r=>!r.nonRegression).length,rows,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'Read-only accounting of all seven new V24 pairs, including the positive contrast. Exact integer time/credit identities; pre-maximum comparison only with zero unlocalized return jumps. No isolated causal claim for actions, RNG, transitions or event windows; no new candidate outcomes.'}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);for(const a of args)assert.ok(a==='--verify','UNKNOWN_ARGUMENT');
 const root='docs/plans/hunts-builds/progression-diagnosis-v25/local',out=root+'/diagnosis.json',r=await diagnosePanelV25();
 if(args.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),r);else{await mkdir(root,{recursive:true});await writeFile(out,JSON.stringify(r,null,2)+'\n');}
 console.log(JSON.stringify({integrityPassed:r.integrityPassed,pairs:r.pairs,negativePairs:r.negativePairs,identitiesPassed:true,runtimeEnabled:false}));
}
