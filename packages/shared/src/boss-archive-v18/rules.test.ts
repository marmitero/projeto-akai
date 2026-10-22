import {it,expect} from 'vitest';
import {bossGuildXpV18,bossDayStartV18} from './index.js';
import {initialBossEventsV8} from '../boss-events-v8.js';
it('bounds XP by effective HP share with exact integer thresholds',()=>{expect([0,1,999999,1000000,1999999,100000000].map(n=>bossGuildXpV18(String(n),100000000))).toEqual([0,1,1,1,1,100]);expect(()=>bossGuildXpV18('100000001',100000000)).toThrow('DAMAGE_EXCEEDS');expect(()=>bossGuildXpV18('-1',100000000)).toThrow();});
it('finds the actual first instant of a civil date through the historical DST gap',()=>{const s=initialBossEventsV8(Date.parse('2018-11-04T12:00:00-02:00'));expect(bossDayStartV18(s.daily.date,s.daily.endMs)).toBe(Date.parse('2018-11-04T01:00:00-02:00'));});
