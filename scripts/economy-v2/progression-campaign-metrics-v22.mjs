import assert from 'node:assert/strict';
/** Observed endpoints only. Null means censored, never a successful completion. */
export function compareCampaignV22(candidate,baseline){
 for(const p of [candidate,baseline]){
  for(const k of ['masteryMs','level','floor'])assert.ok(Number.isSafeInteger(p[k])&&p[k]>=0,'INVALID_ENDPOINT');
  assert.ok(p.level>=1&&p.level<=1000&&p.floor>=1&&p.floor<=1000&&p.masteryMs<=8294400000,'INVALID_ENDPOINT_RANGE');
  for(const k of ['maxDay','towerDay'])assert.ok(p[k]===null||Number.isFinite(p[k])&&p[k]>0&&p[k]<=120,'INVALID_MILESTONE');
  assert.equal(p.maxDay!==null,p.level===1000,'MAX_CENSORING_MISMATCH');
  assert.equal(p.towerDay!==null,p.floor===1000,'TOWER_CENSORING_MISMATCH');
 }
 const noSlower=k=>baseline[k]===null||candidate[k]!==null&&candidate[k]<=baseline[k];
 const nonRegression=candidate.masteryMs>=baseline.masteryMs&&candidate.floor>=baseline.floor&&noSlower('maxDay')&&noSlower('towerDay');
 const primaryGain=baseline.maxDay===null?(candidate.masteryMs-baseline.masteryMs)/Math.max(1,baseline.masteryMs):candidate.maxDay===null?null:1-candidate.maxDay/baseline.maxDay;
 return {nonRegression,primaryGain,meaningfulBenefit:primaryGain!==null&&primaryGain>=0.01};
}
