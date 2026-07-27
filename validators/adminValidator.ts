import { z } from "zod";

export const updateListingStatusSchema = z.object({
    status: z.enum(["under_review", "approved", "rejected", "changes_requested", "suspended"]),
    reason: z.string().optional(),
});

export const updateVendorAdminSchema = z.object({
    commission_rate_override: z.coerce.number().min(0).max(100).optional(),
    verification_status: z.enum(["draft", "under_review", "approved", "rejected", "changes_requested", "suspended"]).optional(),
});

export const disputeResolutionSchema = z.object({
    resolution: z.enum(["release", "refund"]),
    reason: z.string().min(1),
});
