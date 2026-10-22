// Replays immutable V12 acquired damage; does not modify native combat or acquired artifacts.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {bossGuildXpV18,BOSS_GUILD_V18_RULES} from '../../packages/shared/dist/boss-archive-v18/index.js';
const population=JSON.parse(await readFile('docs/plans/hunts-builds/population-v12/results.json','utf8'));
const scenarios=population.scenarios.map(s=>{const rows=s.rows.map(r=>({accountId:r.id,effective:r.collectiveDamage,xp:bossGuildXpV18(r.collectiveDamage,s.maxHp)})),total=rows.reduce((n,r)=>n+r.xp,0),positive=rows.filter(r=>BigInt(r.effective)>0n).length;assert.ok(rows.every(r=>r.xp>=0&&r.xp<=100));assert.ok(total<=100+Math.max(0,positive-1));return{name:s.name,members:s.members,effectiveTotal:String(rows.reduce((n,r)=>n+BigInt(r.effective),0n)),xp:total,rows};});
const extremes=Array.from({length:20},(_,i)=>{const n=i+1,hp=100000000,split=[hp-(n-1),...Array(n-1).fill(1)],xp=split.map(d=>bossGuildXpV18(String(d),hp));assert.ok(xp.reduce((a,b)=>a+b,0)<=100+n-1);return{members:n,total:xp.reduce((a,b)=>a+b,0),maximum:Math.max(...xp)};});
assert.equal(bossGuildXpV18('0',100000000),0);assert.equal(bossGuildXpV18('100000000',100000000),100);
const result={version:BOSS_GUILD_V18_RULES.version,sourceHash:population.sourceHash,integrityPassed:true,balanceApproved:false,activationReady:false,scope:'Counterfactual eligible stable guild memberships; no acquired membership history or public balance approval. Actual post-kill contribution excluded. No Coin/Jade/mastery granted by XP.',legacyFullHpXp:1000000,nativeFullHpXp:100,cohort20Bound:119,scenarios,extremes};
await writeFile('docs/plans/hunts-builds/boss-archive-v18/calibration-results.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({version:result.version,acquiredScenarios:scenarios.length,integrityPassed:true,balanceApproved:false,activationReady:false}));
