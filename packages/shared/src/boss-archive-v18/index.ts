import {z} from 'zod';
import {bossDateV8} from '../boss-events-v8.js';
export const BOSS_GUILD_V18_RULES={version:'boss-guild-v18-1',maximumPerAccount:100,damageShareDenominator:100} as const;
/** Effective damage only. Positive contributions earn at least one; no overkill/post-kill damage. */
export function bossGuildXpV18(damage:string,maxHp:number){z.string().regex(/^(0|[1-9]\d{0,37})$/).parse(damage);z.number().int().positive().safe().parse(maxHp);const d=BigInt(damage),hp=BigInt(maxHp);if(d>hp)throw Error('DAMAGE_EXCEEDS_EDITION_HP');if(!d)return 0;return Math.max(1,Number(d*100n/hp));}
export type BossArchiveV18={version:'boss-guild-v18-1';date:string;end:number;closedAt:number;maxHp:number;hp:number;defeatedAt:number|null;lastHit:string|null;contributors:Array<{accountId:string;name:string;damage:string;contributionDamage:string;qualifiedMs:number;guildId:string|null;guildXp:number}>};
export type BossArchiveV18View={version:'boss-guild-v18-1';date:string;closeRequired:boolean;own:{guildId:string|null;eligible:boolean}|null;archives:BossArchiveV18[]};

/** First existing instant of a civil date, including historical DST midnight gaps. */
export function bossDayStartV18(date:string,end:number){let lo=end-27*3600000,hi=end-1;while(lo<hi){const mid=Math.floor((lo+hi)/2);if(bossDateV8(mid)<date)lo=mid+1;else hi=mid;}return lo;}
