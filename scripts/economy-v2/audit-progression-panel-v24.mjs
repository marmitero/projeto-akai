// Mandatory complete evidence; no balances or daily series are emitted by this summary.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {PANEL_PROTOCOL_V24,NEW_CASES_V24,INHERITED_CASES_V24,caseKeyV24} from './progression-panel-v24.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
import {compareCampaignV22} from './progression-campaign-metrics-v22.mjs';
import {replaceOnceV24} from './progression-adapter-v24.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const paths={nativeHash:'packages/shared/dist/economy-run-v6.js',offlineHash:'packages/shared/dist/offline-v7.js',controllerHash:'scripts/economy-v2/campaign-policy.mjs',modelHash:'packages/shared/src/progression-bonus-v22/index.ts',factoryHash:'scripts/economy-v2/progression-adapter-v24.mjs',observerHash:'scripts/economy-v2/progression-trace-v24.mjs',runnerHash:'scripts/economy-v2/run-progression-panel-v24.mjs',protocolSourceHash:'scripts/economy-v2/progression-panel-v24.mjs',validatorHash:'scripts/economy-v2/progression-evidence-v24.mjs'};
export async function auditPanelV24(root='docs/plans/hunts-builds/progression-panel-v24/local'){
 // Recompute legacy accounting/source/endpoint assertions; a cached positive result is insufficient.
 execFileSync(process.execPath,['scripts/economy-v2/audit-progression-campaign-v22.mjs','--verify'],{stdio:'pipe'});
 const inheritedBytes=await readFile('docs/plans/hunts-builds/progression-bonus-v22/campaign-summary.json'),old=JSON.parse(inheritedBytes);assert.equal(old.rows.length,7);
 const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[k,sha(await readFile(p))]))),protocolHash=sha(JSON.stringify(PANEL_PROTOCOL_V24)),controller=await readFile(paths.controllerHash,'utf8'),rows=[];
 for(const config of INHERITED_CASES_V24){const p=old.rows.find(x=>x.seed===config.seed&&x.schedule===config.schedule&&x.build===config.build);assert.ok(p);rows.push({key:caseKeyV24(config),origin:'inherited',config,days:120,baseline:p.baseline,candidate:p.candidate,...compareCampaignV22(p.candidate,p.baseline),baselineHash:p.baselineSha256,candidateHash:p.snapshotSha256});}
 assert.equal(rows.find(r=>r.config.seed===3735928559).nonRegression,false,'NEGATIVE_CASE_MUST_BE_RETAINED');
 for(const config of NEW_CASES_V24){
  const key=caseKeyV24(config),arms={};
  for(const mode of ['zero','calendar']){
   const name=`${key}-${mode}`,report=JSON.parse(await readFile(`${root}/${name}.results.json`,'utf8')),raw=gunzipSync(await readFile(`${root}/${name}.json.gz`)),p=JSON.parse(raw),windowPolicyHash=sha(replaceOnceV24(controller,"START=Date.parse('2026-10-19T03:00:00Z')","START=Date.parse('2026-10-19T03:00:00Z')+"+(config.startHour*3600000)));
   assert.equal(report.version,'progression-panel-report-v24-1');assert.equal(report.complete,true);assert.equal(report.days,120);assert.equal(report.integrityPassed,true);for(const k of ['runtimeEnabled','balanceApproved','activationReady'])assert.equal(report[k],false);
   assert.equal(report.snapshotHash,sha(raw));assert.equal(report.traceHash,sha(JSON.stringify(p.trace)));assert.deepEqual(report.provenance,p.provenance);assert.equal(p.provenance.version,'progression-panel-arm-v24-1');assert.equal(p.provenance.protocolHash,protocolHash);assert.deepEqual(p.provenance.config,config);assert.equal(p.provenance.mode,mode);assert.deepEqual(p.provenance.sources,{windowPolicyHash,...sources});
   validateEvidenceV24(p.campaign,p.trace,config,120);assert.deepEqual(report.endpoint,endpointV24(p.campaign));if(mode==='zero')assert.equal(Object.values(p.trace.groups).reduce((n,g)=>n+(g.directExtraMs??0),0),0);
   arms[mode]={endpoint:report.endpoint,hash:sha(raw)};
  }
  rows.push({key,origin:'new',config,days:120,baseline:arms.zero.endpoint,candidate:arms.calendar.endpoint,...compareCampaignV22(arms.calendar.endpoint,arms.zero.endpoint),baselineHash:arms.zero.hash,candidateHash:arms.calendar.hash});
 }
 assert.equal(rows.length,14);assert.equal(new Set(rows.map(r=>r.key)).size,14);
 const windows=[0,12,20].map(startHour=>{const subset=rows.filter(r=>r.config.schedule==='casual'&&r.config.startHour===startHour);assert.equal(subset.length,2);return {startHour,pairs:subset.length,nonRegressionPassed:subset.filter(r=>r.nonRegression).length,meaningfulBenefitPassed:subset.filter(r=>r.meaningfulBenefit).length,primaryGains:subset.map(r=>({seed:r.config.seed,gain:r.primaryGain}))};});
 const result={version:'progression-panel-v24-audit-1',protocolHash,sources,auditorHash:sha(await readFile(new URL(import.meta.url))),metricsHash:sha(await readFile('scripts/economy-v2/progression-campaign-metrics-v22.mjs')),inheritedSummaryHash:sha(inheritedBytes),integrityPassed:true,totalPairs:rows.length,newPairs:7,inheritedPairs:7,distinctSeeds:[...new Set(rows.map(r=>r.config.seed))].sort((a,b)=>a-b),nonRegressionPassed:rows.filter(r=>r.nonRegression).length,meaningfulBenefitPassed:rows.filter(r=>r.meaningfulBenefit).length,nonRegressionGatePassed:rows.every(r=>r.nonRegression),meaningfulBenefitGatePassed:rows.every(r=>r.meaningfulBenefit),newNonRegressionPassed:rows.filter(r=>r.origin==='new'&&r.nonRegression).length,newMeaningfulBenefitPassed:rows.filter(r=>r.origin==='new'&&r.meaningfulBenefit).length,windows,rows,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'Seven new120-day independent native-control/V22 pairs and seven retained audited V22 pairs. Fixed seeds/windows/formula/criteria; calendar profiles shift account creation and weekly age at global boundary. Not an isolated event intervention, random population sample, social cohort or human playtest. Full local state/time/financial accounting required; no full replay proof from the summary alone.'};
 // Report persistence must not manufacture differences such as signed zero.
 return JSON.parse(JSON.stringify(result));
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=process.argv.find(x=>x.startsWith('--root='))?.slice(7)??'docs/plans/hunts-builds/progression-panel-v24/local',out='docs/plans/hunts-builds/progression-panel-v24/local/summary.json',r=await auditPanelV24(root);if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),r);else await writeFile(out,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({integrityPassed:true,totalPairs:r.totalPairs,newPairs:r.newPairs,nonRegressionPassed:r.nonRegressionPassed,newNonRegressionPassed:r.newNonRegressionPassed,meaningfulBenefitPassed:r.meaningfulBenefitPassed,windows:r.windows,runtimeEnabled:false}));
}
