// Endpoint/difference summary only. No balances, transactions, daily rows or state snapshots are emitted.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import assert from 'node:assert/strict';
const sha=x=>createHash('sha256').update(x).digest('hex'),root='docs/plans/hunts-builds/progression-bonus-v20',reference=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8')),rows=[];
for(const schedule of ['best','casual']){
 const entry=reference.rows.find(x=>x.schedule===schedule&&x.build==='swift'&&x.seed===4213),bb=await readFile(`docs/plans/hunts-builds/campaign-v10/samples/${entry.file}`);assert.equal(sha(bb),entry.archiveSha256);const br=gunzipSync(bb);assert.equal(sha(br),entry.sha256);const baseline=JSON.parse(br);
 const cr=gunzipSync(await readFile(`${root}/campaigns/${schedule}-swift-4213-calendar.json.gz`)),candidate=JSON.parse(cr),p=JSON.parse(await readFile(`${root}/campaigns/${schedule}-swift-4213-calendar.results.json`,'utf8'));assert.equal(sha(cr),p.checkpointSha256);assert.equal(candidate.v21.originalSourceHash,reference.sourceHash);
 const pairs=candidate.rows.map((c,i)=>({candidate:c,baseline:baseline.rows[i]})),first=f=>pairs.find(x=>f(x.candidate,x.baseline))?.candidate.day??null;
 rows.push({schedule,seed:4213,days:candidate.day,baselineSha256:sha(br),candidateSha256:sha(cr),firstMasteryDifferenceDay:first((c,b)=>c.masteryMs!==b.masteryMs),firstMasteryLagDay:first((c,b)=>c.masteryMs<b.masteryMs),firstAttributesDifferenceDay:first((c,b)=>!isDeepStrictEqual(c.attributes,b.attributes)),firstEquipmentDifferenceDay:first((c,b)=>!isDeepStrictEqual(c.equipment,b.equipment)),firstDefeatCountDifferenceDay:first((c,b)=>c.defeats!==b.defeats),aheadDays:pairs.filter(x=>x.candidate.masteryMs>x.baseline.masteryMs).length,behindDays:pairs.filter(x=>x.candidate.masteryMs<x.baseline.masteryMs).length,finalMasteryDelta:candidate.rows.at(-1).masteryMs-baseline.rows.at(-1).masteryMs});
}
const result={version:'progression-v21-diagnosis-1',rows,conclusion:'Daily evidence establishes changed adaptive trajectories, not causality. Same initial RNG seed does not guarantee common random draws after the action sequence changes. Per-encounter monotonic XP does not prove longitudinal benefit. V22 holds the controller and nominal rates fixed, tests a different formula on all seven references and retains negative cases.',runtimeEnabled:false};
const out='docs/plans/hunts-builds/progression-bonus-v22/v21-diagnosis.json';if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),result);else await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
