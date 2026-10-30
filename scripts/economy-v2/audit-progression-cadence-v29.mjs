// Recompute every wait/native-credit ledger. Never publish private rows or balances.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {Worker,isMainThread,parentPort,workerData} from 'node:worker_threads';
import {auditPanelV26} from './audit-progression-panel-v26.mjs';
import {sourcesV29} from './progression-sources-v29.mjs';
import {createAdapterV29} from './progression-adapter-v29.mjs';
import {CASES_V29,caseKeyV29,PROTOCOL_V29} from './progression-panel-v29.mjs';
import {initialCadenceV29,applyCadenceEventV29,finishCadenceDayV29,decodeCadenceDayV29,validateCadenceV29,shaV29} from './progression-cadence-v29.mjs';
import {nativeReferenceV26,semanticV26} from './progression-reference-v26.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
import {compareCampaignV22} from './progression-campaign-metrics-v22.mjs';
import {WORLD_START_V24,DAY_V24} from './progression-panel-v24.mjs';
export async function auditCadenceCaseV29(config,root,previous){
 const key=caseKeyV29(config),reference=await nativeReferenceV26(config),sources=await sourcesV29(config.startHour),old=previous.rows.find(x=>x.key===key),oldRaw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-bonus-v26/local/'+key+'-zero.json.gz')),oldTrace=JSON.parse(oldRaw).trace;assert.equal(shaV29(oldRaw),old.baselineHash);const arms={};
 for(const mode of ['zero','calendar']){
  const dir=root+'/'+key+'-'+mode,report=JSON.parse(await readFile(dir+'/results.json','utf8')),raw=gunzipSync(await readFile(dir+'/snapshot.json.gz')),p=JSON.parse(raw);
  assert.equal(report.version,'progression-cadence-report-v29-1');assert.equal(report.complete,true,'INCOMPLETE_CADENCE_ARM');assert.equal(report.days,120);assert.equal(report.ledgerDays,120);assert.equal(report.integrityPassed,true);for(const k of ['runtimeEnabled','balanceApproved','activationReady'])assert.equal(report[k],false);
  assert.equal(report.snapshotHash,shaV29(raw));assert.equal(report.traceHash,shaV29(JSON.stringify(p.trace)));assert.equal(report.cadenceHash,shaV29(JSON.stringify(p.cadence)));assert.deepEqual(report.provenance,p.provenance);assert.deepEqual(p.provenance,{version:'progression-cadence-arm-v29-1',config,mode,sources,protocolHash:shaV29(JSON.stringify(PROTOCOL_V29)),referenceHash:reference.hash,referenceZeroHash:shaV29(oldRaw)},'SOURCE_BINDING');
  validateEvidenceV24(p.campaign,p.trace,config,120);validateCadenceV29(p.cadence,p.trace,p.campaign);assert.deepEqual(report.endpoint,endpointV24(p.campaign));
  if(mode==='zero'){assert.deepEqual(report.nativeReplay,{referenceHash:reference.hash,exactDailyState:true,exactFinalState:true,exactNativeTrace:true});assert.deepEqual(semanticV26(p.campaign),reference.campaign,'FULL_NATIVE_BASELINE_REPLAY');assert.deepEqual(p.trace,oldTrace,'FULL_NATIVE_TRACE_REPLAY');assert.deepEqual(report.endpoint,old.baseline);}else assert.equal(report.nativeReplay,null);
  const start=WORLD_START_V24+config.startHour*3600000,replay=initialCadenceV29(mode,start),lab=await createAdapterV29({mode,observe:false,startHour:config.startHour});
  try{for(let day=1;day<=120;day++){
   const record=p.cadence.days[day-1];assert.equal(record.day,day);const bytes=await readFile(dir+`/day-${String(day).padStart(3,'0')}.json.gz`),events=decodeCadenceDayV29(bytes,record);
   for(const event of events){assert.ok(event.at>=start+(day-1)*DAY_V24&&event.at<=start+day*DAY_V24,'CADENCE_TIME_OUTSIDE_DAY');applyCadenceEventV29(replay,event,event.kind==='schedule'?level=>lab.kernel.benchmarkV29(level,event.activity,event.floor):undefined);}
   assert.deepEqual(finishCadenceDayV29(replay,day,events,bytes).record,record,'DAILY_CADENCE_REPLAY');assert.equal(replay.masteryMs,p.campaign.rows[day-1].masteryMs);
  }}finally{await lab.dispose();}
  assert.deepEqual(replay,p.cadence,'FULL_CADENCE_REPLAY');validateCadenceV29(replay,p.trace,p.campaign);
  arms[mode]={endpoint:report.endpoint,snapshotHash:shaV29(raw),traceHash:report.traceHash,ledgerChainHash:replay.days.at(-1).chainHash,waits:replay.scheduled,lifecycleEvents:replay.eventCount,completed:replay.completed,cancelled:replay.cancelled,pending:replay.pending?1:0,nominalMs:replay.nominalMs,scheduledMs:replay.scheduledMs,potentialSavedMs:replay.potentialSavedMs,qualifiedMs:replay.qualifiedMs,exactMaximumAtMs:replay.maxReachedAtMs,exactMaximumElapsedMs:replay.maxReachedAtMs===null?null:replay.maxReachedAtMs-start,exactLedgerReplay:true};
 }
 return {key,config,days:120,baseline:arms.zero.endpoint,candidate:arms.calendar.endpoint,...compareCampaignV22(arms.calendar.endpoint,arms.zero.endpoint),arms,sources,exactNativeReplay:true,scope:'Adaptive H29 trajectory; native grants per victory, exclusive time and all archived native control states/traces verified. Wait potential savings are scheduling accounting, not measured time-to-maximum benefit.'};
}
export async function auditCadenceV29(root='docs/plans/hunts-builds/progression-cadence-v29/local',concurrency=1){
 assert.ok(Number.isInteger(concurrency)&&concurrency>=1&&concurrency<=4,'INVALID_AUDIT_CONCURRENCY');const previous=await auditPanelV26(),rows=[];
 for(let offset=0;offset<CASES_V29.length;offset+=concurrency){const results=await Promise.allSettled(CASES_V29.slice(offset,offset+concurrency).map(config=>concurrency===1?auditCadenceCaseV29(config,root,previous):new Promise((resolve,reject)=>{
  const worker=new Worker(new URL(import.meta.url),{execArgv:[],workerData:{v29:true,config,root,previous}});let result,error;
  worker.once('message',x=>{result=x;});worker.once('error',e=>{error=e;});worker.once('exit',code=>{if(error)reject(error);else if(code!==0||!result)reject(new Error('CADENCE_WORKER_EXIT_'+code));else resolve(result);});
 })));const error=results.find(x=>x.status==='rejected');if(error)throw error.reason;rows.push(...results.map(x=>x.value));}
 assert.equal(rows.length,14);const windows=[0,12,20].map(startHour=>{const xs=rows.filter(r=>r.config.schedule==='casual'&&r.config.startHour===startHour);assert.equal(xs.length,2);return {startHour,pairs:2,nonRegressionPassed:xs.filter(x=>x.nonRegression).length,meaningfulBenefitPassed:xs.filter(x=>x.meaningfulBenefit).length};});
 return JSON.parse(JSON.stringify({version:'progression-cadence-audit-v29-1',protocolHash:shaV29(JSON.stringify(PROTOCOL_V29)),auditorHash:shaV29(await readFile(new URL(import.meta.url))),previousPanelHash:shaV29(JSON.stringify(previous)),metricsHash:shaV29(await readFile('scripts/economy-v2/progression-campaign-metrics-v22.mjs')),integrityPassed:true,totalPairs:14,completeArms:28,daysPerArm:120,totalAccountDays:3360,exactNativeReplays:14,exactLedgerReplays:28,totalWaits:rows.reduce((n,r)=>n+r.arms.zero.waits+r.arms.calendar.waits,0),totalLifecycleEvents:rows.reduce((n,r)=>n+r.arms.zero.lifecycleEvents+r.arms.calendar.lifecycleEvents,0),nonRegressionPassed:rows.filter(r=>r.nonRegression).length,meaningfulBenefitPassed:rows.filter(r=>r.meaningfulBenefit).length,jointPassed:rows.filter(r=>r.nonRegression&&r.meaningfulBenefit).length,nonRegressionGatePassed:rows.every(r=>r.nonRegression),meaningfulBenefitGatePassed:rows.every(r=>r.meaningfulBenefit),windows,rows,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'All14 preregistered adaptive pairs,28complete120day arms; native zero replays full archived campaigns/traces, every lifecycle ledger and native grant replayed. Original observed-endpoint gates unchanged. No acquired social cohort or human playtest; no activation.'}));
}
if(!isMainThread&&workerData?.v29)parentPort.postMessage(await auditCadenceCaseV29(workerData.config,workerData.root,workerData.previous));
if(isMainThread&&process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);for(const a of args)assert.equal(a,'--verify','UNKNOWN_ARGUMENT');const out='docs/plans/hunts-builds/progression-cadence-v29/local/summary.json',r=await auditCadenceV29(undefined,4);if(args.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),r);else await writeFile(out,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({integrityPassed:true,totalPairs:14,completeArms:28,exactNativeReplays:14,exactLedgerReplays:28,totalWaits:r.totalWaits,nonRegressionPassed:r.nonRegressionPassed,meaningfulBenefitPassed:r.meaningfulBenefitPassed,jointPassed:r.jointPassed,runtimeEnabled:false}));
}
