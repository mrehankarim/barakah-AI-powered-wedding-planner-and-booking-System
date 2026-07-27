import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import { updateListingStatusSchema, updateVendorAdminSchema, disputeResolutionSchema } from "../validators/adminValidator";

const listingStatusTransitions: Record<string, string[]> = {
    draft: ["under_review"],
    under_review: ["approved", "rejected", "changes_requested"],
    changes_requested: ["under_review"],
    approved: ["suspended"],
    rejected: [],
    suspended: ["approved"],
};

const getAllVendors = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const statusFilter = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const page = parseInt(typeof req.query["page"] === "string" ? req.query["page"] : "1");
    const limit = Math.min(parseInt(typeof req.query["limit"] === "string" ? req.query["limit"] : "20"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusFilter) where["verification_status"] = statusFilter;

    const [vendors, total] = await prisma.$transaction([
        prisma.vendor.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            include: {
                owner_user: { select: { id: true, full_name: true, email: true, city: true } },
                listings: { select: { id: true, title: true, status: true, city: true } },
            },
        }),
        prisma.vendor.count({ where }),
    ]);

    return res.status(200).json(new ApiResponse(200, { vendors, total, page, limit }, "Vendors retrieved"));
});

const getVendorById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const vendorId = req.params["vendorId"] as string;

    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
        include: {
            owner_user: { select: { id: true, full_name: true, email: true, city: true, role: true, created_at: true } },
            listings: { include: { category: true, pricing_tiers: true } },
            payout_ledger_entries: { orderBy: { paid_at: "desc" }, take: 10 },
        },
    });

    if (!vendor) throw new ApiError(404, "Vendor not found");

    return res.status(200).json(new ApiResponse(200, vendor, "Vendor retrieved"));
});

const updateVendor = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const vendorId = req.params["vendorId"] as string;

    const parse = updateVendorAdminSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.issues.map((e: { message: string }) => e.message).join(", "));

    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor) throw new ApiError(404, "Vendor not found");

    const updateData: Record<string, unknown> = {};
    if (parse.data.commission_rate_override !== undefined) updateData["commission_rate_override"] = parse.data.commission_rate_override;
    if (parse.data.verification_status !== undefined) updateData["verification_status"] = parse.data.verification_status;

    const updated = await prisma.vendor.update({
        where: { id: vendorId },
        data: updateData,
        select: { id: true, legal_business_name: true, verification_status: true, commission_rate_override: true },
    });

    return res.status(200).json(new ApiResponse(200, updated, "Vendor updated"));
});

const getAllListings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const statusFilter = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const page = parseInt(typeof req.query["page"] === "string" ? req.query["page"] : "1");
    const limit = Math.min(parseInt(typeof req.query["limit"] === "string" ? req.query["limit"] : "20"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusFilter) where["status"] = statusFilter;

    const [listings, total] = await prisma.$transaction([
        prisma.vendorListing.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            include: {
                vendor: { select: { id: true, legal_business_name: true, verification_status: true } },
                category: { select: { name: true, slug: true } },
            },
        }),
        prisma.vendorListing.count({ where }),
    ]);

    return res.status(200).json(new ApiResponse(200, { listings, total, page, limit }, "Listings retrieved"));
});

const updateListingStatus = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const listingId = req.params["listingId"] as string;

    const parse = updateListingStatusSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));

    const listing = await prisma.vendorListing.findUnique({ where: { id: listingId } });
    if (!listing) throw new ApiError(404, "Listing not found");

    const allowed = listingStatusTransitions[listing.status] ?? [];
    if (!allowed.includes(parse.data.status)) {
        throw new ApiError(409, `Invalid transition: ${listing.status} → ${parse.data.status}`);
    }

    const updateData: Record<string, unknown> = { status: parse.data.status };
    if (parse.data.status === "approved") {
        updateData["requires_reverification"] = false;
    }

    const updated = await prisma.vendorListing.update({
        where: { id: listingId },
        data: updateData,
        select: { id: true, title: true, status: true, requires_reverification: true },
    });

    return res.status(200).json(new ApiResponse(200, updated, `Listing status updated to ${parse.data.status}`));
});

const getAllBookings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const statusFilter = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const page = parseInt(typeof req.query["page"] === "string" ? req.query["page"] : "1");
    const limit = Math.min(parseInt(typeof req.query["limit"] === "string" ? req.query["limit"] : "20"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusFilter) where["status"] = statusFilter;

    const [bookings, total] = await prisma.$transaction([
        prisma.booking.findMany({
            where,
            skip,
            take: limit,
            orderBy: { created_at: "desc" },
            include: {
                user: { select: { id: true, full_name: true, email: true } },
                listing: { select: { id: true, title: true, vendor: { select: { legal_business_name: true } } } },
                payments: { select: { id: true, status: true, amount_paisa: true, milestone_label: true } },
            },
        }),
        prisma.booking.count({ where }),
    ]);

    return res.status(200).json(new ApiResponse(200, { bookings, total, page, limit }, "Bookings retrieved"));
});

const resolveDispute = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const bookingId = req.params["bookingId"] as string;

    const parse = disputeResolutionSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
            payments: true,
            listing: { select: { vendor_id: true } },
        },
    });
    if (!booking) throw new ApiError(404, "Booking not found");
    if (booking.status !== "disputed") throw new ApiError(409, "Booking is not in disputed state");

    const { resolution } = parse.data;

    await prisma.$transaction(async (tx) => {
        if (resolution === "release") {
            const heldPayments = booking.payments.filter((p) => p.status === "held_escrow");
            for (const payment of heldPayments) {
                const vendor = await tx.vendor.findFirst({ where: { id: booking.listing.vendor_id } });
                const commissionRate = vendor?.commission_rate_override ? Number(vendor.commission_rate_override) / 100 : 0.1;
                const gross = payment.amount_paisa;
                const commission = BigInt(Math.round(Number(gross) * commissionRate));
                const net = gross - commission;

                await tx.payment.update({ where: { id: payment.id }, data: { status: "released", released_at: new Date() } });
                await tx.payoutLedgerEntry.create({
                    data: {
                        vendor_id: booking.listing.vendor_id,
                        booking_id: bookingId,
                        gross_amount_paisa: gross,
                        commission_amount_paisa: commission,
                        net_payout_paisa: net,
                        status: "pending",
                    },
                });
            }
            await tx.booking.update({ where: { id: bookingId }, data: { status: "completed" } });
        } else {
            await tx.payment.updateMany({
                where: { booking_id: bookingId, status: "held_escrow" },
                data: { status: "refunded" },
            });
            await tx.booking.update({ where: { id: bookingId }, data: { status: "cancelled" } });
            await tx.calendarAvailability.updateMany({
                where: { booking_id: bookingId },
                data: { status: "available", booking_id: null, hold_expires_at: null },
            });
        }
    });

    return res.status(200).json(new ApiResponse(200, null, `Dispute resolved: ${resolution}`));
});

const getAllPayments = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const statusFilter = typeof req.query["status"] === "string" ? req.query["status"] : undefined;
    const page = parseInt(typeof req.query["page"] === "string" ? req.query["page"] : "1");
    const limit = Math.min(parseInt(typeof req.query["limit"] === "string" ? req.query["limit"] : "20"), 100);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusFilter) where["status"] = statusFilter;

    const [payments, total] = await prisma.$transaction([
        prisma.payment.findMany({
            where,
            skip,
            take: limit,
            orderBy: { scheduled_date: "desc" },
            include: {
                booking: {
                    select: {
                        id: true,
                        user: { select: { full_name: true, email: true } },
                        listing: { select: { title: true, vendor: { select: { legal_business_name: true } } } },
                    },
                },
            },
        }),
        prisma.payment.count({ where }),
    ]);

    return res.status(200).json(new ApiResponse(200, { payments, total, page, limit }, "Payments retrieved"));
});

const markPayoutPaid = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const ledgerId = req.params["ledgerId"] as string;

    const entry = await prisma.payoutLedgerEntry.findUnique({ where: { id: ledgerId } });
    if (!entry) throw new ApiError(404, "Payout ledger entry not found");
    if (entry.status !== "pending") throw new ApiError(409, "Payout is not in pending state");

    const updated = await prisma.payoutLedgerEntry.update({
        where: { id: ledgerId },
        data: { status: "paid", paid_at: new Date() },
    });

    return res.status(200).json(new ApiResponse(200, updated, "Payout marked as paid"));
});

const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const [
        totalUsers,
        totalVendors,
        pendingListings,
        totalBookings,
        activeDisputes,
        pendingPayouts,
    ] = await prisma.$transaction([
        prisma.user.count(),
        prisma.vendor.count(),
        prisma.vendorListing.count({ where: { status: "under_review" } }),
        prisma.booking.count(),
        prisma.booking.count({ where: { status: "disputed" } }),
        prisma.payoutLedgerEntry.count({ where: { status: "pending" } }),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { totalUsers, totalVendors, pendingListings, totalBookings, activeDisputes, pendingPayouts }, "Admin dashboard stats")
    );
});

export {
    getAllVendors,
    getVendorById,
    updateVendor,
    getAllListings,
    updateListingStatus,
    getAllBookings,
    resolveDispute,
    getAllPayments,
    markPayoutPaid,
    getDashboardStats,
};
