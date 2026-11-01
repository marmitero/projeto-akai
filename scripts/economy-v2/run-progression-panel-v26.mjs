// One arm of the predeclared V26 panel. Full states/financial accounting stay in ignored local/.
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAdapterV26} from './progression-adapter-v26.mjs';
import {nativeReferenceV26,semanticV26} from './progression-reference-v26.mjs';
import {PANEL_PROTOCOL_V26,CASES_V26,caseKeyV26} from './progression-panel-v26.mjs';
import {validateEvidenceV24,endpointV24} from './progression-evidence-v24.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),key=args.case??caseKeyV26(CASES_V26[0]),config=CASES_V26.find(c=>caseKeyV26(c)===key),mode=args.mode??'zero',days=Number(args.days??120),sha=x=>createHash('sha256').update(x).digest('hex');
for(const k of Object.keys(args))assert.ok(['case','mode','days','resume'].includes(k),'UNKNOWN_ARGUMENT: '+k);if(args.resume!==undefined)assert.ok(['true','false'].includes(args.resume),'INVALID_RESUME');
assert.ok(config,'CASE_NOT_PREREGISTERED');assert.ok(['zero','calendar'].includes(mode));assert.ok(Number.isInteger(days)&&days>=1&&days<=120);
const root='docs/plans/hunts-builds/progression-bonus-v26/local',name=`${key}-${mode}`,checkpoint=`${root}/${name}.checkpoint.json`,saved=args.resume==='true'?JSON.parse(await readFile(checkpoint,'utf8')):null;
const lab=await createAdapterV26({mode,startHour:config.startHour,savedTrace:saved?.trace});
try{
 const sources={...lab.sources,runnerHash:sha(await readFile(new URL(import.meta.url))),protocolSourceHash:sha(await readFile('scripts/economy-v2/progression-panel-v26.mjs')),validatorHash:sha(await readFile('scripts/economy-v2/progression-evidence-v24.mjs')),referenceSourceHash:sha(await readFile('scripts/economy-v2/progression-reference-v26.mjs'))},provenance={version:'progression-panel-arm-v26-1',sources,protocolHash:sha(JSON.stringify(PANEL_PROTOCOL_V26)),config,mode};
 if(saved)assert.deepEqual(saved.provenance,provenance,'CHECKPOINT_SOURCE_CHANGED');const reference=mode==='zero'?await nativeReferenceV26(config):null;if(reference)for(const k of ['nativeHash','offlineHash','controllerHash'])assert.equal(reference[k],sources[k]);const c=saved?.campaign??lab.campaign.initialCampaign(config);if(saved){assert.ok(c.day<=days,'CHECKPOINT_AFTER_TARGET');validateEvidenceV24(c,saved.trace,config,c.day);}await mkdir(root,{recursive:true});
 while(c.day<days){lab.campaign.campaignDay(c);if(reference)assert.deepEqual(c.rows.at(-1),reference.campaign.rows[c.day-1],'NATIVE_DAILY_REPLAY');const trace=lab.trace.finishDay(c.day);validateEvidenceV24(c,trace,config,c.day);if(mode==='zero')assert.equal(Object.values(trace.groups).reduce((n,g)=>n+(g.directExtraMs??0),0),0,'NATIVE_CONTROL_BONUS');await writeFile(checkpoint+'.tmp',JSON.stringify({provenance,campaign:c,trace})+'\n');await rename(checkpoint+'.tmp',checkpoint);console.log(JSON.stringify({key,mode,day:c.day,integrityPassed:true}));}
 if(reference&&c.day===120)assert.deepEqual(semanticV26(c),reference.campaign,'NATIVE_FINAL_REPLAY');
 const trace=lab.trace.snapshot(),raw=Buffer.from(JSON.stringify({provenance,campaign:c,trace})+'\n'),report={version:'progression-panel-report-v26-1',provenance,days:c.day,complete:c.day===120,integrityPassed:validateEvidenceV24(c,trace,config,c.day),endpoint:endpointV24(c),snapshotHash:sha(raw),traceHash:sha(JSON.stringify(trace)),nativeReplay:reference?{referenceHash:reference.hash,exactDailyState:true,exactFinalState:c.day===120}:null,runtimeEnabled:false,balanceApproved:false,activationReady:false};
 await writeFile(`${root}/${name}.json.gz`,gzipSync(raw,{level:9}));await writeFile(`${root}/${name}.results.json`,JSON.stringify(report,null,2)+'\n');await unlink(checkpoint);console.log(JSON.stringify({finished:true,key,mode,days:c.day,endpoint:report.endpoint}));
}finally{await lab.dispose();}
