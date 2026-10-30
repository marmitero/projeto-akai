// Complete private panel only. Public conclusions must be written without balances or series.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {auditPanelV24} from './audit-progression-panel-v24.mjs';
import {CASES_V26,caseKeyV26,PANEL_PROTOCOL_V26} from './progression-panel-v26.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
import {compareCampaignV22} from './progression-campaign-metrics-v22.mjs';
import {replaceOnceV26} from './progression-adapter-v26.mjs';
import {nativeReferenceV26,semanticV26} from './progression-reference-v26.mjs';
import {decomposeTimeV25,compareDecompositionV25} from './progression-diagnosis-v25.mjs';
import {WORLD_START_V24} from './progression-panel-v24.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const paths={nativeHash:'packages/shared/dist/economy-run-v6.js',offlineHash:'packages/shared/dist/offline-v7.js',controllerHash:'scripts/economy-v2/campaign-policy.mjs',modelHash:'packages/shared/src/progression-bonus-v26/index.ts',factoryHash:'scripts/economy-v2/progression-adapter-v26.mjs',observerHash:'scripts/economy-v2/progression-trace-v24.mjs',runnerHash:'scripts/economy-v2/run-progression-panel-v26.mjs',protocolSourceHash:'scripts/economy-v2/progression-panel-v26.mjs',validatorHash:'scripts/economy-v2/progression-evidence-v24.mjs',referenceSourceHash:'scripts/economy-v2/progression-reference-v26.mjs'};
export async function auditPanelV26(root='docs/plans/hunts-builds/progression-bonus-v26/local'){
 const previous=await auditPanelV24(),sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[k,sha(await readFile(p))]))),protocolHash=sha(JSON.stringify(PANEL_PROTOCOL_V26)),controller=await readFile(paths.controllerHash,'utf8'),rows=[];
 assert.equal(previous.rows.find(r=>r.config.seed===3735928559).nonRegression,false,'OLD_NEGATIVE_RETAINED');
 for(const config of CASES_V26){
  const key=caseKeyV26(config),reference=await nativeReferenceV26(config),arms={};
  for(const mode of ['zero','calendar']){
   const name=key+'-'+mode,r=JSON.parse(await readFile(`${root}/${name}.results.json`,'utf8')),raw=gunzipSync(await readFile(`${root}/${name}.json.gz`)),p=JSON.parse(raw);
   assert.equal(r.version,'progression-panel-report-v26-1');assert.equal(r.complete,true);assert.equal(r.days,120);assert.equal(r.integrityPassed,true);for(const k of ['runtimeEnabled','balanceApproved','activationReady'])assert.equal(r[k],false);
   assert.equal(r.snapshotHash,sha(raw));assert.equal(r.traceHash,sha(JSON.stringify(p.trace)));assert.deepEqual(r.provenance,p.provenance);assert.equal(p.provenance.version,'progression-panel-arm-v26-1');assert.equal(p.provenance.mode,mode);assert.deepEqual(p.provenance.config,config);assert.equal(p.provenance.protocolHash,protocolHash);
   const windowPolicyHash=sha(replaceOnceV26(controller,"START=Date.parse('2026-10-19T03:00:00Z')","START=Date.parse('2026-10-19T03:00:00Z')+"+(config.startHour*3600000)));assert.deepEqual(p.provenance.sources,{windowPolicyHash,...sources});
   validateEvidenceV24(p.campaign,p.trace,config,120);assert.deepEqual(r.endpoint,endpointV24(p.campaign));
   if(mode==='zero'){
    assert.equal(Object.values(p.trace.groups).reduce((n,g)=>n+(g.directExtraMs??0),0),0);
    assert.deepEqual(r.nativeReplay,{referenceHash:reference.hash,exactDailyState:true,exactFinalState:true});assert.deepEqual(semanticV26(p.campaign),reference.campaign,'FULL_NATIVE_BASELINE_REPLAY');
   }else assert.equal(r.nativeReplay,null);
   const start=WORLD_START_V24+config.startHour*3600000,full=decomposeTimeV25(p.trace,{start,expectedCredit:p.campaign.run.economy.masteryMs,expectedWall:120*86400000});
   // Return jumps cannot be allocated to preMax by the frozen observer; never guess.
   const preMax=p.trace.maxReachedAtMs!==null&&p.trace.returnJumpMs===0?decomposeTimeV25(p.trace,{start,phase:'preMax',expectedCredit:8294400000,expectedWall:p.trace.maxReachedAtMs-start}):null;
   arms[mode]={endpoint:r.endpoint,hash:sha(raw),full,preMax};
  }
  const b=arms.zero,c=arms.calendar,old=previous.rows.find(r=>r.key===key);assert.deepEqual(b.endpoint,old.baseline);
  rows.push({key,config,days:120,baseline:b.endpoint,candidate:c.endpoint,...compareCampaignV22(c.endpoint,b.endpoint),baselineHash:b.hash,candidateHash:c.hash,exactNativeReplay:true,previousV22:{candidate:old.candidate,nonRegression:old.nonRegression,primaryGain:old.primaryGain,meaningfulBenefit:old.meaningfulBenefit},full:compareDecompositionV25(b.full,c.full),preMax:b.preMax&&c.preMax?compareDecompositionV25(b.preMax,c.preMax):null});
 }
 assert.equal(rows.length,14);assert.equal(new Set(rows.map(r=>r.key)).size,14);
 const windows=[0,12,20].map(startHour=>{const xs=rows.filter(r=>r.config.schedule==='casual'&&r.config.startHour===startHour);assert.equal(xs.length,2);return {startHour,pairs:xs.length,nonRegressionPassed:xs.filter(x=>x.nonRegression).length,meaningfulBenefitPassed:xs.filter(x=>x.meaningfulBenefit).length};});
 return JSON.parse(JSON.stringify({version:'progression-panel-v26-audit-1',protocolHash,sources,auditorHash:sha(await readFile(new URL(import.meta.url))),previousPanelHash:sha(JSON.stringify(previous)),diagnosticSourceHash:sha(await readFile('scripts/economy-v2/progression-diagnosis-v25.mjs')),metricsHash:sha(await readFile('scripts/economy-v2/progression-campaign-metrics-v22.mjs')),integrityPassed:true,totalPairs:14,completeArms:28,exactNativeReplays:14,nonRegressionPassed:rows.filter(r=>r.nonRegression).length,meaningfulBenefitPassed:rows.filter(r=>r.meaningfulBenefit).length,nonRegressionGatePassed:rows.every(r=>r.nonRegression),meaningfulBenefitGatePassed:rows.every(r=>r.meaningfulBenefit),minimumPrimaryBenefit:0.01,windows,rows,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'H26 exact predeclared14pairs,28complete120day arms. Every native control reexecutes and reproduces its entire archived campaign. Same rates/calendar/controller and V22 criteria; no post-result tuning or deletion of negatives. Time decomposition is accounting, not isolated causal attribution. No acquired social cohort, population approval or human playtest.'}));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);for(const arg of args)assert.ok(arg==='--verify','UNKNOWN_ARGUMENT');const out='docs/plans/hunts-builds/progression-bonus-v26/local/summary.json',r=await auditPanelV26();
 if(args.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),r);else await writeFile(out,JSON.stringify(r,null,2)+'\n');
 console.log(JSON.stringify({integrityPassed:r.integrityPassed,totalPairs:14,completeArms:28,exactNativeReplays:14,nonRegressionPassed:r.nonRegressionPassed,meaningfulBenefitPassed:r.meaningfulBenefitPassed,runtimeEnabled:false}));
}
