import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import { initiatePaymentSchema, webhookSchema } from "../validators/paymentValidator";

const HOLD_EXTENSION_MS = 10 * 60 * 1000;
const DISPUTE_WINDOW_MS = 72 * 60 * 60 * 1000;

const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const parse = initiatePaymentSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));

    const { bookingId, milestoneLabel, amountPaisa, method, scheduledDate } = parse.data;

    const booking = await prisma.booking.findFirst({
        where: { id: bookingId, user_id: req.user.id },
    });
    if (!booking) throw new ApiError(404, "Booking not found");
    if (!["requested", "confirmed"].includes(booking.status)) {
        throw new ApiError(400, `Cannot initiate payment for booking with status: ${booking.status}`);
    }

    const existing = await prisma.payment.findFirst({
        where: { booking_id: bookingId, milestone_label: milestoneLabel },
    });
    if (existing && existing.status !== "failed") {
        throw new ApiError(409, "A payment for this milestone already exists");
    }

    const payment = await prisma.$transaction(async (tx) => {
        const created = await tx.payment.create({
            data: {
                booking_id: bookingId,
                milestone_label: milestoneLabel,
                amount_paisa: amountPaisa,
                method,
                status: "pending",
                scheduled_date: new Date(scheduledDate),
            },
        });

        await tx.calendarAvailability.updateMany({
            where: { booking_id: bookingId, status: "held" },
            data: { hold_expires_at: new Date(Date.now() + HOLD_EXTENSION_MS) },
        });

        return created;
    });

    return res.status(201).json(new ApiResponse(201, payment, "Payment initiated. Awaiting PSP confirmation."));
});

const handleWebhook = asyncHandler(async (req: Request, res: Response) => {
    const parse = webhookSchema.safeParse(req.body);
    if (!parse.success) {
        return res.status(200).json({ received: true, skipped: "invalid_payload" });
    }

    const { gateway_txn_ref, status, payment_id, amount_paisa } = parse.data;

    const payment = await prisma.payment.findUnique({ where: { id: payment_id } });
    if (!payment) return res.status(200).json({ received: true, skipped: "not_found" });

    if (payment.gateway_txn_ref && payment.gateway_txn_ref === gateway_txn_ref) {
        return res.status(200).json({ received: true, skipped: "duplicate" });
    }

    if (payment.status === "held_escrow" || payment.status === "released") {
        return res.status(200).json({ received: true, skipped: "already_processed" });
    }

    if (status === "success") {
        await prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment_id },
                data: {
                    status: "held_escrow",
                    gateway_txn_ref,
                    captured_at: new Date(),
                },
            });

            await tx.calendarAvailability.updateMany({
                where: { booking_id: payment.booking_id, status: "held" },
                data: { status: "booked", hold_expires_at: null },
            });

            const booking = await tx.booking.findUnique({ where: { id: payment.booking_id } });
            if (booking && booking.status === "requested") {
                await tx.booking.update({
                    where: { id: payment.booking_id },
                    data: { status: "confirmed" },
                });
            }
        });
    } else {
        await prisma.payment.update({
            where: { id: payment_id },
            data: { status: "failed", gateway_txn_ref },
        });
    }

    return res.status(200).json({ received: true });
});

const getPaymentsByBooking = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const bookingId = req.params["bookingId"] as string;

    const booking = await prisma.booking.findFirst({
        where: { id: bookingId, user_id: req.user.id },
    });
    if (!booking) throw new ApiError(404, "Booking not found");

    const payments = await prisma.payment.findMany({
        where: { booking_id: bookingId },
        orderBy: { scheduled_date: "asc" },
        select: {
            id: true,
            milestone_label: true,
            amount_paisa: true,
            currency: true,
            method: true,
            status: true,
            scheduled_date: true,
            captured_at: true,
            released_at: true,
        },
    });

    return res.status(200).json(new ApiResponse(200, payments, "Payments retrieved"));
});

const triggerAutoRelease = asyncHandler(async (_req: Request, res: Response) => {
    const cutoff = new Date(Date.now() - DISPUTE_WINDOW_MS);

    const eligiblePayments = await prisma.payment.findMany({
        where: {
            status: "held_escrow",
            scheduled_date: { lte: cutoff },
        },
        include: { booking: { select: { id: true, status: true, listing: { select: { vendor_id: true } } } } },
    });

    let released = 0;
    for (const payment of eligiblePayments) {
        const disputedBooking = await prisma.booking.findFirst({
            where: { id: payment.booking_id, status: "disputed" },
        });
        if (disputedBooking) continue;

        const vendor = await prisma.vendor.findFirst({
            where: { id: payment.booking.listing.vendor_id },
            include: { listings: { include: { category: true } } },
        });
        if (!vendor) continue;

        const commissionRate = vendor.commission_rate_override
            ? Number(vendor.commission_rate_override) / 100
            : 0.1;

        const gross = payment.amount_paisa;
        const commission = BigInt(Math.round(Number(gross) * commissionRate));
        const net = gross - commission;

        await prisma.$transaction(async (tx) => {
            await tx.payment.update({
                where: { id: payment.id },
                data: { status: "released", released_at: new Date() },
            });
            await tx.payoutLedgerEntry.create({
                data: {
                    vendor_id: payment.booking.listing.vendor_id,
                    booking_id: payment.booking_id,
                    gross_amount_paisa: gross,
                    commission_amount_paisa: commission,
                    net_payout_paisa: net,
                    status: "pending",
                },
            });
        });
        released++;
    }

    return res.status(200).json(new ApiResponse(200, { released }, `Auto-released ${released} payment(s)`));
});

const forceReleasePayment = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const paymentId = req.params["paymentId"] as string;
    const reasonCode = typeof req.body?.reason_code === "string" ? req.body.reason_code : undefined;
    if (!reasonCode) throw new ApiError(400, "reason_code is required for force release");

    const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: { booking: { select: { id: true, listing: { select: { vendor_id: true } } } } },
    });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status !== "held_escrow") {
        throw new ApiError(409, `Cannot force-release payment with status: ${payment.status}`);
    }

    const vendor = await prisma.vendor.findFirst({ where: { id: payment.booking.listing.vendor_id } });
    const commissionRate = vendor?.commission_rate_override ? Number(vendor.commission_rate_override) / 100 : 0.1;
    const gross = payment.amount_paisa;
    const commission = BigInt(Math.round(Number(gross) * commissionRate));
    const net = gross - commission;

    await prisma.$transaction(async (tx) => {
        await tx.payment.update({
            where: { id: paymentId },
            data: { status: "released", released_at: new Date() },
        });
        await tx.payoutLedgerEntry.create({
            data: {
                vendor_id: payment.booking.listing.vendor_id,
                booking_id: payment.booking_id,
                gross_amount_paisa: gross,
                commission_amount_paisa: commission,
                net_payout_paisa: net,
                status: "pending",
            },
        });
    });

    return res.status(200).json(new ApiResponse(200, { payment_id: paymentId, reason_code: reasonCode }, "Payment force-released"));
});

const markPaymentVerifying = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const paymentId = req.params["paymentId"] as string;

    const payment = await prisma.payment.findFirst({
        where: { id: paymentId, booking: { user_id: req.user.id } },
    });
    if (!payment) throw new ApiError(404, "Payment not found");
    if (payment.status !== "pending") throw new ApiError(400, "Payment is not in pending state");

    await prisma.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: paymentId }, data: { status: "verifying" } });
        await tx.calendarAvailability.updateMany({
            where: { booking_id: payment.booking_id, status: "held" },
            data: { hold_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        });
    });

    return res.status(200).json(new ApiResponse(200, null, "Payment marked as verifying — hold extended 24h"));
});

export { initiatePayment, handleWebhook, getPaymentsByBooking, triggerAutoRelease, forceReleasePayment, markPaymentVerifying };
