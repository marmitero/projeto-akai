import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialCampaign,campaignDay,farm,manage,policy,weekly,snapshot,START,DAY} from '../economy-v2/campaign-policy.mjs';
import {beginOfflineV7,drainOfflineV7,heroStatsV3,huntEnemyV4,advanceCombatV3,startCombatV3} from '../../packages/shared/dist/index.js';
test('acquired start has no hidden grants; JSON restart reproduces purchases, drops, combat, RNG and sinks',()=>{
 const c=initialCampaign();assert.equal(c.run.economy.masteryMs,0);assert.deepEqual(Object.values(c.run.economy.balances),['0','0','0','0','0']);assert.equal(c.run.economy.inventory.length,1);assert.equal(c.run.economy.protection,0);
 campaignDay(c);const resumed=JSON.parse(JSON.stringify(c));campaignDay(c);campaignDay(resumed);assert.deepEqual(resumed,c);
 assert.ok(c.actions.train>0&&c.actions.equip>0&&c.actions.refine>0&&c.actions.salvage>0);assert.ok(BigInt(c.spent.coal)>0n&&BigInt(c.gross.coal)>0n);assert.equal(c.gross.jade,'0');assert.ok(c.run.economy.inventory.every(i=>i.enhancement<=15));snapshot(c);
});
test('weekly protection is earned by real exclusive presence, with no XP/material/Coin double credit or duplicate grants',()=>{
 const c=initialCampaign();for(let n=0;n<12;n++){manage(c);policy(c);farm(c,START+(n+1)*300000);}
 const before=structuredClone(c.run);weekly(c);
 assert.equal(c.run.killSequence,before.killSequence);assert.equal(c.run.economy.masteryMs,before.economy.masteryMs);assert.deepEqual(c.run.economy.balances,before.economy.balances);assert.equal(c.run.economy.protection-before.economy.protection,30);assert.ok(c.eventMs>=1800000);assert.equal(c.earnedScrolls,30);assert.equal(c.run.encounter,null);
 const earned=JSON.stringify(c);weekly(c);assert.equal(JSON.stringify(c),earned);snapshot(c);
 c.run.paused=true;farm(c,START+7*DAY+3600000);weekly(c);assert.equal(c.earnedScrolls,60);assert.equal(c.run.economy.protection-before.economy.protection,60);assert.equal(c.delivered.length,12);assert.ok(c.eventMs>=3600000);snapshot(c);
});
test('offline settlement duration survives civil-midnight quota reset and bounded JSON resume',()=>{
 const c=initialCampaign();for(let n=0;n<24;n++){manage(c);policy(c);farm(c,START+(n+1)*300000);}
 // A real earned snapshot, no gear/points minted. Reserve exactly the last minute before midnight.
 c.run.paused=true;farm(c,START+DAY-60000);c.run.paused=false;
 const job=beginOfflineV7(c.run,START+DAY),before=JSON.stringify(job);
 const drain=budget=>{let state=JSON.parse(before),ms=0;for(let n=0;n<10000;n++){const r=drainOfflineV7(state,budget);ms+=r.settledMs;state=JSON.parse(JSON.stringify(r.state));if(!r.backlog)return {state,ms};}throw Error('UNDRAINED');};
 const all=drain(10000),small=drain(7);all.state.economy.revision=small.state.economy.revision=0;assert.deepEqual(all,small);assert.equal(all.state.economy.offline.usedMs,0);assert.ok(all.ms>0&&all.ms<=60000);assert.equal(JSON.stringify(job),before);
});
test('hunt cache returns independent stats; public combat validates and does not mutate snapshots',()=>{
 const before=huntEnemyV4('gold',1000);huntEnemyV4('gold',1000).stats.attack=1;assert.deepEqual(huntEnemyV4('gold',1000),before);
 const c=initialCampaign(),fight=startCombatV3(heroStatsV3(c.run.economy),[{id:'hunt',stats:before.stats}],{seed:4213,floor:1000}),saved=JSON.stringify(fight);advanceCombatV3(fight,60000);assert.equal(JSON.stringify(fight),saved);assert.throws(()=>advanceCombatV3({...fight,clockMs:-1},60000));
});

test('voluntary casual downtime is not treated as a new defeat or renewed six-hour frontier cooldown',()=>{
 const c=initialCampaign({schedule:'casual'});c.run.paused=true;c.run.autoAdvance=false;c.run.economy.economicThroughMs=START+DAY;c.idleMs=DAY;policy(c);
 assert.equal(c.failed.main,undefined);assert.equal(c.run.paused,false);assert.equal(c.run.autoAdvance,true);snapshot(c);
});

test('each observed defeat retreats from the actually failed floor, including consecutive losses',()=>{
 const c=initialCampaign();farm(c,START+3600000);assert.equal(c.run.paused,true);const failed=c.run.economy.floor;policy(c);assert.ok(c.run.economy.floor<failed);
 // Controller-only fixture for a second loss at the retreated floor; no grants or campaign result.
 const floor=c.run.economy.floor;c.run.paused=true;c.run.log.push({id:++c.run.logSequence,at:c.run.economy.economicThroughMs,text:'Derrota main '+floor});if(c.run.log.length>60)c.run.log.shift();policy(c);assert.equal(c.run.economy.floor,Math.max(1,floor-2));
});
