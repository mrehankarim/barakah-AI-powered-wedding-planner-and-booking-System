import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import ApiResponse from "../utils/apiResponse";
import { prisma } from "../lib/prisma";
import NotificationService from "../services/notificationService";
import { createBookingSchema, cancelBookingSchema } from "../validators/bookingValidator";

const createBooking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const parseResult = createBookingSchema.safeParse(req.body);
  if (!parseResult.success) {
    const msg = parseResult.error.issues.map((e) => e.message).join(", ");
    throw new ApiError(400, msg);
  }

  const { listingId, tierId, packageId, eventDate, guestCount, agreedTotalPricePaisa } =
    parseResult.data;

  const listing = await prisma.vendorListing.findUnique({
    where: { id: listingId },
  });
  if (!listing) throw new ApiError(404, "Listing not found");

  if (packageId) {
    const pkg = await prisma.package.findFirst({
      where: { id: packageId, user_id: req.user.id },
    });
    if (!pkg) throw new ApiError(404, "Package not found");
  }

  if (tierId) {
    const tier = await prisma.pricingTier.findFirst({
      where: { id: tierId, listing_id: listingId },
    });
    if (!tier) throw new ApiError(404, "Pricing tier not found for this listing");
  }

  const booking = await prisma.$transaction(async (tx) => {
    const createdBooking = await tx.booking.create({
      data: {
        package_id: packageId ?? null,
        user_id: req.user!.id,
        listing_id: listingId,
        tier_id: tierId ?? null,
        event_date: new Date(eventDate),
        guest_count: guestCount ?? null,
        agreed_total_price_paisa: agreedTotalPricePaisa,
        status: "requested",
      },
      select: {
        id: true,
        package_id: true,
        user_id: true,
        listing_id: true,
        tier_id: true,
        event_date: true,
        guest_count: true,
        status: true,
        agreed_total_price_paisa: true,
        created_at: true,
      },
    });

    const eventDateOnly = new Date(eventDate);
    eventDateOnly.setHours(0, 0, 0, 0);

    const existingAvail = await tx.calendarAvailability.findUnique({
      where: {
        listing_id_date: {
          listing_id: listingId,
          date: eventDateOnly,
        },
      },
    });

    if (existingAvail) {
      await tx.calendarAvailability.update({
        where: { id: existingAvail.id },
        data: {
          status: "held",
          hold_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          booking_id: createdBooking.id,
        },
      });
    } else {
      await tx.calendarAvailability.create({
        data: {
          listing_id: listingId,
          date: eventDateOnly,
          status: "held",
          hold_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          booking_id: createdBooking.id,
        },
      });
    }

    await tx.payment.create({
      data: {
        booking_id: createdBooking.id,
        milestone_label: "Deposit",
        amount_paisa: agreedTotalPricePaisa,
        method: "card",
        status: "pending",
        scheduled_date: eventDateOnly,
      },
    });

    return createdBooking;
  });

  NotificationService.onBookingCreated(booking.id).catch(() => {});

  return res.status(201).json(
    new ApiResponse(201, booking, "Booking created successfully")
  );
});

const listBookings = asyncHandler(async (req: Request, res: Response) => {
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

const getBookingById = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id } = req.params;

  const booking = await prisma.booking.findFirstOrThrow({
    where: { id: id as string, user_id: req.user.id },
    include: {
      listing: { include: { vendor: true, category: true } },
      tier: true,
      package: true,
      payments: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, booking, "Booking retrieved successfully"));
});

const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw new ApiError(401, "Unauthorized");

  const { id } = req.params;

  const bookingId = req.params.id as string;
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, user_id: req.user.id },
  });
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.status === "cancelled") {
    throw new ApiError(400, "Booking is already cancelled");
  }
  if (!["requested", "confirmed"].includes(booking.status)) {
    throw new ApiError(400, `Cannot cancel booking with status: ${booking.status}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "cancelled" },
    });

    await tx.calendarAvailability.updateMany({
      where: { booking_id: bookingId },
      data: {
        status: "available",
        booking_id: null,
        hold_expires_at: null,
      },
    });

    await tx.payment.updateMany({
      where: { booking_id: bookingId },
      data: { status: "refunded" },
    });
  });

  NotificationService.onBookingCancelled(bookingId).catch(() => {});

  return res.status(200).json(
    new ApiResponse(200, null, "Booking cancelled successfully")
  );
});

export { createBooking, listBookings, getBookingById, cancelBooking };