import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import NotificationService from "../services/notificationService";
import { createReviewSchema, updateReviewSchema } from "../validators/reviewValidator";

const recalculateVendorRating = async (listingId: string) => {
  const aggregate = await prisma.review.aggregate({
    where: { listing_id: listingId },
    _avg: { rating: true },
    _count: true,
  });

  const avgRating = aggregate._avg.rating ?? 0;
  const reviewCount = aggregate._count;

  await prisma.vendorListing.update({
    where: { id: listingId },
    data: {
      avg_rating: avgRating,
      review_count: reviewCount,
    },
  });
};

const createReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const parseResult = createReviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const { bookingId, listingId, rating, text } = parseResult.data;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, user_id: req.user.id },
  });
  if (!booking) throw new ApiError(404, "Booking not found");

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: {
        booking_id: bookingId,
        user_id: req.user!.id,
        listing_id: listingId,
        rating,
        text: text ?? null,
        is_verified_booking: true,
      },
    });

    await recalculateVendorRating(listingId);

    return created;
  });

  NotificationService.onReviewSubmitted(review.id).catch(() => {});

  return res.status(201).json(
    new ApiResponse(201, review, "Review submitted successfully")
  );
});

const updateReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id } = req.params;
  const parseResult = updateReviewSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const existing = await prisma.review.findFirst({
    where: { id: id as string, user_id: req.user.id },
  });
  if (!existing) throw new ApiError(404, "Review not found");

  const { rating, text } = parseResult.data;

  const updated = await prisma.review.update({
    where: { id: id as string },
    data: {
      ...(rating !== undefined && { rating }),
      ...(text !== undefined && { text }),
    },
  });

  await recalculateVendorRating(existing.listing_id);

  return res.status(200).json(
    new ApiResponse(200, updated, "Review updated successfully")
  );
});

const deleteReview = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id } = req.params;
  const reviewId = id as string;

  const existing = await prisma.review.findFirst({
    where: { id: reviewId, user_id: req.user.id },
    select: { listing_id: true },
  });
  if (!existing) throw new ApiError(404, "Review not found");

  await prisma.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: id as string } });
    await recalculateVendorRating(existing.listing_id);
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Review deleted successfully")
  );
});

const getVendorReviews = asyncHandler(async (req: Request, res: Response) => {
  const { id: vendorId } = req.params;

  const vendor = await prisma.vendor.findUnique({
    where: { id: vendorId as string },
    select: { id: true },
  });
  if (!vendor) throw new ApiError(404, "Vendor not found");

  const listings = await prisma.vendorListing.findMany({
    where: { vendor_id: vendorId as string },
    select: { id: true },
  });

  const listingIds = listings.map((l) => l.id);

  const reviews = await prisma.review.findMany({
    where: { listing_id: { in: listingIds } },
    include: {
      user: { select: { full_name: true, id: true } },
      booking: { select: { id: true, event_date: true } },
    },
    orderBy: { created_at: "desc" },
  });

  const aggregate = await prisma.review.aggregate({
    where: { listing_id: { in: listingIds } },
    _avg: { rating: true },
    _count: true,
  });

  const result = {
    reviews,
    aggregate: {
      averageRating: aggregate._avg.rating ?? 0,
      totalReviews: aggregate._count,
    },
  };

  return res.status(200).json(new ApiResponse(200, result, "Vendor reviews retrieved successfully"));
});

export { createReview, updateReview, deleteReview, getVendorReviews };