import assert from 'node:assert/strict';
import {EconomyRunV6Schema,masteryLevel,heroStatsV3,ITEMS} from '../../packages/shared/dist/index.js';
import {validateTraceV24} from './progression-trace-v24.mjs';
import {WORLD_START_V24,DAY_V24,validateCaseV24} from './progression-panel-v24.mjs';
export function endpointV24(c){const r=c.rows.at(-1);return {masteryMs:r.masteryMs,level:r.level,floor:r.highest.main,maxDay:c.firstMaxDay,towerDay:c.firstTower1000Day};}
export function validateEvidenceV24(c,trace,config,days=120){
 validateCaseV24(config);for(const k of ['seed','schedule','build'])assert.equal(c[k],config[k]);assert.equal(c.day,days);assert.equal(c.rows.length,days);validateTraceV24(trace,days);
 const start=WORLD_START_V24+config.startHour*3600000,run=EconomyRunV6Schema.parse(c.run),hours=config.schedule==='best'?24:config.schedule==='regular'?16:2;
 assert.equal(run.economy.economicThroughMs,start+days*DAY_V24);assert.equal(c.activeFarmMs+c.offlineMs+c.eventMs+c.idleMs,days*DAY_V24);assert.ok(c.activeFarmMs+c.eventMs<=days*hours*3600000);assert.ok(c.offlineMs<=days*8*3600000);assert.ok(run.economy.offline.usedMs<=8*3600000);assert.ok(run.economy.masteryMs<=c.activeFarmMs+c.offlineMs);
 assert.equal(trace.farmWallMs+trace.eventMs,days*DAY_V24);assert.equal(trace.eventMs,c.eventMs);assert.equal(Object.values(trace.groups).reduce((n,g)=>n+(g.creditMs??0),0),run.economy.masteryMs);assert.equal(Object.values(trace.groups).reduce((n,g)=>n+(g.unclassifiedMs??0),0),0,'UNCLASSIFIED_TIME');
 for(const k of ['coin','coal','iron','gold','jade']){assert.equal(BigInt(c.gross[k])-BigInt(c.spent[k]),BigInt(run.economy.balances[k]));assert.equal(BigInt(trace.actionDebits[k]??'0'),BigInt(c.spent[k]));}assert.equal(c.gross.jade,'0');assert.equal(c.spent.jade,'0');assert.equal(c.earnedScrolls-c.spentScrolls,run.economy.protection);for(const [k,n]of Object.entries(c.actions))assert.equal(trace.actions[k]??0,n);
 for(const [i,r]of c.rows.entries()){
  assert.equal(r.day,i+1);assert.equal(r.level,masteryLevel(r.masteryMs));assert.ok(r.masteryMs<=Math.min(8294400000,(i+1)*(hours+(config.schedule==='best'?0:8))*3600000));if(i)assert.ok(r.masteryMs>=c.rows[i-1].masteryMs);
  const e=structuredClone(run.economy);Object.assign(e,{masteryMs:r.masteryMs,attributes:r.attributes,highest:r.highest,inventory:r.equipment});e.equipped=Object.fromEntries(Object.keys(e.equipped).map(k=>[k,null]));for(const item of r.equipment){let slot=ITEMS[item.definitionId].slot;if(slot==='ring1'&&e.equipped.ring1)slot='ring2';e.equipped[slot]=item.id;}assert.deepEqual(heroStatsV3(e),r.stats);
 }
 assert.equal(run.economy.masteryMs,c.rows.at(-1).masteryMs);assert.deepEqual(run.economy.highest,c.rows.at(-1).highest);const p=endpointV24(c);assert.equal(p.maxDay!==null,p.level===1000);assert.equal(p.towerDay!==null,p.floor===1000);
 for(const d of [p.maxDay,p.towerDay])assert.ok(d===null||Number.isFinite(d)&&d>0&&d<=days);if(p.maxDay!==null){assert.ok(p.maxDay>=96);assert.ok(trace.maxReachedAtMs>=start+96*DAY_V24);assert.ok(trace.maxReachedAtMs<=start+p.maxDay*DAY_V24+0.001);}
 return true;
}
