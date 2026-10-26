import {test} from 'node:test';
import assert from 'node:assert/strict';
import {decomposeTimeV25,compareDecompositionV25,firstDifferencesV25} from '../economy-v2/progression-diagnosis-v25.mjs';

// Hand-computed identities, independent of any acquired campaign or candidate quote.
const trace=()=>({groups:{'online/main/preMax':{combatMs:100,internalTransitionMs:20,externalTransitionMs:10,pausedMs:30,qualifiedVictoryMs:90,sameEncounterBaseMs:60,referenceLossMs:10,benchmarkLossMs:15,maximumCapLossMs:5,directExtraMs:10,creditMs:70}},eventMs:5,eventByPhase:{preMax:5},returnJumpMs:7,maxReachedAtMs:1165});
test('fixed-horizon identity accounts for return jumps outside the native advance observer',()=>{
 const t=trace(),r=decomposeTimeV25(t,{start:1000,expectedCredit:70,expectedWall:172});
 assert.deepEqual(r.components,{unqualifiedEncounterMs:30,externalTransitionMs:10,pausedMs:30,eventMs:5,returnJumpMs:7,referenceLossMs:10,benchmarkLossMs:15,maximumCapLossMs:5,directExtraMs:-10});
 assert.equal(Object.values(r.components).reduce((a,b)=>a+b,0),102);
 assert.equal(r.activities['online/main'].qualifiedVictoryMs,90);
});
test('pre-maximum identity excludes post-maximum time and requires a localized exact clock',()=>{
 const t=trace();t.returnJumpMs=0;t.groups['offline/coal/afterMax']={combatMs:50,qualifiedVictoryMs:50,maximumCapLossMs:50};t.eventMs+=9;
 const r=decomposeTimeV25(t,{start:1000,phase:'preMax',expectedCredit:70,expectedWall:165});assert.equal(r.wallMs,165);assert.equal(r.activities['offline/coal'],undefined);
 t.returnJumpMs=1;assert.throws(()=>decomposeTimeV25(t,{start:1000,phase:'preMax',expectedCredit:70,expectedWall:165}),/PREMAX_RETURN_JUMP/);
 t.returnJumpMs=0;t.maxReachedAtMs=null;assert.throws(()=>decomposeTimeV25(t,{start:1000,phase:'preMax',expectedCredit:70,expectedWall:165}));
});
test('fixed horizon compares credit differences while equal-credit maximum compares time differences',()=>{
 const baseline=decomposeTimeV25(trace(),{start:1000,expectedCredit:70,expectedWall:172}),t=trace();
 t.groups['online/main/preMax'].directExtraMs+=3;t.groups['online/main/preMax'].creditMs+=3;
 const candidate=decomposeTimeV25(t,{start:1000,expectedCredit:73,expectedWall:172});
 assert.deepEqual(compareDecompositionV25(baseline,candidate),{difference:{unqualifiedEncounterMs:0,externalTransitionMs:0,pausedMs:0,eventMs:0,returnJumpMs:0,referenceLossMs:0,benchmarkLossMs:0,maximumCapLossMs:0,directExtraMs:-3},wallDifferenceMs:0,creditDifferenceMs:3,netDifferenceMs:-3});
 const x=trace();x.returnJumpMs=0;const b=decomposeTimeV25(x,{start:1000,phase:'preMax',expectedCredit:70,expectedWall:165});x.groups['online/main/preMax'].externalTransitionMs+=4;x.maxReachedAtMs+=4;
 const c=decomposeTimeV25(x,{start:1000,phase:'preMax',expectedCredit:70,expectedWall:169});assert.equal(compareDecompositionV25(b,c).netDifferenceMs,4);
 assert.deepEqual(JSON.parse(JSON.stringify(compareDecompositionV25(b,c))),compareDecompositionV25(b,c));
});
test('missing time, invalid counters, inconsistent credit and unclassified time fail closed',()=>{
 for(const mutate of [t=>{t.groups['online/main/preMax'].combatMs++;},t=>{t.groups['online/main/preMax'].creditMs++;},t=>{t.groups['online/main/preMax'].qualifiedVictoryMs++;},t=>{t.groups['online/main/preMax'].pausedMs=-1;},t=>{t.groups['online/main/preMax'].unclassifiedMs=1;},t=>{t.returnJumpMs=0;}]){
  const t=trace();mutate(t);assert.throws(()=>decomposeTimeV25(t,{start:1000,expectedCredit:70,expectedWall:172}));
 }
});
test('first daily divergences distinguish credit, floors, draws, actions and decisions without causal attribution',()=>{
 const a={trace:{days:[{day:1,drawDigest:'a',actionDigest:'b',decisionDigest:'c'},{day:2,drawDigest:'d',actionDigest:'e',decisionDigest:'f'}]},campaign:{rows:[{day:1,masteryMs:1,highest:{main:1}},{day:2,masteryMs:2,highest:{main:2}}]}},b=structuredClone(a);
 assert.deepEqual(firstDifferencesV25(a,b),{drawDigest:null,actionDigest:null,decisionDigest:null,masteryDay:null,floorDay:null});
 b.trace.days[1].drawDigest='x';b.trace.days[1].actionDigest='y';b.trace.days[0].decisionDigest='z';b.campaign.rows[0].masteryMs++;b.campaign.rows[1].highest.main++;
 assert.deepEqual(firstDifferencesV25(a,b),{drawDigest:2,actionDigest:2,decisionDigest:1,masteryDay:1,floorDay:2});
 b.trace.days.pop();assert.throws(()=>firstDifferencesV25(a,b));
});
