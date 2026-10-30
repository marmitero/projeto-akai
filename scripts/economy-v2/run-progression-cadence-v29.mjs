// Full states and lifecycle ledgers remain private in ignored local/.
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {createAdapterV29} from './progression-adapter-v29.mjs';
import {sourcesV29} from './progression-sources-v29.mjs';
import {CASES_V29,caseKeyV29,PROTOCOL_V29} from './progression-panel-v29.mjs';
import {shaV29,validateCadenceV29} from './progression-cadence-v29.mjs';
import {nativeReferenceV26,semanticV26} from './progression-reference-v26.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));for(const k of Object.keys(args))assert.ok(['case','mode','days','resume'].includes(k),'UNKNOWN_ARGUMENT');if(args.resume!==undefined)assert.ok(['true','false'].includes(args.resume),'INVALID_RESUME');
const key=args.case??caseKeyV29(CASES_V29[0]),config=CASES_V29.find(c=>caseKeyV29(c)===key),mode=args.mode??'zero',days=Number(args.days??120);assert.ok(config,'CASE_NOT_PREREGISTERED');assert.ok(['zero','calendar'].includes(mode));assert.ok(Number.isInteger(days)&&days>=1&&days<=120);
const dir=`docs/plans/hunts-builds/progression-cadence-v29/local/${key}-${mode}`,cp=dir+'/checkpoint.json',saved=args.resume==='true'?JSON.parse(await readFile(cp,'utf8')):null,reference=await nativeReferenceV26(config),oldRaw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-bonus-v26/local/'+key+'-zero.json.gz')),old=JSON.parse(oldRaw);
const sources=await sourcesV29(config.startHour),provenance={version:'progression-cadence-arm-v29-1',config,mode,sources,protocolHash:shaV29(JSON.stringify(PROTOCOL_V29)),referenceHash:reference.hash,referenceZeroHash:shaV29(oldRaw)};if(saved)assert.deepEqual(saved.provenance,provenance,'CHECKPOINT_SOURCE_CHANGED');
for(const k of ['nativeHash','offlineHash','controllerHash'])assert.equal(sources[k],reference[k],'NATIVE_REFERENCE_SOURCE_CHANGED');
const lab=await createAdapterV29({mode,startHour:config.startHour,savedTrace:saved?.trace,savedCadence:saved?.cadence});
try{
 const c=saved?.campaign??lab.campaign.initialCampaign(config);assert.ok(c.day<=days,'CHECKPOINT_AFTER_TARGET');if(saved){validateEvidenceV24(c,saved.trace,config,c.day);validateCadenceV29(saved.cadence,saved.trace,c);}await mkdir(dir,{recursive:true});
 while(c.day<days){lab.campaign.campaignDay(c);const trace=lab.trace.finishDay(c.day),day=lab.cadence.finishDay(c.day);validateEvidenceV24(c,trace,config,c.day);validateCadenceV29(day.state,trace,c);
  if(mode==='zero'){assert.deepEqual(c.rows.at(-1),reference.campaign.rows[c.day-1],'NATIVE_DAILY_REPLAY');assert.deepEqual(trace.days.at(-1),old.trace.days[c.day-1],'NATIVE_DAILY_TRACE_REPLAY');}
  const file=dir+`/day-${String(c.day).padStart(3,'0')}.json.gz`;await writeFile(file+'.tmp',day.archive);await rename(file+'.tmp',file);await writeFile(cp+'.tmp',JSON.stringify({provenance,campaign:c,trace,cadence:day.state})+'\n');await rename(cp+'.tmp',cp);console.log(JSON.stringify({key,mode,day:c.day,integrityPassed:true}));
 }
 const trace=lab.trace.snapshot(),cadence=lab.cadence.snapshot();if(mode==='zero'&&days===120){assert.deepEqual(semanticV26(c),reference.campaign,'NATIVE_FULL_REPLAY');assert.deepEqual(trace,old.trace,'NATIVE_FULL_TRACE_REPLAY');}
 const raw=Buffer.from(JSON.stringify({provenance,campaign:c,trace,cadence})+'\n'),report={version:'progression-cadence-report-v29-1',provenance,days:c.day,complete:c.day===120,integrityPassed:validateEvidenceV24(c,trace,config,c.day)&&validateCadenceV29(cadence,trace,c),snapshotHash:shaV29(raw),traceHash:shaV29(JSON.stringify(trace)),cadenceHash:shaV29(JSON.stringify(cadence)),endpoint:endpointV24(c),ledgerDays:cadence.days.length,nativeReplay:mode==='zero'?{referenceHash:reference.hash,exactDailyState:true,exactFinalState:c.day===120,exactNativeTrace:c.day===120}:null,runtimeEnabled:false,balanceApproved:false,activationReady:false};
 await writeFile(dir+'/snapshot.json.gz',gzipSync(raw,{level:6}));await writeFile(dir+'/results.json',JSON.stringify(report,null,2)+'\n');await unlink(cp);console.log(JSON.stringify({finished:true,key,mode,days:c.day}));
}finally{await lab.dispose();}
