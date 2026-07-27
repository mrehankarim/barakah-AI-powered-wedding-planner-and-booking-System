import { z } from "zod";

export const createReviewSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  listingId: z.string().min(1, "Listing ID is required"),
  rating: z.number().int().min(1).max(5),
  text: z.string().max(1000).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  text: z.string().max(1000).optional(),
});