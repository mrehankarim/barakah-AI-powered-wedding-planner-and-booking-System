import { z } from "zod";

// ── Vendor Registration ──────────────────────────────────────────────────────

export const registerVendorSchema = z.object({
  legal_business_name: z.string().min(2, "Business name must be at least 2 characters"),
  cnic_or_reg_number: z.string().min(13, "CNIC must be 13 digits").max(20),
  payout_bank_iban: z.string().optional(),
});

// ── Listing ──────────────────────────────────────────────────────────────────

export const createListingSchema = z.object({
  category_id: z.string().uuid("Invalid category ID"),
  city: z.string().min(1, "City is required"),
  area: z.string().optional(),
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  description: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const updateListingSchema = createListingSchema.partial();

// ── Pricing Tier ─────────────────────────────────────────────────────────────

const toBigInt = (val: unknown): bigint => {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(Math.round(val));
  if (typeof val === "string") return BigInt(val);
  throw new Error("Invalid bigint value");
};

export const createPricingTierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  min_capacity: z.coerce.number().int().positive().optional(),
  max_capacity: z.coerce.number().int().positive().optional(),
  base_price_paisa: z
    .union([z.string(), z.number()])
    .transform(toBigInt)
    .refine((n) => n > 0n, "Price must be at least 1 paisa"),
  currency: z.string().default("PKR"),
  inclusions: z.array(z.string()).optional(),
});

export const updatePricingTierSchema = createPricingTierSchema.partial();

// ── Calendar Availability ────────────────────────────────────────────────────

export const setAvailabilitySchema = z.object({
  dates: z
    .array(
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, expected YYYY-MM-DD")
    )
    .min(1, "At least one date is required"),
  status: z.enum(["available", "blocked"]),
});
