import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";

import {
    registerVendorSchema,
    createListingSchema,
    updateListingSchema,
    createPricingTierSchema,
    updatePricingTierSchema,
    setAvailabilitySchema,
} from "../validators/vendorValidator";

const registerVendor = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const parse = registerVendorSchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const { legal_business_name, cnic_or_reg_number, payout_bank_iban } = parse.data;

    const existing = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (existing) throw new ApiError(409, "Vendor profile already exists for this account");

    const [, vendor] = await prisma.$transaction([
        prisma.user.update({
            where: { id: req.user.id },
            data: { role: "vendor" },
        }),
        prisma.vendor.create({
            data: {
                owner_user_id: req.user.id,
                legal_business_name,
                cnic_or_reg_number_enc: Buffer.from(cnic_or_reg_number, "utf-8"),
                verification_status: "under_review",
                ...(payout_bank_iban
                    ? { payout_bank_details_enc: Buffer.from(payout_bank_iban, "utf-8") }
                    : {}),
            },
            select: {
                id: true,
                legal_business_name: true,
                verification_status: true,
                created_at: true,
            },
        }),
    ]);

    return res.status(201).json(new ApiResponse(201, vendor, "Vendor registered successfully"));
});

const getMyVendorProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
        select: {
            id: true,
            legal_business_name: true,
            verification_status: true,
            commission_rate_override: true,
            created_at: true,
            listings: {
                select: {
                    id: true,
                    title: true,
                    status: true,
                    city: true,
                    avg_rating: true,
                    review_count: true,
                },
            },
        },
    });

    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    return res.status(200).json(new ApiResponse(200, vendor, "Vendor profile retrieved"));
});


const editVendorProfile = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const parse = registerVendorSchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const { legal_business_name, cnic_or_reg_number, payout_bank_iban } = parse.data;

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const updated = await prisma.vendor.update({
        where: { id: vendor.id },
        data: {
            legal_business_name,
            cnic_or_reg_number_enc: Buffer.from(cnic_or_reg_number, "utf-8"),
            verification_status: "under_review",
            ...(payout_bank_iban
                ? { payout_bank_details_enc: Buffer.from(payout_bank_iban, "utf-8") }
                : {}),
        },
    });

    return res.status(200).json(new ApiResponse(200, updated, "Vendor profile updated"));
});

const createListing = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const parse = createListingSchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found — register as a vendor first");

    const category = await prisma.category.findUnique({
        where: { id: parse.data.category_id },
    });
    if (!category) throw new ApiError(404, "Category not found");

    const listing = await prisma.vendorListing.create({
        data: {
            vendor_id: vendor.id,
            category_id: parse.data.category_id,
            city: parse.data.city,
            ...(parse.data.area !== undefined ? { area: parse.data.area } : {}),
            title: parse.data.title,
            ...(parse.data.description !== undefined ? { description: parse.data.description } : {}),
            attributes: (parse.data.attributes ?? {}) as object,
        },
        include: {
            category: { select: { name: true, slug: true } },
            pricing_tiers: true,
        },
    });

    return res.status(201).json(new ApiResponse(201, listing, "Listing created successfully"));
});

/**
 * GET /api/v1/vendor/listings
 * Returns all listings belonging to the authenticated vendor.
 */
const getMyListings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const listings = await prisma.vendorListing.findMany({
        where: { vendor_id: vendor.id },
        orderBy: { created_at: "desc" },
        include: {
            category: { select: { name: true, slug: true } },
            pricing_tiers: true,
        },
    });

    return res.status(200).json(new ApiResponse(200, listings, "Listings retrieved successfully"));
});


const getListingById = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const listing = await prisma.vendorListing.findFirst({
        where: { id: listingId, vendor_id: vendor.id },
        include: {
            category: true,
            pricing_tiers: true,
            reviews: {
                orderBy: { created_at: "desc" },
                take: 10,
                include: { user: { select: { full_name: true } } },
            },
        },
    });
    if (!listing) throw new ApiError(404, "Listing not found");

    return res.status(200).json(new ApiResponse(200, listing, "Listing retrieved successfully"));
});

const updateListing = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;

    const parse = updateListingSchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const existing = await prisma.vendorListing.findFirst({
        where: { id: listingId, vendor_id: vendor.id },
    });
    if (!existing) throw new ApiError(404, "Listing not found");

    if (["suspended", "under_review"].includes(existing.status)) {
        throw new ApiError(400, `Cannot edit a listing with status: ${existing.status}`);
    }

    const { category_id, city, area, title, description, attributes } = parse.data;

    const updateData: Record<string, unknown> = {};
    if (category_id !== undefined) updateData["category_id"] = category_id;
    if (city !== undefined) updateData["city"] = city;
    if (area !== undefined) updateData["area"] = area;
    if (title !== undefined) updateData["title"] = title;
    if (description !== undefined) updateData["description"] = description;
    if (attributes !== undefined) updateData["attributes"] = attributes;
    // If the listing was approved and content changes, flag for re-verification
    if (existing.status === "approved") updateData["requires_reverification"] = true;

    const updated = await prisma.vendorListing.update({
        where: { id: existing.id },
        data: updateData,
        include: {
            category: { select: { name: true, slug: true } },
            pricing_tiers: true,
        },
    });

    return res.status(200).json(new ApiResponse(200, updated, "Listing updated successfully"));
});


const deleteListing = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const listing = await prisma.vendorListing.findFirst({
        where: { id: listingId, vendor_id: vendor.id },
    });
    if (!listing) throw new ApiError(404, "Listing not found");

    const activeBookings = await prisma.booking.count({
        where: {
            listing_id: listing.id,
            status: { in: ["requested", "confirmed", "in_progress"] },
        },
    });
    if (activeBookings > 0) {
        throw new ApiError(
            409,
            "Cannot remove listing with active bookings. Cancel or complete them first."
        );
    }

    await prisma.vendorListing.update({
        where: { id: listing.id },
        data: { status: "suspended" },
    });

    return res.status(200).json(new ApiResponse(200, null, "Listing removed successfully"));
});

async function resolveOwnedListing(userId: string, listingId: string) {
    const vendor = await prisma.vendor.findFirst({ where: { owner_user_id: userId } });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const listing = await prisma.vendorListing.findFirst({
        where: { id: listingId, vendor_id: vendor.id },
    });
    if (!listing) throw new ApiError(404, "Listing not found");

    return { vendor, listing };
}

const addPricingTier = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;

    const parse = createPricingTierSchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const { listing } = await resolveOwnedListing(req.user.id, listingId);

    const { name, min_capacity, max_capacity, base_price_paisa, currency, inclusions } = parse.data;

    const tier = await prisma.pricingTier.create({
        data: {
            listing_id: listing.id,
            name,
            base_price_paisa,
            currency,
            inclusions: inclusions ?? [],
            ...(min_capacity !== undefined ? { min_capacity } : {}),
            ...(max_capacity !== undefined ? { max_capacity } : {}),
        },
    });

    return res.status(201).json(new ApiResponse(201, tier, "Pricing tier added successfully"));
});


const updatePricingTier = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;
    const tierId = req.params["tierId"] as string;

    const parse = updatePricingTierSchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const { listing } = await resolveOwnedListing(req.user.id, listingId);

    const existingTier = await prisma.pricingTier.findFirst({
        where: { id: tierId, listing_id: listing.id },
    });
    if (!existingTier) throw new ApiError(404, "Pricing tier not found");

    const { name, min_capacity, max_capacity, base_price_paisa, currency, inclusions } = parse.data;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData["name"] = name;
    if (min_capacity !== undefined) updateData["min_capacity"] = min_capacity;
    if (max_capacity !== undefined) updateData["max_capacity"] = max_capacity;
    if (base_price_paisa !== undefined) updateData["base_price_paisa"] = base_price_paisa;
    if (currency !== undefined) updateData["currency"] = currency;
    if (inclusions !== undefined) updateData["inclusions"] = inclusions;

    const updated = await prisma.pricingTier.update({
        where: { id: existingTier.id },
        data: updateData,
    });

    return res.status(200).json(new ApiResponse(200, updated, "Pricing tier updated successfully"));
});


const deletePricingTier = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;
    const tierId = req.params["tierId"] as string;

    const { listing } = await resolveOwnedListing(req.user.id, listingId);

    const existingTier = await prisma.pricingTier.findFirst({
        where: { id: tierId, listing_id: listing.id },
    });
    if (!existingTier) throw new ApiError(404, "Pricing tier not found");

    await prisma.pricingTier.update({
        where: { id: existingTier.id },
        data: { is_active: false },
    });

    return res.status(200).json(new ApiResponse(200, null, "Pricing tier deactivated successfully"));
});


const getCalendar = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;

    const { listing } = await resolveOwnedListing(req.user.id, listingId);

    const fromStr = req.query["from"];
    const toStr = req.query["to"];

    const from = typeof fromStr === "string" ? new Date(fromStr) : new Date();
    const to =
        typeof toStr === "string"
            ? new Date(toStr)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const slots = await prisma.calendarAvailability.findMany({
        where: {
            listing_id: listing.id,
            date: { gte: from, lte: to },
        },
        orderBy: { date: "asc" },
        select: {
            id: true,
            date: true,
            status: true,
            hold_expires_at: true,
            booking_id: true,
        },
    });

    return res.status(200).json(new ApiResponse(200, slots, "Calendar retrieved successfully"));
});


const setAvailability = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const listingId = req.params["listingId"] as string;

    const parse = setAvailabilitySchema.safeParse(req.body);
    if (!parse.success) {
        throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));
    }

    const { listing } = await resolveOwnedListing(req.user.id, listingId);

    const { dates, status } = parse.data;

    const results = await prisma.$transaction(
        dates.map((dateStr) => {
            const date = new Date(dateStr);
            return prisma.calendarAvailability.upsert({
                where: { listing_id_date: { listing_id: listing.id, date } },
                create: { listing_id: listing.id, date, status },
                update: { status },
            });
        })
    );

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                results,
                `Availability set to '${status}' for ${results.length} date(s)`
            )
        );
});

const getVendorBookings = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const validStatuses = [
        "requested",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
        "disputed",
    ] as const;

    const statusQuery = req.query["status"];
    const statusFilter = typeof statusQuery === "string" ? statusQuery : undefined;

    if (statusFilter && !(validStatuses as readonly string[]).includes(statusFilter)) {
        throw new ApiError(
            400,
            `Invalid status filter. Must be one of: ${validStatuses.join(", ")}`
        );
    }

    const bookings = await prisma.booking.findMany({
        where: {
            listing: { vendor_id: vendor.id },
            ...(statusFilter
                ? { status: statusFilter as (typeof validStatuses)[number] }
                : {}),
        },
        orderBy: { event_date: "asc" },
        include: {
            listing: { select: { id: true, title: true, city: true } },
            tier: { select: { id: true, name: true, base_price_paisa: true } },
            user: { select: { id: true, full_name: true, email: true } },
            payments: {
                select: {
                    id: true,
                    milestone_label: true,
                    amount_paisa: true,
                    status: true,
                },
            },
        },
    });

    return res.status(200).json(new ApiResponse(200, bookings, "Vendor bookings retrieved"));
});

const confirmBooking = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");
    const bookingId = req.params["bookingId"] as string;

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const booking = await prisma.booking.findFirst({
        where: {
            id: bookingId,
            listing: { vendor_id: vendor.id },
        },
    });
    if (!booking) throw new ApiError(404, "Booking not found");

    if (booking.status !== "requested") {
        throw new ApiError(400, `Cannot confirm a booking with status: ${booking.status}`);
    }

    const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: "confirmed" },
        include: {
            listing: { select: { title: true } },
            user: { select: { full_name: true, email: true } },
        },
    });

    return res.status(200).json(new ApiResponse(200, updated, "Booking confirmed successfully"));
});


const getPayoutLedger = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const vendor = await prisma.vendor.findFirst({
        where: { owner_user_id: req.user.id },
    });
    if (!vendor) throw new ApiError(404, "Vendor profile not found");

    const statusQuery = req.query["status"];
    const statusFilter =
        typeof statusQuery === "string" && ["pending", "paid"].includes(statusQuery)
            ? (statusQuery as "pending" | "paid")
            : undefined;

    if (typeof statusQuery === "string" && statusFilter === undefined) {
        throw new ApiError(400, "Invalid status. Must be 'pending' or 'paid'");
    }

    const entries = await prisma.payoutLedgerEntry.findMany({
        where: {
            vendor_id: vendor.id,
            ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: { paid_at: "desc" },
        include: {
            booking: {
                select: {
                    id: true,
                    event_date: true,
                    agreed_total_price_paisa: true,
                    listing: { select: { title: true } },
                    user: { select: { full_name: true } },
                },
            },
        },
    });

    const totalGross = entries.reduce((sum, e) => sum + e.gross_amount_paisa, 0n);
    const totalCommission = entries.reduce((sum, e) => sum + e.commission_amount_paisa, 0n);
    const totalNet = entries.reduce((sum, e) => sum + e.net_payout_paisa, 0n);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                entries,
                summary: {
                    total_gross_paisa: totalGross.toString(),
                    total_commission_paisa: totalCommission.toString(),
                    total_net_payout_paisa: totalNet.toString(),
                },
            },
            "Payout ledger retrieved successfully"
        )
    );
});

export {
    registerVendor,
    getMyVendorProfile,
    editVendorProfile,
    createListing,
    getMyListings,
    getListingById,
    updateListing,
    deleteListing,
    addPricingTier,
    updatePricingTier,
    deletePricingTier,
    getCalendar,
    setAvailability,
    getVendorBookings,
    confirmBooking,
    getPayoutLedger,
};