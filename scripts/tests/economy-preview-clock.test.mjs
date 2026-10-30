import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialBossEventsV8,joinBossEventV8,advanceBossEventsV8,heartbeatBossEventV8,leaveBossEventV8,heroStatsV3,presetBuildV3,bossWeekV8} from '../../packages/shared/dist/index.js';
const id='00000000-0000-4000-8000-000000000088',member={accountId:id,name:'Clock fixture',highestFloor:1000,suspended:false};
function previewSequence(at){
 const build=presetBuildV3(1000,'swift','legendary20');for(const i of build.inventory)i.enhancement=15;const stats=heroStatsV3(build);let s=initialBossEventsV8(at);
 const simulate=seconds=>{for(let left=seconds;left>0;left-=10){const r=advanceBossEventsV8(s,s.clockMs+Math.min(10,left)*1000,30);assert.equal(r.backlog,false);s=r.state;if(s.sessions[id]?.active)s=heartbeatBossEventV8(s,id);}};
 s=joinBossEventV8(s,member,'boss',stats,4213);simulate(300);simulate(300);simulate(60);s=leaveBossEventV8(s,id);s=joinBossEventV8(s,member,'protection',stats,4213);const joinedAt=s.clockMs;simulate(300);simulate(60);return {state:s,joinedAt};
}
test('the preview fixed Monday fixture earns the unchanged five-scroll milestone',()=>{
 const {state:s,joinedAt}=previewSequence(Date.parse('2026-10-19T15:00:00Z'));assert.equal(bossWeekV8(joinedAt),bossWeekV8(s.clockMs));assert.ok(s.grants.some(g=>g.kind==='weekly'&&g.amount===5));
});
test('real late-Sunday time can cross reset and legitimately fail the preview same-week assumption',()=>{
 const {state:s,joinedAt}=previewSequence(Date.parse('2026-10-26T02:46:00Z'));assert.notEqual(bossWeekV8(joinedAt),bossWeekV8(s.clockMs));assert.equal(s.sessions[id].active,false);assert.ok(s.weekly[id].qualifiedMs<300000);assert.equal(s.grants.some(g=>g.kind==='weekly'),false);
});
