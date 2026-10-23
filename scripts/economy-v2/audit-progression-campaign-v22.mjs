// Full synthetic states are read locally; the public result contains only endpoint conclusions and hashes.
import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {ECONOMY_XP_V2,masteryLevel,EconomyRunV6Schema,heroStatsV3,ITEMS} from '../../packages/shared/dist/index.js';
import {compareCampaignV22} from './progression-campaign-metrics-v22.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),DAY=86400000,root='docs/plans/hunts-builds/progression-bonus-v22';
const base=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8'));
const sourcePaths={nativeHash:'packages/shared/dist/economy-run-v6.js',offlineHash:'packages/shared/dist/offline-v7.js',controllerHash:'scripts/economy-v2/campaign-policy.mjs',modelHash:'packages/shared/src/progression-bonus-v22/index.ts',adapterHash:'scripts/economy-v2/progression-campaign-v22.mjs'};
const sources=Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(async([k,p])=>[k,sha(await readFile(p))])));
const rows=[];
for(const original of base.rows){
 const name=`${original.schedule}-${original.build}-${original.seed}`,baselineBytes=await readFile(`docs/plans/hunts-builds/campaign-v10/samples/${original.file}`);
 assert.equal(sha(baselineBytes),original.archiveSha256);const baselineRaw=gunzipSync(baselineBytes);assert.equal(sha(baselineRaw),original.sha256);const b=JSON.parse(baselineRaw);assert.equal(b.provenance.sourceHash,base.sourceHash);
 const raw=gunzipSync(await readFile(`${root}/campaigns/${name}-calendar.json.gz`)),c=JSON.parse(raw),p=JSON.parse(await readFile(`${root}/campaigns/${name}-calendar.results.json`,'utf8'));
 assert.equal(p.checkpointSha256,sha(raw));assert.equal(c.version,'progression-counterfactual-v22-1');
 for(const [k,v]of Object.entries(sources)){assert.equal(c.v22[k],v,k);assert.equal(p[k],v,k);}
 for(const k of ['seed','schedule','build']){assert.equal(c[k],original[k]);assert.equal(c.v22[k],original[k]);assert.equal(p[k],original[k]);}
 assert.equal(p.originalSourceHash,base.sourceHash);assert.equal(c.v22.originalSourceHash,base.sourceHash);assert.equal(c.v22.mode,'calendar');assert.equal(p.mode,'calendar');assert.equal(c.day,120);assert.equal(p.days,120);assert.equal(c.rows.length,120);
 for(const k of ['runtimeEnabled','balanceApproved','activationReady'])assert.equal(p[k],false);assert.equal(p.integrityPassed,true);
 const run=EconomyRunV6Schema.parse(c.run),hours=c.schedule==='best'?24:c.schedule==='regular'?16:2;
 assert.equal(c.activeFarmMs+c.offlineMs+c.eventMs+c.idleMs,120*DAY);assert.ok(c.activeFarmMs+c.eventMs<=120*hours*3600000);assert.ok(c.offlineMs<=120*8*3600000);assert.ok(run.economy.masteryMs<=c.activeFarmMs+c.offlineMs);
 for(const k of ['coin','coal','iron','gold','jade']){assert.equal(BigInt(c.gross[k])-BigInt(c.spent[k]),BigInt(run.economy.balances[k]));assert.equal(p.balances[k],run.economy.balances[k]);assert.equal(p.gross[k],c.gross[k]);assert.equal(p.spent[k],c.spent[k]);}assert.equal(c.gross.jade,'0');assert.equal(c.spent.jade,'0');assert.equal(c.earnedScrolls-c.spentScrolls,run.economy.protection);
 assert.deepEqual(p.timeMs,{activeFarm:c.activeFarmMs,offline:c.offlineMs,events:c.eventMs,idle:c.idleMs});assert.equal(p.attackEvents,c.attackEvents);assert.equal(p.earnedScrolls,c.earnedScrolls);assert.equal(p.spentScrolls,c.spentScrolls);
 for(const [i,r]of c.rows.entries()){
  assert.equal(r.day,i+1);assert.equal(r.level,masteryLevel(r.masteryMs));assert.ok(r.masteryMs<=Math.min(ECONOMY_XP_V2[999],(i+1)*(hours+(c.schedule==='best'?0:8))*3600000));if(i)assert.ok(r.masteryMs>=c.rows[i-1].masteryMs);
  const e=structuredClone(run.economy);Object.assign(e,{masteryMs:r.masteryMs,attributes:r.attributes,highest:r.highest,inventory:r.equipment});e.equipped=Object.fromEntries(Object.keys(e.equipped).map(k=>[k,null]));for(const item of r.equipment){let slot=ITEMS[item.definitionId].slot;if(slot==='ring1'&&e.equipped.ring1)slot='ring2';e.equipped[slot]=item.id;}assert.deepEqual(heroStatsV3(e),r.stats);
 }
 assert.deepEqual(p.rows,c.rows.map(r=>({day:r.day,level:r.level,masteryMs:r.masteryMs,highest:r.highest})));
 const last=c.rows.at(-1),bl=b.rows.at(-1);assert.equal(p.level,last.level);assert.deepEqual(p.highest,last.highest);assert.equal(run.economy.masteryMs,last.masteryMs);assert.equal(c.firstMaxDay,p.firstMaxDay);assert.equal(c.firstTower1000Day,p.firstTower1000Day);assert.equal(p.censored,c.firstMaxDay===null);if(c.firstMaxDay!==null)assert.ok(c.firstMaxDay>=96);
 const endpoint=x=>({masteryMs:x.rows.at(-1).masteryMs,level:x.rows.at(-1).level,floor:x.rows.at(-1).highest.main,maxDay:x.firstMaxDay,towerDay:x.firstTower1000Day});
 const candidate=endpoint(c),baseline=endpoint(b);rows.push({schedule:c.schedule,build:c.build,seed:c.seed,days:c.day,candidate,baseline,...compareCampaignV22(candidate,baseline),snapshotSha256:sha(raw),baselineSha256:sha(baselineRaw)});
}
const result={version:'progression-counterfactual-v22-audit-1',sources,originalSourceHash:base.sourceHash,integrityPassed:true,nonRegressionGatePassed:rows.every(r=>r.nonRegression),meaningfulBenefitGatePassed:rows.every(r=>r.meaningfulBenefit),minimumPrimaryBenefit:0.01,runtimeEnabled:false,balanceApproved:false,activationReady:false,scope:'Seven independent 120-day paired counterfactuals; three seeds, three builds, three schedules. Same native adaptive controller. Rank1 hypothetical from day8; daily event12h–18h America/Sao_Paulo online only; offline guild only. No acquired memberships or coupled population. Full local state/schema/equipment/accounting audit, not a replay proof or human playtest.',rows};
const out=root+'/campaign-summary.json';if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),result);else await writeFile(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
