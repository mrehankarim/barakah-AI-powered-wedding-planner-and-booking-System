import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import {
  createPackageSchema,
  updatePackageSchema,
  addPackageItemSchema,
  updatePackageItemSchema,
} from "../validators/packageValidator";

const createPackage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const parseResult = createPackageSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const { title, totalBudgetPaisa, weddingDate, guestCount, status } = parseResult.data;

  const packageData = await prisma.package.create({
    data: {
      user_id: req.user.id,
      title: title ?? null,
      total_budget_paisa: totalBudgetPaisa,
      wedding_date: weddingDate ? new Date(weddingDate) : null,
      guest_count: guestCount ?? null,
      status: status ?? "draft",
    },
    select: {
      id: true,
      user_id: true,
      title: true,
      total_budget_paisa: true,
      wedding_date: true,
      guest_count: true,
      status: true,
      created_at: true,
      updated_at: true,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, packageData, "Package created successfully")
  );
});

const listPackages = asyncHandler(async (req: Request, res: Response) => {
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
      line_items: {
        select: {
          id: true,
          category_id: true,
          listing_id: true,
          tier_id: true,
          allocated_budget_paisa: true,
          actual_price_paisa: true,
          is_locked: true,
          rank_at_selection: true,
        },
      },
    },
  });

  return res.status(200).json(new ApiResponse(200, packages, "Packages retrieved successfully"));
});

const getPackageById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id: packageId } = req.params;

  const packageData = await prisma.package.findFirstOrThrow({
    where: { id: packageId as string, user_id: req.user.id },
    include: {
      line_items: {
        include: {
          category: true,
          listing: { include: { vendor: true, category: true } },
          tier: true,
        },
      },
    },
  });

  return res.status(200).json(new ApiResponse(200, packageData, "Package retrieved successfully"));
});

const updatePackage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id: packageId } = req.params;
  const parseResult = updatePackageSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const existing = await prisma.package.findFirst({
    where: { id: packageId as string, user_id: req.user.id },
  });
  if (!existing) throw new ApiError(404, "Package not found");

  const { title, totalBudgetPaisa, weddingDate, guestCount, status } = parseResult.data;

  const updated = await prisma.package.update({
    where: { id: packageId as string },
    data: {
      ...(title !== undefined && { title }),
      ...(totalBudgetPaisa !== undefined && { total_budget_paisa: totalBudgetPaisa }),
      ...(weddingDate !== undefined && { wedding_date: new Date(weddingDate) }),
      ...(guestCount !== undefined && { guest_count: guestCount }),
      ...(status !== undefined && { status }),
    },
    select: {
      id: true,
      user_id: true,
      title: true,
      total_budget_paisa: true,
      wedding_date: true,
      guest_count: true,
      status: true,
      updated_at: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, updated, "Package updated successfully"));
});

const deletePackage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id: packageId } = req.params;

  await prisma.package.delete({
    where: { id: packageId as string, user_id: req.user.id },
  });

  return res.status(200).json(new ApiResponse(200, null, "Package deleted successfully"));
});

const addPackageItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id: packageId } = req.params;
  const parseResult = addPackageItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const existingPackage = await prisma.package.findFirst({
    where: { id: packageId as string, user_id: req.user.id },
  });
  if (!existingPackage) throw new ApiError(404, "Package not found");

  const { categoryId, listingId, tierId, allocatedBudgetPaisa, rationaleText, rankAtSelection } = parseResult.data;

  if (listingId) {
    const listing = await prisma.vendorListing.findUnique({
      where: { id: listingId },
    });
    if (!listing) throw new ApiError(404, "Listing not found");
  }

  const lineItem = await prisma.packageLineItem.create({
    data: {
      package_id: packageId as string,
      category_id: categoryId,
      listing_id: listingId ?? null,
      tier_id: tierId ?? null,
      allocated_budget_paisa: allocatedBudgetPaisa,
      rationale_text: rationaleText ?? null,
      rank_at_selection: rankAtSelection ?? null,
    },
    include: {
      category: true,
      listing: true,
      tier: true,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, lineItem, "Item added to package successfully")
  );
});

const updatePackageItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id: packageId, itemId } = req.params;
  const parseResult = updatePackageItemSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const existingItem = await prisma.packageLineItem.findFirst({
    where: { id: itemId as string, package_id: packageId as string },
  });
  if (!existingItem) throw new ApiError(404, "Package item not found");

  const { allocatedBudgetPaisa, isLocked, rankAtSelection, rationaleText } = parseResult.data;

  const updated = await prisma.packageLineItem.update({
    where: { id: itemId as string },
    data: {
      ...(allocatedBudgetPaisa !== undefined && { allocated_budget_paisa: allocatedBudgetPaisa }),
      ...(isLocked !== undefined && { is_locked: isLocked }),
      ...(rankAtSelection !== undefined && { rank_at_selection: rankAtSelection }),
      ...(rationaleText !== undefined && { rationale_text: rationaleText }),
    },
    include: {
      category: true,
      listing: true,
      tier: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, updated, "Package item updated successfully"));
});

const removePackageItem = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id: packageId, itemId } = req.params;

  const existingItem = await prisma.packageLineItem.findFirst({
    where: { id: itemId as string, package_id: packageId as string },
  });
  if (!existingItem) throw new ApiError(404, "Package item not found");

  await prisma.packageLineItem.delete({
    where: { id: itemId as string },
  });

  return res.status(200).json(new ApiResponse(200, null, "Package item removed successfully"));
});

export {
  createPackage,
  listPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  addPackageItem,
  updatePackageItem,
  removePackageItem,
};