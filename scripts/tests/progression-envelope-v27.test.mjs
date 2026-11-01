import {test} from 'node:test';
import assert from 'node:assert/strict';
import {creditEnvelopeV27,timeFloorV27,quoteBridgeV27} from '../economy-v2/progression-envelope-v27.mjs';

test('censored endpoint gets a relaxed qualified-credit ceiling, not a demonstrated benefit',()=>{
 const r=creditEnvelopeV27({qualifiedMs:105,creditMs:90,referenceLossMs:5,benchmarkLossMs:10,capLossMs:0,maximumCredit:200});
 assert.equal(r.nativePenaltyPoolMs,15);assert.equal(r.relaxedFinalCreditMs,105);assert.equal(r.relaxedFinalExtraMs,15);assert.equal(r.relaxedPrimaryGain,15/90);assert.equal(r.onePercentNotRuledOut,true);assert.equal(r.frozenPathCompletionTimeIdentified,false);
});
test('one-percent necessary condition is compared exactly in integer arithmetic',()=>{
 const make=(credit,loss)=>creditEnvelopeV27({qualifiedMs:credit+loss,creditMs:credit,referenceLossMs:loss,benchmarkLossMs:0,capLossMs:0,maximumCredit:200});
 assert.equal(make(100,1).onePercentNotRuledOut,true);assert.equal(make(101,1).onePercentNotRuledOut,false);assert.equal(make(100,0).onePercentNotRuledOut,false);
});
test('maximum saturation and truncation are not mislabeled as zero time benefit or recoverable penalty',()=>{
 const r=creditEnvelopeV27({qualifiedMs:103,creditMs:100,referenceLossMs:2,benchmarkLossMs:0,capLossMs:1,maximumCredit:100});
 assert.equal(r.nativePenaltyPoolMs,2);assert.equal(r.capLossMs,1);assert.equal(r.relaxedPrimaryGain,null);assert.equal(r.relaxedFinalExtraMs,null);assert.equal(r.onePercentNotRuledOut,null);
 assert.deepEqual(timeFloorV27(110,100),{minimumElapsedMs:100,maximumPossibleAdvanceMs:10,maximumPossibleRelativeAdvance:10/110,scope:'Global qualified-time floor only; not a fixed-trajectory completion estimate'});assert.throws(()=>timeFloorV27(99,100));
});
test('same-state quoted extra can coexist with negative total credit on another adaptive trajectory',()=>{
 assert.deepEqual(quoteBridgeV27({nativeCreditMs:100,candidateBaseMs:95,directExtraMs:3,candidateCreditMs:98}),{directExtraMs:3,trajectoryBaseDifferenceMs:-5,netCreditDifferenceMs:-2,baseDifferenceOffsetsDirectQuote:true,directQuoteReversed:true});
 const good=quoteBridgeV27({nativeCreditMs:100,candidateBaseMs:102,directExtraMs:3,candidateCreditMs:105});assert.equal(good.netCreditDifferenceMs,5);assert.equal(good.trajectoryBaseDifferenceMs,2);assert.equal(good.directQuoteReversed,false);
 assert.throws(()=>quoteBridgeV27({nativeCreditMs:100,candidateBaseMs:95,directExtraMs:3,candidateCreditMs:99}));
});
test('identical credit loss aggregates permit different frozen-trajectory completion times',()=>{
 // Two artificial victory ledgers, not longitudinal evidence. Both last100units,
 // qualify97, credit96 natively and lose1. Oracle credits actual qualified time.
 const a=[{at:92,q:91,credit:90},{at:100,q:6,credit:6}],b=[{at:96,q:96,credit:95},{at:100,q:1,credit:1}];
 const complete=(xs,field)=>{let bank=0;for(const x of xs){bank+=x[field];if(bank>=96)return x.at;}return null;};
 for(const xs of [a,b]){assert.equal(complete(xs,'credit'),100);assert.equal(xs.reduce((n,x)=>n+x.q,0),97);}
 assert.equal(complete(a,'q'),100);assert.equal(complete(b,'q'),96);
 // One unit of lost credit permits either no advance or four units of advance.
 assert.ok(100-complete(b,'q')>1);
 const envelope=creditEnvelopeV27({qualifiedMs:97,creditMs:96,referenceLossMs:1,benchmarkLossMs:0,capLossMs:0,maximumCredit:96});assert.equal(envelope.frozenPathCompletionTimeIdentified,false);assert.equal(envelope.relaxedPrimaryGain,null);
});
test('inconsistent, negative, unsafe and zero-credit inputs fail closed',()=>{
 const x={qualifiedMs:105,creditMs:90,referenceLossMs:5,benchmarkLossMs:10,capLossMs:0,maximumCredit:200};
 for(const patch of [{qualifiedMs:104},{creditMs:0},{referenceLossMs:-1},{capLossMs:NaN},{qualifiedMs:Infinity},{maximumCredit:89}])assert.throws(()=>creditEnvelopeV27({...x,...patch}));
 assert.throws(()=>creditEnvelopeV27({qualifiedMs:Number.MAX_SAFE_INTEGER,creditMs:1,referenceLossMs:Number.MAX_SAFE_INTEGER,benchmarkLossMs:1,capLossMs:0,maximumCredit:2}));
});
test('analysis leaves input untouched and survives JSON round trip',()=>{
 const x={qualifiedMs:105,creditMs:90,referenceLossMs:5,benchmarkLossMs:10,capLossMs:0,maximumCredit:200},before=structuredClone(x),r=creditEnvelopeV27(x);assert.deepEqual(x,before);assert.deepEqual(JSON.parse(JSON.stringify(r)),r);
});
