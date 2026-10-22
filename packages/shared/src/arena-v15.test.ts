import {describe,it,expect} from 'vitest';
import {duelV15,ArenaV15CommandSchema} from './arena-v15/index.js';
import type {CombatStatsV3} from './combat-v3.js';
const fighter:CombatStatsV3={attack:100,maxHp:1,physicalDefense:0,magicDefense:0,intervalMs:1000,dexterity:10000,evasion:0,criticalPpm:0,physicalShareBp:10000};
describe('arena v15 simultaneous v3 combat',()=>{
 it('awards simultaneous knockout to defense and never mutates frozen fighters',()=>{const a=Object.freeze({...fighter}),b=Object.freeze({...fighter});expect(duelV15(a,b,1,1)).toMatchObject({won:false,hpA:0,hpB:0,elapsedMs:1000,attacks:2,reason:'tie_defender'});expect(a.maxHp).toBe(1);});
 it('respects real attack intervals and deterministically replays audit inputs',()=>{const a={...fighter,intervalMs:200};const first=duelV15(a,fighter,1,1);expect(first).toEqual(duelV15(a,fighter,1,1));expect(first).toMatchObject({won:true,elapsedMs:200,attacks:1});});
 it('ends at 120 seconds without granting an attack at the deadline',()=>{const a={...fighter,attack:1,maxHp:100000000,intervalMs:60000};expect(duelV15(a,a,1,1)).toMatchObject({won:false,elapsedMs:120000,attacks:2,reason:'timeout_defender'});});
 it('uses physical defense for physical attacks and ignores magical defense',()=>{const a={...fighter,maxHp:100000},b={...a,magicDefense:99999};expect(duelV15(a,b,17,100)).toEqual(duelV15(a,a,17,100));const armored={...a,physicalDefense:99999};expect(duelV15(a,armored,17,100).hpB).toBeGreaterThan(duelV15(a,a,17,100).hpB);});
 it('bounds simulation work at the legal 5 APS cap',()=>{const a={...fighter,attack:1,maxHp:100000000,intervalMs:200};expect(duelV15(a,a,37,100).attacks).toBe(1198);});
 it('rejects invalid seeds and forged actor, clock and combat fields',()=>{for(const seed of [0,-1,4294967296,1.5])expect(()=>duelV15(fighter,fighter,seed,1)).toThrow();const cmd={commandId:'00000000-0000-4000-8000-000000000001',expectedRevision:0,arenaRevision:0,seasonId:'2026-10-19',action:{type:'enroll'}};expect(ArenaV15CommandSchema.safeParse(cmd).success).toBe(true);for(const field of ['accountId','now','seed','stats'])expect(ArenaV15CommandSchema.safeParse({...cmd,[field]:1}).success).toBe(false);});
});
