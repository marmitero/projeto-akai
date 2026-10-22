import {describe,it,expect} from 'vitest';
import {GuildV16CommandSchema,guildCapacityV16,guildUpgradeCoinV16} from './guilds-v16/index.js';
const base={commandId:'00000000-0000-4000-8000-000000000001',expectedRevision:0,guildRevision:0};
describe('guild v16 strict contract',()=>{
 it('preserves 20–38 capacity and exact costs',()=>{expect(guildCapacityV16(1)).toBe(20);expect(guildCapacityV16(10)).toBe(38);expect(guildUpgradeCoinV16(9)).toBe('9000000');expect(()=>guildUpgradeCoinV16(10)).toThrow();});
 it('accepts literal chat and 256 palette indices, never arbitrary markup or uploads for emblems',()=>{expect(GuildV16CommandSchema.safeParse({...base,action:{type:'chat',text:'<b>literal</b>'}}).success).toBe(true);expect(GuildV16CommandSchema.safeParse({...base,action:{type:'emblem',pixels:Array(256).fill(7)}}).success).toBe(true);for(const pixels of [Array(255).fill(0),Array(256).fill(8),'<svg/>'])expect(GuildV16CommandSchema.safeParse({...base,action:{type:'emblem',pixels}}).success).toBe(false);});
 it('rejects actor, funds, XP, clock and control injection',()=>{const cmd={...base,action:{type:'create',name:'Teste'}};for(const key of ['accountId','runId','xp','coin','now'])expect(GuildV16CommandSchema.safeParse({...cmd,[key]:1}).success).toBe(false);expect(GuildV16CommandSchema.safeParse({...base,action:{type:'chat',text:'a\u0000b'}}).success).toBe(false);expect(GuildV16CommandSchema.safeParse({...base,action:{type:'create',name:'<img>'}}).success).toBe(false);});
});
