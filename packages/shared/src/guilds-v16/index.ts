import {z} from 'zod';
const id=z.uuid(),revision=z.number().int().nonnegative().safe();
export const GUILD_V16_RULES={version:'guilds-v16-1',createCoin:'500000',inviteMs:86400000,arenaMembershipMs:86400000,maxLevel:10,chatCooldownMs:3000} as const;
export const GuildV16Name=z.string().trim().min(3).max(24).regex(/^[\p{L}\p{N} _-]+$/u);
export const GuildV16CommandSchema=z.object({commandId:id,expectedRevision:revision,guildRevision:revision,action:z.discriminatedUnion('type',[
 z.object({type:z.literal('create'),name:GuildV16Name}).strict(),z.object({type:z.literal('invite'),accountId:id}).strict(),
 z.object({type:z.literal('accept'),guildId:id}).strict(),z.object({type:z.literal('decline'),guildId:id}).strict(),z.object({type:z.literal('revoke'),accountId:id}).strict(),
 z.object({type:z.literal('leave')}).strict(),z.object({type:z.literal('role'),accountId:id,role:z.enum(['leader','officer','member','kick'])}).strict(),
 z.object({type:z.literal('emblem'),pixels:z.array(z.number().int().min(0).max(7)).length(256)}).strict(),z.object({type:z.literal('upgrade')}).strict(),
 z.object({type:z.literal('chat'),text:z.string().trim().min(1).max(500).refine(s=>!/[\x00-\x1f\x7f]/.test(s))}).strict()
])}).strict();
export const guildCapacityV16=(level:number)=>20+2*(z.number().int().min(1).max(10).parse(level)-1);
export const guildUpgradeCoinV16=(level:number)=>String(BigInt(z.number().int().min(1).max(9).parse(level))*1000000n);
export type GuildV16View={version:string;revision:number;serverNow:number;rehearsalOnly:true;eligible:boolean;own:{id:string;name:string;level:number;xp:string;capacity:number;leader:string;emblem:number[];role:'leader'|'officer'|'member';joinedAt:number;upgradeCoin:string|null;requiredXp:string;members:Array<{accountId:string;name:string;role:string;joinedAt:number;available:boolean}>}|null;directory:Array<{id:string;name:string;level:number;members:number;capacity:number}>;invites:Array<{guildId:string;name:string;expiresAt:number}>;outgoing:Array<{accountId:string;name:string;expiresAt:number}>;players:Array<{accountId:string;name:string;inGuild:boolean}>;chat:Array<{id:string;authorId:string;name:string;text:string;at:number}>;history:Array<{source:string;amount:string;at:number}>;nextChatAt:number};
