import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBossEventsV8,joinBossEventV8,planDailyBossJade} from '../../packages/shared/dist/index.js';
import {START,uid,member,population,summarize,supplyProjection} from '../economy-v2/population.mjs';
const profile={file:'unit-fixture',day:1,level:100,highestFloor:100,stats:{attack:100,maxHp:1000000000,physicalDefense:100,magicDefense:100,intervalMs:1000,dexterity:1000,evasion:0,criticalPpm:0,physicalShareBp:10000}};
test('one global reward budget differs from paying the ladder independently in each private shard',()=>{
 assert.equal(supplyProjection(1000).totalDailyJade,4350);
 assert.equal(supplyProjection(1000,50).totalDailyJade,70500);
 assert.equal(supplyProjection(0).totalDailyJade,0);
 assert.equal(supplyProjection(1).totalDailyJade,453);
 assert.throws(()=>supplyProjection(-1));
});
test('same owner is analysis metadata and does not create an unimplemented identity limit',()=>{
 const players=[member(profile,0,{owner:'one-owner'}),member(profile,1,{owner:'one-owner'})];
 const state=population(players,{durationMs:620000}),result=summarize('unit',players,state,620000);
 assert.equal(result.jade,6);assert.equal(result.ownerJade['one-owner'],6);assert.equal(result.largestOwnerShare,1);
 const forged=structuredClone(state);forged.daily.members[players[0].id].damage='1';assert.throws(()=>summarize('bad',players,forged,620000));
 const duplicate=structuredClone(state);duplicate.grants.push(duplicate.grants[0]);assert.throws(()=>summarize('duplicate',players,duplicate,620000));
});
test('ranking and last hit can be paid before participation under the existing contract',()=>{
 const p=planDailyBossJade({edition:'boss:2026-10-21',defeated:true,lastHit:uid(1),members:[{accountId:uid(1),name:'One hit',damage:'1',qualifiedSeconds:0,highestFloor:100,suspended:false}]});
 assert.deepEqual(p.grants.map(g=>g.kind),['ranking','last-hit']);assert.equal(p.grants.reduce((n,g)=>n+g.jade,0),450);
});
test('event runner stops with lost lease and cannot turn absence into qualification',()=>{
 const players=[member(profile,0,{heartbeatUntilMs:0})],state=population(players,{durationMs:620000});
 assert.equal(state.grants.length,0);assert.ok(state.daily.members[uid(1)].qualifiedMs<15000);
 assert.equal(state.sessions[uid(1)].active,false);
 const s=initialBossEventsV8(START);assert.throws(()=>joinBossEventV8(s,{accountId:uid(1),name:'Locked',highestFloor:99,suspended:false},'boss',profile.stats,1),/LOCKED/);
});
