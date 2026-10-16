import { z } from "zod";
export const MONETIZATION_VERSION = "monetization-test-1";
export const PREMIUM_PRODUCTS = [
  {
    id: "ruby_handful",
    name: "Punhado de Rubies",
    rubies: 100,
    kind: "consumable",
  },
  { id: "ruby_bag", name: "Saco de Rubies", rubies: 550, kind: "consumable" },
  { id: "ruby_pot", name: "Pote de Rubies", rubies: 1200, kind: "consumable" },
  { id: "ruby_chest", name: "Baú de Rubies", rubies: 2600, kind: "consumable" },
  {
    id: "title_miner",
    name: "Título: Guardião das Minas",
    rubies: 0,
    kind: "entitlement",
  },
] as const;
export const PremiumProductSchema = z.enum([
  "ruby_handful",
  "ruby_bag",
  "ruby_pot",
  "ruby_chest",
  "title_miner",
]);
export type PremiumProduct = z.infer<typeof PremiumProductSchema>;
export const REWARDED_TYPES = [
  "autoclick",
  "battle_rewards",
  "battle_damage",
  "coins",
] as const;
export const RewardedTypeSchema = z.enum(REWARDED_TYPES);
export type RewardedType = z.infer<typeof RewardedTypeSchema>;
export const PremiumCommandSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("purchase.intent"),
      commandId: z.uuid(),
      productId: PremiumProductSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("purchase.verify"),
      commandId: z.uuid(),
      intentId: z.uuid(),
      purchaseToken: z.string().min(20).max(8000),
    })
    .strict(),
  z
    .object({
      type: z.literal("intent.cancel"),
      commandId: z.uuid(),
      intentId: z.uuid(),
    })
    .strict(),
  z.object({ type: z.literal("restore"), commandId: z.uuid() }).strict(),
  z
    .object({
      type: z.literal("ad.intent"),
      commandId: z.uuid(),
      reward: RewardedTypeSchema,
    })
    .strict(),
]);
export type PremiumCommand = z.infer<typeof PremiumCommandSchema>;
export interface PremiumResult {
  commandId: string;
  status: "applied" | "rejected";
  code: string;
  intentId?: string;
}
export interface PremiumIntent {
  id: string;
  kind: "purchase" | "ad";
  productId: string;
  state: string;
  createdAt: number;
  expiresAt: number;
}
export interface PremiumView {
  version: typeof MONETIZATION_VERSION;
  mode: "off" | "sandbox" | "google-play-test";
  accountId: string;
  serverTime: number;
  accountBinding: string;
  catalog: typeof PREMIUM_PRODUCTS;
  intents: PremiumIntent[];
  purchases: {
    id: string;
    productId: string;
    state: string;
    delivery: string;
    at: number;
  }[];
  entitlements: string[];
  benefits: { kind: RewardedType; start: number; end: number }[];
  rubyBalance: string;
  rubyDebt: string;
  adNextAt: number;
  adUsed: number;
}
