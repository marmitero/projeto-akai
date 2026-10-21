import {z} from 'zod';
import {EconomyRunV6Schema,MarketV2BookSchema,BossEventsV8Schema,economyConsumersV9} from '@akai/shared';
import type {Database} from './database.js';
/** Read-only operator projection of the SAME SQL run used by economy/market/events.
 * Not an HTTP endpoint. A future authenticated API must derive run membership from its session. */
export async function readEconomyConsumersV9(db:Database,runId:string){
 z.uuid().parse(runId);return db.transaction(async c=>{
  await c.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const row=(await c.query('SELECT state,revision,closed FROM akai_economy_rehearsals WHERE id=$1',[runId])).rows[0];if(!row)throw Error('REHEARSAL_NOT_FOUND');
  const market=(await c.query('SELECT r.id,r.state FROM akai_market_v2_realms r JOIN akai_market_v2_members m ON m.realm_id=r.id WHERE m.run_id=$1',[runId])).rows[0];
  const events=(await c.query('SELECT r.id,r.state FROM akai_boss_v8_realms r JOIN akai_boss_v8_members m ON m.realm_id=r.id WHERE m.run_id=$1',[runId])).rows[0];
  return {rehearsalOnly:true,liveAccountModified:false,revision:Number(row.revision),closed:!!row.closed,marketRealm:market?.id??null,eventRealm:events?.id??null,
   consumer:economyConsumersV9(EconomyRunV6Schema.parse(row.state),events?BossEventsV8Schema.parse(events.state):undefined,market?MarketV2BookSchema.parse(market.state):undefined,runId)};
 });
}
