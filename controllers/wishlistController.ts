import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import { z } from "zod";

const toggleWishlistSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
});

const toggleWishlist = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const parseResult = toggleWishlistSchema.safeParse(req.body);
  if (!parseResult.success) {
    throw new ApiError(400, parseResult.error.issues.map((e) => e.message).join(", "));
  }

  const { listingId } = parseResult.data;

  // Verify listing exists
  const listing = await prisma.vendorListing.findUnique({
    where: { id: listingId },
  });
  if (!listing) throw new ApiError(404, "Listing not found");

  // Check if already in wishlist
  const existing = await prisma.wishlist.findFirst({
    where: {
      user_id: req.user.id,
      listing_id: listingId,
    },
  });

  if (existing) {
    await prisma.wishlist.delete({
      where: { id: existing.id },
    });

    return res.status(200).json(
      new ApiResponse(200, { saved: false }, "Removed from wishlist successfully")
    );
  }

  const wishlistEntry = await prisma.wishlist.create({
    data: {
      user_id: req.user.id,
      listing_id: listingId,
    },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          vendor: { select: { legal_business_name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  return res.status(201).json(
    new ApiResponse(201, wishlistEntry, "Added to wishlist successfully")
  );
});

const getWishlist = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const wishlist = await prisma.wishlist.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: "desc" },
    include: {
      listing: {
        include: {
          vendor: { select: { legal_business_name: true } },
          category: { select: { name: true } },
        },
      },
    },
  });

  return res.status(200).json(new ApiResponse(200, wishlist, "Wishlist retrieved successfully"));
});

const removeFromWishlist = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { listingId } = req.params;
  const listingIdStr = listingId as string;

  const existing = await prisma.wishlist.findFirst({
    where: {
      user_id: req.user.id,
      listing_id: listingIdStr,
    },
  });
  if (!existing) throw new ApiError(404, "Wishlist entry not found");

  await prisma.wishlist.delete({
    where: { id: existing.id },
  });

  return res.status(200).json(
    new ApiResponse(200, null, "Removed from wishlist successfully")
  );
});

export { toggleWishlist, getWishlist, removeFromWishlist };