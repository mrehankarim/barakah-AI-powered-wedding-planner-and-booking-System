import { z } from "zod";

const toBigInt = (val: unknown) => {
  if (typeof val === "bigint") return val;
  if (typeof val === "number") return BigInt(val);
  if (typeof val === "string") return BigInt(val);
  throw new Error("Invalid bigint value");
};

export const createBookingSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
  tierId: z.string().optional(),
  packageId: z.string().optional(),
  eventDate: z.string().datetime(),
  guestCount: z.coerce.number().int().positive().optional(),
  agreedTotalPricePaisa: z.union([z.string(), z.number()]).transform(toBigInt).refine((n) => n > 0n, "Price must be at least 1 paisa"),
});

export const cancelBookingSchema = z.object({
  reason: z.string().optional(),
});