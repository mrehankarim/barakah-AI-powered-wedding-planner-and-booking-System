import { z } from "zod";

export const createHoldSchema = z.object({
    listingId: z.string().uuid(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const checkAvailabilitySchema = z.object({
    listing_ids: z.array(z.string().uuid()).min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
