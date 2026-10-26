// Replay shadow mathematics from every private victory ledger; do not infer prefixes from totals.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {auditPanelV26} from './audit-progression-panel-v26.mjs';
import {createAdapterV28} from './progression-adapter-v28.mjs';
import {sourcesV28} from './progression-sources-v28.mjs';
import {CASES_V28,caseKeyV28,PROTOCOL_V28} from './progression-panel-v28.mjs';
import {nativeReferenceV26,semanticV26} from './progression-reference-v26.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
import {initialShadowV28,applyVictoryV28,finishShadowDayV28,decodeDayV28,validateShadowV28,shaV28,DAY_V28} from './progression-shadow-v28.mjs';
import {WORLD_START_V24} from './progression-panel-v24.mjs';
export function shadowMetricV28(zero,b,start){
 if(zero.witness){assert.ok(b.witness,'SHADOW_CENSORED_AFTER_NATIVE_MAX');const denominator=zero.witness.at-start,delta=zero.witness.at-b.witness.at;return {kind:'exact-time-to-maximum',primaryGain:delta/denominator,benefitAtLeastOnePercent:BigInt(delta)*100n>=BigInt(denominator),maximumAtMs:b.witness.at,maximumElapsedMs:b.witness.at-start,finalMasteryMs:b.masteryMs};}
 const delta=b.masteryMs-zero.masteryMs;return {kind:'final-mastery-at120days',primaryGain:delta/zero.masteryMs,benefitAtLeastOnePercent:BigInt(delta)*100n>=BigInt(zero.masteryMs),maximumAtMs:b.witness?.at??null,maximumElapsedMs:b.witness?b.witness.at-start:null,finalMasteryMs:b.masteryMs};
}
export async function auditShadowV28(root='docs/plans/hunts-builds/progression-shadow-v28/local'){
 const previous=await auditPanelV26(),rows=[];let totalVictories=0;
 for(const config of CASES_V28){
  const key=caseKeyV28(config),dir=root+'/'+key,report=JSON.parse(await readFile(dir+'/results.json','utf8')),raw=gunzipSync(await readFile(dir+'/snapshot.json.gz')),p=JSON.parse(raw),sources=await sourcesV28(config.startHour),reference=await nativeReferenceV26(config),old=previous.rows.find(r=>r.key===key),oldRaw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-bonus-v26/local/'+key+'-zero.json.gz')),prior=JSON.parse(oldRaw);assert.equal(shaV28(oldRaw),old.baselineHash);
  assert.equal(report.version,'progression-shadow-report-v28-1');assert.equal(report.complete,true,'INCOMPLETE_SHADOW_ARM');assert.equal(report.days,120);assert.equal(report.ledgerDays,120);assert.equal(report.integrityPassed,true);for(const k of ['exactDailyState','exactFinalState','exactNativeTrace'])assert.equal(report[k],true);for(const k of ['runtimeEnabled','balanceApproved','activationReady'])assert.equal(report[k],false);
  assert.equal(report.snapshotHash,shaV28(raw));assert.equal(report.traceHash,shaV28(JSON.stringify(p.trace)));assert.equal(report.shadowHash,shaV28(JSON.stringify(p.shadow)));assert.deepEqual(report.provenance,p.provenance);assert.deepEqual(p.provenance,{version:'progression-shadow-arm-v28-1',config,sources,protocolHash:shaV28(JSON.stringify(PROTOCOL_V28)),referenceHash:reference.hash,referenceZeroHash:shaV28(oldRaw)},'SOURCE_BINDING');
  validateEvidenceV24(p.campaign,p.trace,config,120);validateShadowV28(p.shadow,p.trace,p.campaign);assert.deepEqual(semanticV26(p.campaign),reference.campaign,'NATIVE_FINAL_REPLAY');assert.deepEqual(p.trace,prior.trace,'NATIVE_FULL_TRACE_REPLAY');assert.deepEqual(report.endpoint,endpointV24(p.campaign));assert.deepEqual(report.banks,p.shadow.banks);
  const start=WORLD_START_V24+config.startHour*3600000,replay=initialShadowV28(start),lab=await createAdapterV28({observe:false,startHour:config.startHour});
  try{
   for(let day=1;day<=120;day++){
    const record=p.shadow.days[day-1];assert.equal(record.day,day);const bytes=await readFile(dir+`/day-${String(day).padStart(3,'0')}.json.gz`),events=decodeDayV28(bytes,record);
    for(const event of events){assert.ok(event.at>=start+(day-1)*DAY_V28&&event.at<=start+day*DAY_V28,'LEDGER_TIME_OUTSIDE_DAY');applyVictoryV28(replay,event,level=>lab.kernel.benchmarkV28(level,event.activity,event.floor));}
    const finished=finishShadowDayV28(replay,day,events,bytes);assert.deepEqual(finished.record,record,'SHADOW_DAILY_PREFIX_REPLAY');assert.equal(replay.banks.zero.masteryMs,p.campaign.rows[day-1].masteryMs);
   }
  }finally{await lab.dispose();}
  assert.deepEqual(replay,p.shadow,'SHADOW_FINAL_REPLAY');validateShadowV28(replay,p.trace,p.campaign);totalVictories+=replay.ordinal;
  const h26=shadowMetricV28(replay.banks.zero,replay.banks.h26,start),oracle=shadowMetricV28(replay.banks.zero,replay.banks.oracle,start);
  const adaptiveRaw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-bonus-v26/local/'+key+'-calendar.json.gz'));assert.equal(shaV28(adaptiveRaw),old.candidateHash);const adaptive=JSON.parse(adaptiveRaw),adaptiveExact=shadowMetricV28(replay.banks.zero,{masteryMs:adaptive.campaign.run.economy.masteryMs,witness:adaptive.trace.maxReachedAtMs===null?null:{at:adaptive.trace.maxReachedAtMs}},start);
  rows.push({key,config,days:120,victories:replay.ordinal,ledgerChainHash:replay.days.at(-1).chainHash,snapshotHash:shaV28(raw),sources,nativeExactMaximumAtMs:replay.banks.zero.witness?.at??null,nativeExactMaximumElapsedMs:replay.banks.zero.witness?replay.banks.zero.witness.at-start:null,nativeFinalMasteryMs:replay.banks.zero.masteryMs,nativeFloor:report.endpoint.floor,h26,oracle,adaptiveH26:{primaryGainObserved:old.primaryGain,exactDiagnostic:adaptiveExact,nonRegression:old.nonRegression,meaningfulBenefit:old.meaningfulBenefit,candidate:old.candidate},exactNativeReplay:true,exactNativeTrace:true,exactVictoryReplay:true,scope:'Shadow keeps native power/decisions/RNG frozen. Tower equality is by construction and cannot approve the adaptive tower gate.'});
 }
 assert.equal(rows.length,14);return JSON.parse(JSON.stringify({version:'progression-shadow-audit-v28-1',protocolHash:shaV28(JSON.stringify(PROTOCOL_V28)),auditorHash:shaV28(await readFile(new URL(import.meta.url))),previousPanelHash:shaV28(JSON.stringify(previous)),integrityPassed:true,totalCases:14,daysPerCase:120,totalAccountDays:1680,totalVictories,exactNativeReplays:14,exactLedgerReplays:14,h26PrimaryBenefitPassed:rows.filter(r=>r.h26.benefitAtLeastOnePercent).length,oraclePrimaryBenefitPassed:rows.filter(r=>r.oracle.benefitAtLeastOnePercent).length,rows,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'All14 native controls replay120days and reproduce entire archived campaigns/traces. Every victory ledger is replayed into independent zero/H26/oracle banks. Exact victory timestamps for maximum; fixed120day endpoint for censored controls. Artificial fixed-trajectory intervention, not adaptive balance approval or isolated causality.'}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);for(const a of args)assert.ok(a==='--verify','UNKNOWN_ARGUMENT');const out='docs/plans/hunts-builds/progression-shadow-v28/local/summary.json',r=await auditShadowV28();
 if(args.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),r);else await writeFile(out,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({integrityPassed:true,totalCases:14,exactNativeReplays:14,exactLedgerReplays:14,victories:r.totalVictories,h26PrimaryBenefitPassed:r.h26PrimaryBenefitPassed,oraclePrimaryBenefitPassed:r.oraclePrimaryBenefitPassed,runtimeEnabled:false}));
}
