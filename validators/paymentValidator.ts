import { z } from "zod";

const toBigInt = (val: unknown): bigint => {
    if (typeof val === "bigint") return val;
    if (typeof val === "number") return BigInt(Math.round(val));
    if (typeof val === "string") return BigInt(val);
    throw new Error("Invalid bigint value");
};

export const initiatePaymentSchema = z.object({
    bookingId: z.string().uuid(),
    milestoneLabel: z.string().min(1),
    amountPaisa: z.union([z.string(), z.number()]).transform(toBigInt).refine((n) => n > 0n),
    method: z.enum(["jazzcash", "easypaisa", "card", "bank_transfer"]),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const webhookSchema = z.object({
    gateway_txn_ref: z.string().min(1),
    status: z.enum(["success", "failed"]),
    payment_id: z.string().uuid(),
    amount_paisa: z.union([z.string(), z.number()]).transform(toBigInt),
});
