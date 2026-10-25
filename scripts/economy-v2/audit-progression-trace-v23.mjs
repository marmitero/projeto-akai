// Full local evidence is mandatory. Public conclusions must be authored separately from this derived report.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {validateTraceV23} from './progression-trace-v23.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),START=Date.parse('2026-10-19T03:00:00Z');
const paths={nativeHash:'packages/shared/dist/economy-run-v6.js',offlineHash:'packages/shared/dist/offline-v7.js',controllerHash:'scripts/economy-v2/campaign-policy.mjs',modelHash:'packages/shared/src/progression-bonus-v22/index.ts',factoryHash:'scripts/economy-v2/progression-adapter-v23.mjs',observerHash:'scripts/economy-v2/progression-trace-v23.mjs',runnerHash:'scripts/economy-v2/trace-progression-campaign-v23.mjs'};
const semantic=x=>Object.fromEntries(Object.entries(x).filter(([k])=>!['version','provenance','v22'].includes(k)));
const fields=['combatMs','internalTransitionMs','externalTransitionMs','pausedMs','unclassifiedMs','qualifiedVictoryMs','creditMs','sameEncounterBaseMs','directExtraMs','referenceLossMs','benchmarkLossMs','maximumCapLossMs','victories','encounters','waves'];
function preMaximum(trace){
 const totals=Object.fromEntries(fields.map(k=>[k,0])),activities={};
 for(const [key,g]of Object.entries(trace.groups))if(key.endsWith('/preMax')){const a=key.split('/')[1];activities[a]??=Object.fromEntries(fields.map(k=>[k,0]));for(const field of fields){totals[field]+=g[field]??0;activities[a][field]+=g[field]??0;}}
 totals.eventMs=trace.eventByPhase.preMax??0;totals.unqualifiedEncounterMs=totals.combatMs+totals.internalTransitionMs-totals.qualifiedVictoryMs;assert.ok(totals.unqualifiedEncounterMs>=0);
 const components={unqualifiedEncounterMs:totals.unqualifiedEncounterMs,externalTransitionMs:totals.externalTransitionMs,pausedMs:totals.pausedMs,unclassifiedMs:totals.unclassifiedMs,eventMs:totals.eventMs,referenceLossMs:totals.referenceLossMs,benchmarkLossMs:totals.benchmarkLossMs,maximumCapLossMs:totals.maximumCapLossMs,directExtraMs:-totals.directExtraMs};
 totals.wallMs=totals.combatMs+totals.internalTransitionMs+totals.externalTransitionMs+totals.pausedMs+totals.unclassifiedMs+totals.eventMs;
 assert.equal(totals.wallMs-totals.creditMs,Object.values(components).reduce((a,b)=>a+b,0));assert.equal(totals.wallMs,trace.maxReachedAtMs-START);return {totals,activities,components};
}
export async function diagnoseTraceV23(root='docs/plans/hunts-builds/progression-trace-v23/local'){
 const sources=Object.fromEntries(await Promise.all(Object.entries(paths).map(async([k,p])=>[k,sha(await readFile(p))]))),cases=[];
 for(const mode of ['zero','calendar']){
  const bytes=await readFile(`${root}/best-swift-3735928559-${mode}.trace.json`),p=JSON.parse(bytes);assert.equal(p.provenance.version,'progression-trace-run-v23-1');assert.equal(p.provenance.mode,mode);assert.equal(p.provenance.seed,3735928559);assert.equal(p.provenance.schedule,'best');assert.equal(p.provenance.build,'swift');for(const [k,v]of Object.entries(sources))assert.equal(p.provenance[k],v,k+' changed');
  assert.equal(p.days,120);assert.equal(p.complete,true);assert.equal(p.exactDailyState,true);assert.equal(p.exactFinalState,true);assert.equal(p.integrityPassed,true);for(const k of ['runtimeEnabled','balanceApproved','activationReady'])assert.equal(p[k],false);assert.equal(sha(JSON.stringify(p.trace)),p.traceHash);validateTraceV23(p.trace,120);
  let c,raw;
  if(mode==='zero'){const index=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8')),entry=index.rows.find(x=>x.schedule==='best'&&x.build==='swift'&&x.seed===3735928559),archive=await readFile('docs/plans/hunts-builds/campaign-v10/samples/'+entry.file);assert.equal(sha(archive),entry.archiveSha256);raw=gunzipSync(archive);assert.equal(sha(raw),entry.sha256);c=JSON.parse(raw);assert.equal(c.provenance.sourceHash,index.sourceHash);}
  else{raw=gunzipSync(await readFile('docs/plans/hunts-builds/progression-bonus-v22/campaigns/best-swift-3735928559-calendar.json.gz'));const prior=JSON.parse(await readFile('docs/plans/hunts-builds/progression-bonus-v22/campaigns/best-swift-3735928559-calendar.results.json','utf8'));assert.equal(sha(raw),prior.checkpointSha256);c=JSON.parse(raw);for(const k of ['nativeHash','offlineHash','controllerHash','modelHash'])assert.equal(c.v22[k],sources[k]);}
  assert.equal(p.provenance.referenceHash,sha(raw));assert.equal(p.semanticStateHash,sha(JSON.stringify(semantic(c))));assert.equal(p.trace.eventMs,c.eventMs);assert.equal(p.trace.returnJumpMs,0);
  assert.equal(Object.values(p.trace.groups).reduce((n,g)=>n+(g.creditMs??0),0),c.run.economy.masteryMs);for(const k of ['coin','coal','iron','gold','jade'])assert.equal(BigInt(p.trace.actionDebits[k]??'0'),BigInt(c.spent[k]));for(const [k,n]of Object.entries(c.actions))assert.equal(p.trace.actions[k]??0,n);
  const preMax=preMaximum(p.trace);assert.equal(preMax.totals.creditMs,8294400000);assert.ok((p.trace.maxReachedAtMs-START)/86400000>=96);assert.ok(c.firstMaxDay*86400000>=p.trace.maxReachedAtMs-START);assert.ok(c.firstMaxDay*86400000-(p.trace.maxReachedAtMs-START)<=300000);
  cases.push({mode,days:120,exactDailyState:true,exactFinalState:true,traceSha256:sha(bytes),referenceHash:sha(raw),semanticStateHash:p.semanticStateHash,exactMaximumDay:(p.trace.maxReachedAtMs-START)/86400000,observedMaximumDay:c.firstMaxDay,observedTowerDay:c.firstTower1000Day,preMax,rng:p.trace.rng,actions:p.trace.actions,needs:p.trace.needs,decisions:p.trace.decisions,unclassifiedMs:Object.values(p.trace.groups).reduce((n,g)=>n+(g.unclassifiedMs??0),0),dayDigests:p.trace.days});
 }
 const [baseline,candidate]=cases,difference=Object.fromEntries(Object.keys(baseline.preMax.components).map(k=>[k,candidate.preMax.components[k]-baseline.preMax.components[k]])),delayMs=candidate.preMax.totals.wallMs-baseline.preMax.totals.wallMs;assert.equal(Object.values(difference).reduce((a,b)=>a+b,0),delayMs);
 const firstDigestDifference={};for(const k of ['drawDigest','actionDigest','decisionDigest'])firstDigestDifference[k]=candidate.dayDigests.find((d,i)=>d[k]!==baseline.dayDigests[i][k])?.day??null;
 return {version:'progression-trace-v23-diagnosis-1',sources,auditorHash:sha(await readFile(new URL(import.meta.url))),integrityPassed:true,exactStateReproduction:true,runtimeEnabled:false,balanceApproved:false,activationReady:false,cases,difference,exactMaximumDelayMs:delayMs,firstDigestDifference,scope:'One negative best/swift seed, two complete 120-day deterministic replicas. Read-only time/quote/action/RNG observations reproduce prior full semantic states. Difference components are exact accounting along different adaptive trajectories, not isolated causal effects. Same-encounter extra credit is a diagnostic quote, not campaign time saved. No source/rate/policy/RNG changes, no new population, no balance approval.'};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const root=process.argv.find(x=>x.startsWith('--root='))?.slice(7)??'docs/plans/hunts-builds/progression-trace-v23/local',out='docs/plans/hunts-builds/progression-trace-v23/local/diagnosis.json',result=await diagnoseTraceV23(root);
 if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),result);else await writeFile(out,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({integrityPassed:true,exactStateReproduction:true,delayMs:result.exactMaximumDelayMs,difference:result.difference,firstDigestDifference:result.firstDigestDifference,runtimeEnabled:false}));
}
