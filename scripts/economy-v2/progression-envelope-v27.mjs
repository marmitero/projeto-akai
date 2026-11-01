// Read-only design review. Credit budgets must never be relabeled as calendar time saved.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ECONOMY_XP_V2} from '../../packages/shared/dist/economy-v2.js';
import {auditPanelV26} from './audit-progression-panel-v26.mjs';
import {WORLD_START_V24} from './progression-panel-v24.mjs';
const MAX=ECONOMY_XP_V2[999],sha=x=>createHash('sha256').update(x).digest('hex');
const safe=x=>assert.ok(Number.isSafeInteger(x)&&x>=0,'INVALID_ENVELOPE_COUNTER');
const total=xs=>{let n=0;for(const x of xs){safe(x);n+=x;safe(n);}return n;};
export function creditEnvelopeV27({qualifiedMs,creditMs,referenceLossMs,benchmarkLossMs,capLossMs,maximumCredit=MAX}){
 for(const x of [qualifiedMs,creditMs,referenceLossMs,benchmarkLossMs,capLossMs,maximumCredit])safe(x);
 assert.ok(maximumCredit>0&&creditMs>0&&creditMs<=maximumCredit);assert.equal(total([creditMs,referenceLossMs,benchmarkLossMs,capLossMs]),qualifiedMs,'NATIVE_CREDIT_IDENTITY');
 const nativePenaltyPoolMs=total([referenceLossMs,benchmarkLossMs]),maximumReached=creditMs===maximumCredit;
 // A saturated final endpoint says nothing about the primary time-to-maximum metric.
 const relaxedFinalCreditMs=maximumReached?null:Math.min(maximumCredit,qualifiedMs),extra=maximumReached?null:relaxedFinalCreditMs-creditMs;
 return {qualifiedMs,creditMs,nativePenaltyPoolMs,capLossMs,maximumReached,relaxedFinalCreditMs,relaxedFinalExtraMs:extra,relaxedPrimaryGain:extra===null?null:extra/creditMs,onePercentNotRuledOut:extra===null?null:BigInt(extra)*100n>=BigInt(creditMs),frozenPathCompletionTimeIdentified:false};
}
export function timeFloorV27(elapsedMs,minimumQualifiedMs=MAX){
 safe(elapsedMs);safe(minimumQualifiedMs);assert.ok(minimumQualifiedMs>0&&elapsedMs>=minimumQualifiedMs,'INVALID_NATIVE_MAXIMUM_TIME');
 return {minimumElapsedMs:minimumQualifiedMs,maximumPossibleAdvanceMs:elapsedMs-minimumQualifiedMs,maximumPossibleRelativeAdvance:(elapsedMs-minimumQualifiedMs)/elapsedMs,scope:'Global qualified-time floor only; not a fixed-trajectory completion estimate'};
}
export function quoteBridgeV27({nativeCreditMs,candidateBaseMs,directExtraMs,candidateCreditMs}){
 for(const x of [nativeCreditMs,candidateBaseMs,directExtraMs,candidateCreditMs])safe(x);assert.equal(total([candidateBaseMs,directExtraMs]),candidateCreditMs,'CANDIDATE_QUOTE_IDENTITY');
 const trajectoryBaseDifferenceMs=candidateBaseMs-nativeCreditMs,netCreditDifferenceMs=candidateCreditMs-nativeCreditMs;
 assert.equal(netCreditDifferenceMs,trajectoryBaseDifferenceMs+directExtraMs);
 return {directExtraMs,trajectoryBaseDifferenceMs,netCreditDifferenceMs,baseDifferenceOffsetsDirectQuote:trajectoryBaseDifferenceMs<0,directQuoteReversed:directExtraMs>0&&netCreditDifferenceMs<0};
}
function creditTotals(trace,phase){
 const names=['qualifiedVictoryMs','creditMs','sameEncounterBaseMs','directExtraMs','referenceLossMs','benchmarkLossMs','maximumCapLossMs'],out={};
 for(const name of names)out[name]=total(Object.entries(trace.groups).filter(([key])=>phase==='all'||key.endsWith('/preMax')).map(([,g])=>g[name]??0));
 return out;
}
export async function reviewEnvelopeV27(root='docs/plans/hunts-builds/progression-bonus-v26/local'){
 const audit=await auditPanelV26(root),rows=[];
 for(const r of audit.rows){
  const arms={};for(const mode of ['zero','calendar']){
   const raw=gunzipSync(await readFile(`${root}/${r.key}-${mode}.json.gz`));assert.equal(sha(raw),mode==='zero'?r.baselineHash:r.candidateHash,'AUDITED_BYTES_CHANGED');arms[mode]=JSON.parse(raw);
  }
  const b=arms.zero,c=arms.calendar,reached=r.baseline.maxDay!==null,phase=reached?'preMax':'all',t=creditTotals(b.trace,phase);assert.equal(t.directExtraMs,0);assert.equal(t.sameEncounterBaseMs,t.creditMs);
  const envelope=creditEnvelopeV27({qualifiedMs:t.qualifiedVictoryMs,creditMs:t.creditMs,referenceLossMs:t.referenceLossMs,benchmarkLossMs:t.benchmarkLossMs,capLossMs:t.maximumCapLossMs});assert.equal(envelope.maximumReached,reached);
  const start=WORLD_START_V24+r.config.startHour*3600000,globalTimeFloor=reached?timeFloorV27(b.trace.maxReachedAtMs-start):null;
  let bridge=null;if(!reached){assert.equal(r.candidate.maxDay,null,'MIXED_CENSORING_REQUIRES_SEPARATE_ANALYSIS');const ct=creditTotals(c.trace,'all');bridge=quoteBridgeV27({nativeCreditMs:t.creditMs,candidateBaseMs:ct.sameEncounterBaseMs,directExtraMs:ct.directExtraMs,candidateCreditMs:ct.creditMs});assert.equal(bridge.netCreditDifferenceMs,r.candidate.masteryMs-r.baseline.masteryMs);}
  rows.push({key:r.key,config:r.config,phase,envelope,globalTimeFloor,bridge,nativeExactElapsedMs:reached?b.trace.maxReachedAtMs-start:null,primaryMetric:reached?'time-to-maximum':'final-mastery',actualH26PrimaryGain:r.primaryGain,actualH26NonRegression:r.nonRegression,actualFloorDifference:r.candidate.floor-r.baseline.floor,baselineHash:r.baselineHash,candidateHash:r.candidateHash});
 }
 assert.equal(rows.length,14);
 return JSON.parse(JSON.stringify({version:'progression-envelope-v27-1',sourcePanelHash:sha(JSON.stringify(audit)),reviewSourceHash:sha(await readFile(new URL(import.meta.url))),protocolHash:sha(await readFile('docs/plans/hunts-builds/progression-envelope-v27/PROTOCOL.md')),integrityPassed:true,totalPairs:14,censoredCases:rows.filter(r=>r.bridge).length,relaxedOnePercentNotRuledOut:rows.filter(r=>r.envelope.onePercentNotRuledOut===true).length,unidentifiedFrozenCompletionTimes:rows.filter(r=>r.primaryMetric==='time-to-maximum').length,reversedDirectQuotes:rows.filter(r=>r.bridge?.directQuoteReversed).length,rows,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'Optimistic credit envelopes and accounting on audited complete H26/native trajectories. No new formula or campaign. Full-credit oracle ignores eligibility and penalties; credit opportunity is not calendar time saved. Fixed-trajectory maximum timing needs victory prefixes. Bridge is an accounting identity across different trajectories, not isolated causality.'}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);for(const a of args)assert.ok(a==='--verify','UNKNOWN_ARGUMENT');const out='docs/plans/hunts-builds/progression-envelope-v27/local/review.json',r=await reviewEnvelopeV27();
 if(args.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),r);else{await mkdir('docs/plans/hunts-builds/progression-envelope-v27/local',{recursive:true});await writeFile(out,JSON.stringify(r,null,2)+'\n');}
 console.log(JSON.stringify({integrityPassed:r.integrityPassed,totalPairs:r.totalPairs,censoredCases:r.censoredCases,relaxedOnePercentNotRuledOut:r.relaxedOnePercentNotRuledOut,unidentifiedFrozenCompletionTimes:r.unidentifiedFrozenCompletionTimes,reversedDirectQuotes:r.reversedDirectQuotes,runtimeEnabled:false}));
}
