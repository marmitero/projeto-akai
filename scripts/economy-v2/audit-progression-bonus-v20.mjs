// Isolated paired encounter diagnostics. Never patches or imports a bonus into a live writer.
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {startCombatV3,advanceCombatV3,ECONOMY_XP_V2,heroStatsV3,huntEnemyV4,ITEMS} from '../../packages/shared/dist/index.js';
import {quoteMasteryV20,PROGRESSION_BONUS_V20,guildRateV20} from '../../packages/shared/dist/progression-bonus-v20/index.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const sourcePath='packages/shared/dist/economy-run-v6.js',native=await readFile(sourcePath,'utf8');
for(const name of ['benchmark','mastery','enemies'])assert.ok(native.includes('function '+name+'('),'NATIVE_DIAGNOSTIC_EXPORT_CHANGED');
const temp=resolve('packages/shared/dist/.progression-v20-'+randomUUID()+'.mjs');
const acquired=JSON.parse(await readFile('docs/plans/hunts-builds/campaign-v10/results.json','utf8')),bps=[0,100,300,500,700,1000,2000,3000,4000],rows=[];
try{
 // Append exports only to a disposable copy; the exact native functions are unchanged.
 await writeFile(temp,native+'\nexport {benchmark as benchmarkDiagnostic, mastery as masteryDiagnostic, enemies as enemiesDiagnostic};\n');
 const {benchmarkDiagnostic:benchmark,masteryDiagnostic:mastery,enemiesDiagnostic:enemies}=await import(pathToFileURL(temp).href);
 for(const source of acquired.rows){
  const bytes=await readFile('docs/plans/hunts-builds/campaign-v10/samples/'+source.file);assert.equal(sha(bytes),source.archiveSha256);const raw=gunzipSync(bytes);assert.equal(sha(raw),source.sha256);const c=JSON.parse(raw);assert.equal(c.provenance.sourceHash,acquired.sourceHash);
  for(const day of [1,7,30,60,90,120]){
   const row=c.rows[day-1];const snapshot=structuredClone(c.run.economy);Object.assign(snapshot,{masteryMs:row.masteryMs,attributes:row.attributes,highest:row.highest,inventory:row.equipment});snapshot.equipped=Object.fromEntries(Object.entries(snapshot.equipped).map(([slot,id])=>[slot,row.equipment.some(i=>i.id===id)?id:null]));
   // Recover slot identity from item definitions, not final-day IDs, using a recorded row's acquired pieces.
   snapshot.equipped=Object.fromEntries(Object.keys(snapshot.equipped).map(k=>[k,null]));for(const item of row.equipment){let slot=ITEMS[item.definitionId].slot;if(slot==='ring1'&&snapshot.equipped.ring1)slot='ring2';snapshot.equipped[slot]=item.id;}
   const stats=heroStatsV3(snapshot);assert.deepEqual(stats,row.stats);
   for(const activity of ['main','coal','iron','gold'])for(const fraction of [0.25,0.5,0.8,1,'frontier']){
    if(!row.highest[activity]||fraction==='frontier'&&(activity!=='main'||row.highest.main===1000))continue;
    let floor=fraction==='frontier'?row.highest.main+1:Math.max(1,Math.min(row.highest[activity],Math.floor(row.level*fraction)));if(activity==='main'&&fraction!=='frontier'&&floor%10===0)floor--;const boss=activity==='main'&&floor%10===0,maxWaves=activity==='main'&&!boss?3:1,reference=activity==='main'?floor:huntEnemyV4(activity,floor).reference;
    for(const seed of [1,4213,3735928559]){
     let hp=stats.maxHp,qualifiedMs=0,elapsed=0,status='victory';
     for(let wave=1;wave<=maxWaves;wave++){
      let fight=startCombatV3(stats,enemies(activity,floor,wave),{seed,floor:reference,at:elapsed,...(maxWaves===1?{deadlineMs:elapsed+30000}:{})});fight.actors[0].hp=hp;let r;
      do{r=advanceCombatV3(fight,elapsed+3600000,10000);fight=r.state;}while(r.backlog);
      status=fight.status;if(status!=='victory'){qualifiedMs=0;break;}qualifiedMs+=fight.clockMs-elapsed;hp=fight.actors[0].hp;elapsed=fight.clockMs+(wave<maxWaves?3000:0);
     }
     if(status==='victory'&&maxWaves===3)qualifiedMs+=6000;
     const observation={sample:source.file,day,level:row.level,activity,fraction,floor,reference,seed,status,qualifiedMs,baseMs:0,quotes:[]};
     if(qualifiedMs){
      const s=structuredClone(c.run);s.economy.masteryMs=row.masteryMs;s.xpCarry=0;mastery(s,qualifiedMs,activity,floor,reference);
      const input={masteryMs:row.masteryMs,carry:0,qualifiedMs,reference,bonusBps:0},cap=level=>benchmark(level,activity,floor),base=quoteMasteryV20(input,cap);assert.equal(base.masteryMs,s.economy.masteryMs);assert.equal(base.carry,s.xpCarry);observation.baseMs=base.gainedMs;
      let previous=base.gainedMs;for(const bonusBps of bps){const q=quoteMasteryV20({...input,bonusBps},cap);assert.ok(q.gainedMs>=previous);assert.ok(q.gainedMs<=qualifiedMs);assert.ok(q.masteryMs<=ECONOMY_XP_V2[999]);previous=q.gainedMs;observation.quotes.push({bonusBps,gainedMs:q.gainedMs,carry:q.carry});}
     }
     rows.push(observation);
    }
   }
  }
 }
}finally{await unlink(temp).catch(()=>{});}
const summaries=bps.map(bonusBps=>{const valid=rows.filter(r=>r.qualifiedMs),base=valid.reduce((n,r)=>n+r.baseMs,0),total=valid.reduce((n,r)=>n+r.quotes.find(q=>q.bonusBps===bonusBps).gainedMs,0);return{bonusBps,baseMs:base,totalMs:total,extraMs:total-base,relativeGain:base?total/base-1:0,benefited:valid.filter(r=>r.quotes.find(q=>q.bonusBps===bonusBps).gainedMs>r.baseMs).length};});
const report={version:PROGRESSION_BONUS_V20.version,sourceHash:acquired.sourceHash,nativeCompiledHash:sha(native),modelHash:sha(await readFile('packages/shared/src/progression-bonus-v20/index.ts')),integrityPassed:true,balanceApproved:false,activationReady:false,runtimeEnabled:false,minimumQualifiedDays:ECONOMY_XP_V2[999]/86400000,scope:'Paired native tower/hunt/frontier encounters using acquired daily equipment/attributes from seven V10 campaigns. Zero-bonus quote exactly equals native mastery/carry. Starting carry0 is a diagnostic convention, not recorded daily carry. Guild membership/rank and permanent event overlap are counterfactual. No full boosted campaign, offline schedule segmentation, live wallet or character is modified.',guildRanks:[1,2,3,4,10,11].map(rank=>({rank,bps:guildRateV20(rank)})),selected:{guildMaximumBps:1000,eventBps:3000,additiveCapBps:4000,creditCeiling:'min(actual victorious qualified time,native benchmark); only the reference/floor penalty can be reduced'},observations:rows.length,caseHash:sha(JSON.stringify(rows)),caseArchive:'paired-encounters.json.gz (generated; full deterministic caseHash verified)' ,wins:rows.filter(r=>r.status==='victory').length,failures:rows.filter(r=>r.status!=='victory').length,summaries};
const details=Buffer.from(JSON.stringify(rows)+'\n'),archive='docs/plans/hunts-builds/progression-bonus-v20/paired-encounters.json.gz';if(process.argv.includes('--verify')){const prior=await readFile(archive).catch(e=>{if(e.code!=='ENOENT')throw e;return null;});if(prior)assert.deepEqual(gunzipSync(prior),details);}else await writeFile(archive,gzipSync(details,{level:9}));
const out='docs/plans/hunts-builds/progression-bonus-v20/calibration-results.json';if(process.argv.includes('--verify'))assert.deepEqual(JSON.parse(await readFile(out,'utf8')),report);else await writeFile(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({observations:report.observations,wins:report.wins,failures:report.failures,minimumQualifiedDays:report.minimumQualifiedDays,summaries,integrityPassed:true,balanceApproved:false,runtimeEnabled:false}));
