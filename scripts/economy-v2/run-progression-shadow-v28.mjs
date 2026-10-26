import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {createAdapterV28} from './progression-adapter-v28.mjs';
import {CASES_V28,caseKeyV28,PROTOCOL_V28} from './progression-panel-v28.mjs';
import {sourcesV28} from './progression-sources-v28.mjs';
import {nativeReferenceV26,semanticV26} from './progression-reference-v26.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
import {validateShadowV28,shaV28} from './progression-shadow-v28.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));for(const k of Object.keys(args))assert.ok(['case','days','resume'].includes(k),'UNKNOWN_ARGUMENT');
 const config=CASES_V28.find(c=>caseKeyV28(c)===args.case),days=Number(args.days??120);assert.ok(config,'CASE_NOT_PREREGISTERED');assert.ok(Number.isInteger(days)&&days>=1&&days<=120);if(args.resume!==undefined)assert.ok(['true','false'].includes(args.resume),'INVALID_RESUME');
const root='docs/plans/hunts-builds/progression-shadow-v28/local',key=caseKeyV28(config),dir=root+'/'+key,checkpoint=dir+'/checkpoint.json',saved=args.resume==='true'?JSON.parse(await readFile(checkpoint,'utf8')):null;
const lab=await createAdapterV28({startHour:config.startHour,savedShadow:saved?.shadow,savedTrace:saved?.trace});
try{
 const sources=await sourcesV28(config.startHour);for(const [k,v]of Object.entries(lab.sources))assert.equal(sources[k],v,'FACTORY_SOURCE_MISMATCH');
 const reference=await nativeReferenceV26(config),oldRaw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-bonus-v26/local/'+key+'-zero.json.gz')),prior=JSON.parse(oldRaw),oldReport=JSON.parse(await readFile('docs/plans/hunts-builds/progression-bonus-v26/local/'+key+'-zero.results.json','utf8'));assert.equal(shaV28(oldRaw),oldReport.snapshotHash);assert.deepEqual(semanticV26(prior.campaign),reference.campaign);for(const k of ['nativeHash','offlineHash','controllerHash'])assert.equal(reference[k],sources[k]);
 const provenance={version:'progression-shadow-arm-v28-1',config,sources,protocolHash:shaV28(JSON.stringify(PROTOCOL_V28)),referenceHash:reference.hash,referenceZeroHash:shaV28(oldRaw)};
 if(saved)assert.deepEqual(saved.provenance,provenance,'CHECKPOINT_SOURCE_CHANGED');const c=saved?.campaign??lab.campaign.initialCampaign(config);if(saved){assert.ok(c.day<=days);validateEvidenceV24(c,saved.trace,config,c.day);validateShadowV28(saved.shadow,saved.trace,c);}
 await mkdir(dir,{recursive:true});
 while(c.day<days){
  lab.campaign.campaignDay(c);assert.deepEqual(c.rows.at(-1),reference.campaign.rows[c.day-1],'NATIVE_DAILY_REPLAY');const finished=lab.observer.finishDay(c.day);validateEvidenceV24(c,finished.trace,config,c.day);validateShadowV28(finished.shadow,finished.trace,c);assert.deepEqual(finished.trace.days.at(-1),prior.trace.days[c.day-1],'NATIVE_DIGEST_REPLAY');
  const path=dir+`/day-${String(c.day).padStart(3,'0')}.json.gz`;await writeFile(path+'.tmp',finished.archive);await rename(path+'.tmp',path);await writeFile(checkpoint+'.tmp',JSON.stringify({provenance,campaign:c,trace:finished.trace,shadow:finished.shadow})+'\n');await rename(checkpoint+'.tmp',checkpoint);console.log(JSON.stringify({key,day:c.day,integrityPassed:true,victories:finished.shadow.ordinal}));
 }
 const trace=lab.trace.snapshot(),shadow=lab.observer.snapshot();if(c.day===120){assert.deepEqual(semanticV26(c),reference.campaign,'NATIVE_FINAL_REPLAY');assert.deepEqual(trace,prior.trace,'NATIVE_FULL_TRACE_REPLAY');}
 const payload={provenance,campaign:c,trace,shadow},raw=Buffer.from(JSON.stringify(payload)+'\n'),report={version:'progression-shadow-report-v28-1',provenance,days:c.day,complete:c.day===120,snapshotHash:shaV28(raw),traceHash:shaV28(JSON.stringify(trace)),shadowHash:shaV28(JSON.stringify(shadow)),endpoint:endpointV24(c),banks:shadow.banks,ledgerDays:shadow.days.length,exactDailyState:true,exactFinalState:c.day===120,exactNativeTrace:c.day===120,integrityPassed:validateEvidenceV24(c,trace,config,c.day)&&validateShadowV28(shadow,trace,c),runtimeEnabled:false,balanceApproved:false,activationReady:false};
 await writeFile(dir+'/snapshot.json.gz',gzipSync(raw,{level:9}));await writeFile(dir+'/results.json',JSON.stringify(report,null,2)+'\n');await unlink(checkpoint);console.log(JSON.stringify({finished:true,key,days:c.day}));
}finally{await lab.dispose();}
