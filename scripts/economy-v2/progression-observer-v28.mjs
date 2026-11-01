import assert from 'node:assert/strict';
import {createTraceV24} from './progression-trace-v24.mjs';
import {initialShadowV28,applyVictoryV28,finishShadowDayV28,LEDGER_LIMIT_V28,DAY_V28} from './progression-shadow-v28.mjs';
export function createObserverV28({start,savedShadow,savedTrace}={}){
 const native=createTraceV24(savedTrace),state=savedShadow?structuredClone(savedShadow):initialShadowV28(start);assert.equal(state.start,start);let events=[];
 return {...native,native,
  mastery(before,after,Q,activity,reference,benchmark,floor){
   native.mastery(before,after,Q,activity,reference,benchmark);
   const row={at:after.at,Q,activity,floor,reference,offline:before.offline,before:{masteryMs:before.masteryMs,carry:before.carry},after:{masteryMs:after.masteryMs,carry:after.carry}};
   assert.ok(events.length<LEDGER_LIMIT_V28,'DAILY_LEDGER_LIMIT');const day=state.days.length;assert.ok(row.at>=start+day*DAY_V28&&row.at<=start+(day+1)*DAY_V28,'LEDGER_TIME_OUTSIDE_DAY');applyVictoryV28(state,row,benchmark);events.push(row);
  },
  finishDay(day){const trace=native.finishDay(day),{record,archive}=finishShadowDayV28(state,day,events);events=[];return {trace,shadow:structuredClone(state),record,archive};},
  snapshot(){assert.equal(events.length,0,'CHECKPOINT_MUST_BE_DAY_BOUNDARY');return structuredClone(state);},
 };
}
