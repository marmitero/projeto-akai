// Local lab: preserve the prior campaign's state, and attach a separate, resumable observer.
import {readFile,writeFile,mkdir,rename,unlink} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createAdapterV23} from './progression-adapter-v23.mjs';
import {validateTraceV23} from './progression-trace-v23.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('='))),mode=args.mode??'calendar',schedule=args.schedule??'best',build=args.build??'swift',seed=Number(args.seed??3735928559),days=Number(args.days??120),sha=x=>createHash('sha256').update(x).digest('hex');
assert.ok(['zero','calendar'].includes(mode));assert.ok(Number.isInteger(days)&&days>=1&&days<=120);assert.ok(['best','casual','regular'].includes(schedule));assert.ok(['swift','balanced','brute'].includes(build));assert.ok(Number.isInteger(seed)&&seed>0&&seed<=4294967295);
const root='docs/plans/hunts-builds/progression-trace-v23/local',name=`${schedule}-${build}-${seed}-${mode}`,checkpoint=`${root}/${name}.checkpoint.json`;
const acquired=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8')),entry=acquired.rows.find(x=>x.schedule===schedule&&x.build===build&&x.seed===seed);assert.ok(entry,'REFERENCE_REQUIRED');
let expected,referenceHash;
if(mode==='zero'){const bytes=await readFile(`docs/plans/hunts-builds/campaign-v10/samples/${entry.file}`);assert.equal(sha(bytes),entry.archiveSha256);const raw=gunzipSync(bytes);assert.equal(sha(raw),entry.sha256);expected=JSON.parse(raw);assert.equal(expected.provenance.sourceHash,acquired.sourceHash);referenceHash=sha(raw);}
else{const raw=gunzipSync(await readFile(`docs/plans/hunts-builds/progression-bonus-v22/campaigns/${schedule}-${build}-${seed}-calendar.json.gz`)),p=JSON.parse(await readFile(`docs/plans/hunts-builds/progression-bonus-v22/campaigns/${schedule}-${build}-${seed}-calendar.results.json`,'utf8'));assert.equal(sha(raw),p.checkpointSha256);expected=JSON.parse(raw);referenceHash=sha(raw);}
let saved=args.resume==='true'?JSON.parse(await readFile(checkpoint,'utf8')):null;
const lab=await createAdapterV23({mode,savedTrace:saved?.trace});
try{
 if(mode==='calendar')for(const k of ['nativeHash','offlineHash','controllerHash','modelHash'])assert.equal(expected.v22[k],lab.sources[k],'REFERENCE_SOURCE_CHANGED: '+k);
 const provenance={version:'progression-trace-run-v23-1',...lab.sources,runnerHash:sha(await readFile(new URL(import.meta.url))),mode,schedule,build,seed,referenceHash};if(saved)assert.deepEqual(saved.provenance,provenance,'TRACE_CHECKPOINT_SOURCE_CHANGED');
 const c=saved?.campaign??lab.campaign.initialCampaign({seed,schedule,build});await mkdir(root,{recursive:true});
 while(c.day<days){const row=lab.campaign.campaignDay(c);assert.deepEqual(row,expected.rows[c.day-1],'OBSERVER_CHANGED_DAILY_STATE');const trace=lab.trace.finishDay(c.day);validateTraceV23(trace,c.day);await writeFile(checkpoint+'.tmp',JSON.stringify({provenance,campaign:c,trace})+'\n');await rename(checkpoint+'.tmp',checkpoint);console.log(JSON.stringify({mode,day:c.day,dailyStateExact:true,unclassifiedMs:Object.values(trace.groups).reduce((n,g)=>n+(g.unclassifiedMs??0),0)}));}
 const semantic=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['version','provenance','v22'].includes(k)));
 if(days===120)assert.deepEqual(semantic(c),semantic(expected),'OBSERVER_CHANGED_FINAL_CAMPAIGN');
 const trace=lab.trace.snapshot(),out={provenance,days:c.day,complete:c.day===120,exactDailyState:true,exactFinalState:c.day===120,integrityPassed:validateTraceV23(trace,c.day),runtimeEnabled:false,balanceApproved:false,activationReady:false,semanticStateHash:sha(JSON.stringify(semantic(c))),trace,traceHash:sha(JSON.stringify(trace))};
 for(const k of ['coin','coal','iron','gold','jade'])assert.equal(BigInt(trace.actionDebits[k]??'0'),BigInt(c.spent[k]),'TRACE_PURCHASE_ACCOUNTING');
 assert.equal(Object.values(trace.groups).reduce((n,g)=>n+(g.creditMs??0),0),c.run.economy.masteryMs,'TRACE_CREDIT_ACCOUNTING');
 if(schedule==='best'&&trace.maxReachedAtMs!==null){const before=Object.entries(trace.groups).filter(([k])=>k.endsWith('/preMax')).reduce((n,[,g])=>n+(g.combatMs??0)+(g.internalTransitionMs??0)+(g.externalTransitionMs??0)+(g.pausedMs??0)+(g.unclassifiedMs??0),0);assert.equal(before+(trace.eventByPhase.preMax??0),trace.maxReachedAtMs-Date.parse('2026-10-19T03:00:00Z'),'TRACE_MAXIMUM_CLOCK');}
 await writeFile(`${root}/${name}.trace.json`,JSON.stringify(out,null,2)+'\n');await unlink(checkpoint);console.log(JSON.stringify({finished:true,mode,days:c.day,exactFinalState:out.exactFinalState}));
}finally{await lab.dispose();}
