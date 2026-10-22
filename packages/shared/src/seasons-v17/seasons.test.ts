import {describe,it,expect} from 'vitest';
import {SeasonV17CommandSchema} from './index.js';
import {calendar} from '../../../../apps/server/src/community-domain.js';
describe('V17 calendar and strict authority boundary',()=>{
 it('uses Monday local midnight including the historical daylight-saving offset',()=>{
  const a=calendar(Date.parse('2018-11-05T00:00:00-02:00')).season;expect(a.id).toBe('2018-11-05');expect(a.start).toBe(Date.parse('2018-11-05T00:00:00-02:00'));expect(calendar(a.start-1).season.id).toBe('2018-10-29');expect(calendar(a.end).season.id).toBe('2018-11-12');
 });
 it('requires revisions and rejects caller identity, time, reward and realm',()=>{
  const cmd={commandId:'00000000-0000-4000-8000-000000000001',expectedRevision:0,seasonRevision:0,action:{type:'sync'}};expect(SeasonV17CommandSchema.parse(cmd)).toEqual(cmd);for(const key of ['accountId','runId','realm','now','coin'])expect(SeasonV17CommandSchema.safeParse({...cmd,[key]:'forged'}).success).toBe(false);expect(SeasonV17CommandSchema.safeParse({...cmd,action:{type:'sync',coin:'100'}}).success).toBe(false);
 });
});
