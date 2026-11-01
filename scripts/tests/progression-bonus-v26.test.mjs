import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {ECONOMY_XP_V2 as XP,masteryLevel} from '../../packages/shared/dist/economy-v2.js';
import {quoteMasteryV26 as quote,quoteMasterySegmentsV26 as segments,PROGRESSION_BONUS_V26 as P,bonusRateV26,guildRateV26} from '../../packages/shared/dist/progression-bonus-v26/index.js';
const MAX=XP[999],micro=x=>BigInt(x.masteryMs)*1000000n+BigInt(x.carry);
// Execute the unchanged native mastery body, not a second implementation of H26.
const native=await readFile('packages/shared/dist/economy-run-v6.js','utf8'),a=native.indexOf('function mastery('),b=native.indexOf('function grant(',a);
assert.ok(a>=0&&b>a);const nativeMastery=new Function('ECONOMY_XP_V2','masteryLevel','benchmark',native.slice(a,b)+'\nreturn mastery;');
test('zero bonus matches unchanged native credit and carry over levels, references and benchmark caps',()=>{
 for(const level of [1,2,10,99,500,998,999])for(const carry of [0,1,999999])for(const Q of [1,777,600000])for(const ref of [1,Math.max(1,level-8),1000]){
  const cap=l=>100+l*17,input={masteryMs:XP[level-1]+(level===999?0:13),carry,qualifiedMs:Q,reference:ref,bonusBps:0},s={economy:{masteryMs:input.masteryMs},xpCarry:carry};
  const gained=nativeMastery(XP,masteryLevel,cap)(s,Q,'main',ref,ref),r=quote(input,cap);assert.equal(r.masteryMs,s.economy.masteryMs);assert.equal(r.carry,s.xpCarry);assert.equal(r.gainedMs,gained);
 }
});
test('same-state bonus is monotone, no smaller than native and bounded by actual qualified time',()=>{
 for(const level of [1,10,250,731,999])for(const reference of [1,Math.max(1,level-20),1000])for(const Q of [1,12345,3600000]){
  const x={masteryMs:XP[level-1],carry:117,qualifiedMs:Q,reference},before=BigInt(x.masteryMs)*1000000n+117n;let last=before;
  for(const bonusBps of [0,100,300,500,700,1000,3000,4000]){const r=quote({...x,bonusBps},l=>Math.max(1,1000*l));assert.ok(micro(r)>=last);assert.ok(micro(r)-before<=BigInt(Q)*1000000n);assert.ok(r.masteryMs<=MAX);last=micro(r);}
 }
 assert.equal(P.runtimeEnabled,false);assert.equal(P.minimumQualifiedMs,96*86400000);
});
test('reference penalty remains quadratic even with40percent bonus and arbitrarily inefficient benchmark',()=>{
 const level=999,Q=86400000,x={masteryMs:XP[level-1],carry:0,qualifiedMs:Q,reference:1,bonusBps:4000},r=quote(x,()=>1);
 const bound=BigInt(Q)*1000000n*14000n/(BigInt(level*level)*10000n);assert.ok(micro(r)-BigInt(x.masteryMs)*1000000n<=bound);assert.ok(r.gainedMs<100);
});
test('closed-form rational quote for a single level uses whole-encounter Q across unequal segments',()=>{
 const L=731,Q=1000000,ref=700,cap=12345,ms=12345,rest=Q-ms,input={masteryMs:XP[L-1],carry:314159,qualifiedMs:Q,reference:ref,segments:[{ms,bonusBps:0},{ms:rest,bonusBps:4000}]};
 let expected=314159n;for(const s of input.segments){const rd=BigInt(L*L)*10000n,rn=BigInt(ref*ref)*BigInt(10000+s.bonusBps);const rr=rn<rd?rn:rd;const cn=BigInt(cap)*10000n+BigInt(Q-cap)*BigInt(s.bonusBps);expected+=BigInt(s.ms)*1000000n*rr*cn/(rd*BigInt(Q)*10000n);}
 const r=segments(input,()=>cap);assert.equal(micro(r),BigInt(input.masteryMs)*1000000n+expected);
});
test('coalescing equal-rate segments, carry, level crossings and maximum cap are deterministic and input is untouched',()=>{
 const x={masteryMs:XP[98]-10,carry:999999,qualifiedMs:1234567,reference:1000,bonusBps:3000},f=l=>5000*l,before=structuredClone(x),r=quote(x,f);
 assert.deepEqual(x,before);assert.ok(masteryLevel(r.masteryMs)>masteryLevel(x.masteryMs));
 assert.deepEqual(segments({masteryMs:x.masteryMs,carry:x.carry,qualifiedMs:x.qualifiedMs,reference:x.reference,segments:[{ms:1,bonusBps:3000},{ms:x.qualifiedMs-1,bonusBps:3000}]},f),r);
 const capped=quote({...x,masteryMs:MAX-1,reference:1000},()=>Number.MAX_SAFE_INTEGER);assert.equal(capped.masteryMs,MAX);assert.equal(capped.carry,0);
 assert.equal(quote({...x,masteryMs:MAX},f).gainedMs,0);
});
test('invalid data and inconsistent segment totals are rejected before a grant',()=>{
 const x={masteryMs:0,carry:0,qualifiedMs:100,reference:1,bonusBps:0};for(const patch of [{qualifiedMs:0},{reference:0},{bonusBps:4001},{carry:1000000},{masteryMs:MAX+1},{qualifiedMs:1.5},{bonusBps:NaN}])assert.throws(()=>quote({...x,...patch},()=>100));
 assert.throws(()=>quote(x,()=>0));assert.throws(()=>segments({masteryMs:0,carry:0,qualifiedMs:100,reference:1,segments:[{ms:99,bonusBps:0}]},()=>100),/SEGMENT_TIME_MISMATCH/);
});
test('guild membership, availability and offline event exclusions retain previous eligibility semantics',()=>{
 assert.deepEqual([1,2,3,4,10,11].map(guildRateV26),[1000,700,500,300,300,100]);
 const x={now:20,start:10,availableAt:15,end:30,rank:1,sameMembership:true,qualifiedAtBoundary:true,online:true,eventWindow:true};assert.equal(bonusRateV26(x).totalBps,4000);
 assert.equal(bonusRateV26({...x,online:false}).totalBps,1000);assert.equal(bonusRateV26({...x,sameMembership:false}).guildBps,0);assert.equal(bonusRateV26({...x,now:14}).guildBps,0);assert.equal(bonusRateV26({...x,now:30}).guildBps,0);
});
