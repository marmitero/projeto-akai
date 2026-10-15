import { z } from "zod";
import type { Equipment } from "./rpg-schema.js";
export const MARKET_VERSION = "market-1";
export const MARKET_CURRENCIES = [
  "coin",
  "iron",
  "coal",
  "gold",
  "jade",
] as const;
export const MARKET_RESOURCES = ["iron", "coal", "gold", "jade"] as const;
export type MarketCurrency = (typeof MARKET_CURRENCIES)[number];
export const MarketAmountSchema = z.string().regex(/^[1-9]\d{0,29}$/);
const id = z.uuid();
export const MarketActionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("list.item"),
      itemId: z.string().regex(/^item-[1-9]\d{0,14}$/),
      price: MarketAmountSchema,
      currency: z.enum(MARKET_CURRENCIES),
    })
    .strict(),
  z
    .object({
      type: z.literal("list.resource"),
      resource: z.enum(MARKET_RESOURCES),
      quantity: MarketAmountSchema,
      price: MarketAmountSchema,
      currency: z.enum(MARKET_CURRENCIES),
    })
    .strict(),
  z.object({ type: z.literal("buy"), listingId: id }).strict(),
  z.object({ type: z.literal("cancel"), listingId: id }).strict(),
  z.object({ type: z.literal("claim"), listingId: id }).strict(),
  z
    .object({
      type: z.literal("offer"),
      listingId: id,
      price: MarketAmountSchema,
      currency: z.enum(MARKET_CURRENCIES),
    })
    .strict(),
  z.object({ type: z.literal("offer.accept"), offerId: id }).strict(),
  z.object({ type: z.literal("offer.reject"), offerId: id }).strict(),
  z.object({ type: z.literal("offer.withdraw"), offerId: id }).strict(),
]);
export const MarketCommandSchema = z
  .object({ commandId: id, action: MarketActionSchema })
  .strict();
export const MarketQuerySchema = z
  .object({
    kind: z.enum(["item", "resource"]).optional(),
    currency: z.enum(MARKET_CURRENCIES).optional(),
    offset: z.coerce.number().int().min(0).max(5000).default(0),
  })
  .strict();
export type MarketAction = z.infer<typeof MarketActionSchema>;
export interface MarketResult {
  commandId: string;
  status: "applied" | "rejected";
  code: string;
  listingId?: string;
}
export interface MarketAsset {
  kind: "item" | "resource";
  item?: Equipment;
  resource?: (typeof MARKET_RESOURCES)[number];
  quantity: string;
  key: string;
}
export interface MarketListing {
  id: string;
  seller: string;
  sellerName: string;
  asset: MarketAsset;
  price: string;
  currency: MarketCurrency;
  createdAt: number;
  expiresAt: number;
  status: "active" | "sold" | "cancelled" | "expired" | "removed";
  claimed: boolean;
}
export interface MarketOffer {
  id: string;
  listingId: string;
  buyer: string;
  price: string;
  currency: MarketCurrency;
  expiresAt: number;
  status: string;
}
export interface MarketTrade {
  id: string;
  listingId: string;
  buyer: string;
  seller: string;
  price: string;
  fee: string;
  net: string;
  currency: MarketCurrency;
  at: number;
  asset: MarketAsset;
}
export interface MarketSnapshot {
  version: typeof MARKET_VERSION;
  accountId: string;
  serverTime: number;
  listings: MarketListing[];
  hasMore: boolean;
  mine: MarketListing[];
  offers: MarketOffer[];
  history: MarketTrade[];
  inventory: Equipment[];
  balances: Record<MarketCurrency, string>;
  cooldowns: { key: string; until: number }[];
}
export function marketFee(price: string) {
  return (BigInt(price) + 9n) / 10n;
}
