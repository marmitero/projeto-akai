import { z } from "zod";
export const COMMUNITY_VERSION = "community-1";
export const EMBLEM_PALETTE = [
  "#211b2e",
  "#faf1d2",
  "#cba44b",
  "#a93445",
  "#427e68",
  "#476fa6",
  "#9271b7",
  "#a3b2b9",
] as const;
const name = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[\p{L}\p{N} _-]+$/u);
const id = z.uuid();
export const CommunityActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("profile"), name }).strict(),
  z
    .object({
      type: z.literal("chat"),
      scope: z.enum(["global", "guild"]),
      text: z
        .string()
        .trim()
        .min(1)
        .max(500)
        .refine((s) => !/[\x00-\x1f\x7f]/.test(s)),
    })
    .strict(),
  z
    .object({ type: z.literal("block"), accountId: id, blocked: z.boolean() })
    .strict(),
  z
    .object({
      type: z.literal("report"),
      messageId: z.string().regex(/^[1-9]\d{0,18}$/),
      reason: z.string().trim().min(3).max(300),
    })
    .strict(),
  z.object({ type: z.literal("guild.create"), name }).strict(),
  z.object({ type: z.literal("guild.invite"), accountId: id }).strict(),
  z.object({ type: z.literal("guild.accept"), guildId: id }).strict(),
  z.object({ type: z.literal("guild.leave") }).strict(),
  z
    .object({
      type: z.literal("guild.role"),
      accountId: id,
      role: z.enum(["member", "officer", "leader", "kick"]),
    })
    .strict(),
  z
    .object({
      type: z.literal("guild.emblem"),
      pixels: z.array(z.number().int().min(0).max(7)).length(256),
    })
    .strict(),
  z.object({ type: z.literal("guild.upgrade") }).strict(),
  z.object({ type: z.literal("war.enroll") }).strict(),
  z.object({ type: z.literal("war.attack"), warId: id }).strict(),
  z.object({ type: z.literal("arena"), opponentId: id }).strict(),
  z.object({ type: z.literal("boss"), join: z.boolean() }).strict(),
  z.object({ type: z.literal("raid") }).strict(),
]);
export const CommunityCommandSchema = z
  .object({ commandId: id, action: CommunityActionSchema })
  .strict();
export type CommunityAction = z.infer<typeof CommunityActionSchema>;
export interface CommunityResult {
  commandId: string;
  status: "applied" | "rejected";
  code: string;
}
export interface PublicPlayer {
  id: string;
  name: string;
  power: number;
  floor: number;
  coins: string;
}
export interface ChatMessage {
  id: string;
  authorId: string;
  name: string;
  text: string;
  at: number;
  emblem: number[] | null;
}
export interface GuildMember {
  id: string;
  name: string;
  role: "leader" | "officer" | "member";
}
export interface GuildView {
  id: string;
  name: string;
  level: number;
  xp: number;
  capacity: number;
  emblem: number[];
  members: GuildMember[];
  bonusBp: number;
}
export interface CommunityIdentity {
  name: string;
  guild?: string;
}
export interface CommunitySnapshot {
  version: string;
  serverTime: number;
  accountId: string;
  name: string;
  mutedUntil: number;
  suspended: boolean;
  season: { id: string; start: number; end: number };
  chat: ChatMessage[];
  guildChat: ChatMessage[];
  guild: GuildView | null;
  invites: { id: string; name: string }[];
  guilds: { id: string; name: string; level: number }[];
  arena: {
    position: number | null;
    trophies: number;
    nextAt: number;
    opponents: (PublicPlayer & { position: number })[];
    matches: { id: string; won: boolean; opponent: string; at: number }[];
  };
  boss: {
    id: string;
    start: number;
    end: number;
    hp: number;
    maxHp: number;
    status: string;
    damage: number;
    joined: boolean;
    lastHit: string | null;
    leaders: { name: string; damage: number }[];
  };
  flash: {
    xp: { start: number; end: number };
    lottery: { at: number; status: string; winner: string | null };
    raid: {
      start: number;
      end: number;
      status: string;
      hp: number;
      heroHp: number;
    };
  };
  rankings: {
    positions: { name: string; position: number }[];
    power: PublicPlayer[];
    floor: PublicPlayer[];
    coins: PublicPlayer[];
    trophies: { name: string; score: number }[];
    guilds: { name: string; score: number }[];
    damage: { name: string; score: number }[];
    lastHits: { name: string; edition: string }[];
  };
  wars: {
    id: string;
    name: string;
    status: string;
    start: number;
    end: number;
    score: string;
    canAttack: boolean;
  }[];
  archives: { id: string; start: number; end: number; leaders: string[] }[];
  rewards: { source: string; description: string }[];
}
