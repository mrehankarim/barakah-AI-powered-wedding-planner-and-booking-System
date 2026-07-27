import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import { createHoldSchema, checkAvailabilitySchema } from "../validators/listingValidator";

const HOLD_TTL_MS = 30 * 60 * 1000;

const getListings = asyncHandler(async (req: Request, res: Response) => {
    const city = typeof req.query["city"] === "string" ? req.query["city"] : undefined;
    const categoryId = typeof req.query["categoryId"] === "string" ? req.query["categoryId"] : undefined;
    const minPrice = typeof req.query["minPrice"] === "string" ? BigInt(req.query["minPrice"]) : undefined;
    const maxPrice = typeof req.query["maxPrice"] === "string" ? BigInt(req.query["maxPrice"]) : undefined;
    const page = parseInt(typeof req.query["page"] === "string" ? req.query["page"] : "1");
    const limit = Math.min(parseInt(typeof req.query["limit"] === "string" ? req.query["limit"] : "20"), 50);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
        status: "approved",
        requires_reverification: false,
    };

    if (city) where["city"] = { equals: city, mode: "insensitive" };
    if (categoryId) where["category_id"] = categoryId;
    if (minPrice !== undefined || maxPrice !== undefined) {
        where["pricing_tiers"] = {
            some: {
                is_active: true,
                base_price_paisa: {
                    ...(minPrice !== undefined && { gte: minPrice }),
                    ...(maxPrice !== undefined && { lte: maxPrice }),
                },
            },
        };
    }

    const [listings, total] = await prisma.$transaction([
        prisma.vendorListing.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ avg_rating: "desc" }, { created_at: "desc" }],
            include: {
                category: { select: { name: true, slug: true } },
                vendor: { select: { id: true, legal_business_name: true, verification_status: true } },
                pricing_tiers: { where: { is_active: true } },
            },
        }),
        prisma.vendorListing.count({ where }),
    ]);

    return res.status(200).json(
        new ApiResponse(200, { listings, total, page, limit, totalPages: Math.ceil(total / limit) }, "Listings retrieved")
    );
});

const getListingDetail = asyncHandler(async (req: Request, res: Response) => {
    const listingId = req.params["listingId"] as string;

    const listing = await prisma.vendorListing.findFirst({
        where: { id: listingId, status: "approved", requires_reverification: false },
        include: {
            category: true,
            vendor: { select: { id: true, legal_business_name: true } },
            pricing_tiers: { where: { is_active: true } },
            reviews: {
                take: 10,
                orderBy: { created_at: "desc" },
                include: { user: { select: { full_name: true } } },
            },
        },
    });

    if (!listing) throw new ApiError(404, "Listing not found");

    return res.status(200).json(new ApiResponse(200, listing, "Listing retrieved"));
});

const getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, slug: true, attribute_schema: true, default_budget_weight_pct: true },
    });
    return res.status(200).json(new ApiResponse(200, categories, "Categories retrieved"));
});

const createHold = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const parse = createHoldSchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));

    const { listingId, date } = parse.data;
    const holdDate = new Date(date);
    const holdExpiresAt = new Date(Date.now() + HOLD_TTL_MS);

    const listing = await prisma.vendorListing.findFirst({
        where: { id: listingId, status: "approved", requires_reverification: false },
    });
    if (!listing) throw new ApiError(404, "Listing not found or not available for booking");

    const existing = await prisma.calendarAvailability.findUnique({
        where: { listing_id_date: { listing_id: listingId, date: holdDate } },
    });

    if (existing) {
        if (existing.status === "held") {
            throw new ApiError(409, `Date is already held until ${existing.hold_expires_at?.toISOString()}`);
        }
        if (existing.status === "booked") {
            throw new ApiError(409, "Date is already booked");
        }
        if (existing.status === "blocked") {
            throw new ApiError(409, "Date is blocked by vendor");
        }
    }

    const slot = await prisma.calendarAvailability.upsert({
        where: { listing_id_date: { listing_id: listingId, date: holdDate } },
        create: { listing_id: listingId, date: holdDate, status: "held", hold_expires_at: holdExpiresAt },
        update: { status: "held", hold_expires_at: holdExpiresAt },
    });

    return res.status(201).json(new ApiResponse(201, { slot, hold_expires_at: holdExpiresAt }, "Hold created successfully. Complete booking within 30 minutes."));
});

const releaseHold = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "Unauthorized");

    const listingId = req.params["listingId"] as string;
    const date = req.params["date"] as string;
    const holdDate = new Date(date);

    const slot = await prisma.calendarAvailability.findUnique({
        where: { listing_id_date: { listing_id: listingId, date: holdDate } },
    });

    if (!slot || slot.status !== "held") throw new ApiError(404, "No active hold found for this date");

    await prisma.calendarAvailability.update({
        where: { listing_id_date: { listing_id: listingId, date: holdDate } },
        data: { status: "available", hold_expires_at: null, booking_id: null },
    });

    return res.status(200).json(new ApiResponse(200, null, "Hold released"));
});

const checkAvailability = asyncHandler(async (req: Request, res: Response) => {
    const parse = checkAvailabilitySchema.safeParse(req.body);
    if (!parse.success) throw new ApiError(400, parse.error.issues.map((e) => e.message).join(", "));

    const { listing_ids, date } = parse.data;
    const checkDate = new Date(date);

    const slots = await prisma.calendarAvailability.findMany({
        where: {
            listing_id: { in: listing_ids },
            date: checkDate,
        },
        select: { listing_id: true, status: true, hold_expires_at: true },
    });

    const slotMap = new Map(slots.map((s) => [s.listing_id, s]));

    const result = listing_ids.map((id) => {
        const slot = slotMap.get(id);
        if (!slot) return { listing_id: id, available: true };
        const available = slot.status === "available";
        return { listing_id: id, available, status: slot.status, hold_expires_at: slot.hold_expires_at };
    });

    return res.status(200).json(new ApiResponse(200, result, "Availability checked"));
});

export { getListings, getListingDetail, getCategories, createHold, releaseHold, checkAvailability };
