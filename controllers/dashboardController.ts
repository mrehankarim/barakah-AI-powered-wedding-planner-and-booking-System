import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";

const myPackages = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const packages = await prisma.package.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      total_budget_paisa: true,
      wedding_date: true,
      guest_count: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, packages, "Packages retrieved successfully"));
});

const myBookings = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const bookings = await prisma.booking.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: "desc" },
    include: {
      listing: { include: { vendor: true, category: true } },
      tier: true,
      package: true,
      payments: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, bookings, "Bookings retrieved successfully"));
});

const myReviews = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const reviews = await prisma.review.findMany({
    where: { user_id: req.user.id },
    orderBy: { created_at: "desc" },
    include: {
      listing: { select: { title: true, vendor: { select: { legal_business_name: true } } } },
      booking: { select: { event_date: true, status: true } },
    },
  });

  return res.status(200).json(new ApiResponse(200, reviews, "Reviews retrieved successfully"));
});

const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { fullName, city } = req.body;
  if (!fullName && !city) {
    throw new ApiError(400, "At least one field (fullName or city) must be provided");
  }

  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(fullName && { full_name: fullName }),
      ...(city && { city }),
    },
    select: {
      id: true,
      full_name: true,
      email: true,
      city: true,
      role: true,
      created_at: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

export { myPackages, myBookings, myReviews, updateProfile };