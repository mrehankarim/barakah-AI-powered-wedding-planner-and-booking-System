import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../lib/prisma";
import NotificationService from "../services/notificationService";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    vendorListing: {
      findUnique: vi.fn(),
    },
    package: {
      findFirst: vi.fn(),
    },
    pricingTier: {
      findFirst: vi.fn(),
    },
    booking: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    calendarAvailability: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    payment: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("../services/notificationService", () => ({
  default: {
    onBookingCreated: vi.fn().mockResolvedValue(undefined),
    onBookingCancelled: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockUser = {
  id: "88888888-8888-8888-8888-888888888888",
  role: "end_user",
  email: "bookinguser@barakah.com",
  full_name: "Booking User",
  city: "Karachi",
  created_at: new Date(),
  updated_at: new Date(),
};

const tokenSecret = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret_change_in_production";
const authToken = jwt.sign(
  { id: mockUser.id, role: mockUser.role, email: mockUser.email, full_name: mockUser.full_name },
  tokenSecret
);

describe("Module 2: Booking System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  });

  describe("POST /api/v1/bookings (Create Booking with Transaction)", () => {
    it("should create booking, hold calendar availability, create deposit payment, and trigger notification", async () => {
      const listingId = "11111111-1111-1111-1111-111111111111";
      const eventDate = "2026-12-25T00:00:00.000Z";

      (prisma.vendorListing.findUnique as any).mockResolvedValue({ id: listingId });
      (prisma.booking.create as any).mockResolvedValue({
        id: "book-100",
        package_id: null,
        user_id: mockUser.id,
        listing_id: listingId,
        tier_id: null,
        event_date: new Date(eventDate),
        guest_count: 200,
        agreed_total_price_paisa: 30000000n,
        status: "requested",
        created_at: new Date(),
      });
      (prisma.calendarAvailability.findUnique as any).mockResolvedValue(null);
      (prisma.calendarAvailability.create as any).mockResolvedValue({ id: "avail-1" });
      (prisma.payment.create as any).mockResolvedValue({ id: "pay-1" });

      const res = await request(app)
        .post("/api/v1/bookings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          listingId,
          eventDate,
          guestCount: 200,
          agreedTotalPricePaisa: 30000000,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("book-100");
      expect(res.body.data.status).toBe("requested");
      expect(prisma.booking.create).toHaveBeenCalled();
      expect(prisma.calendarAvailability.create).toHaveBeenCalled();
      expect(prisma.payment.create).toHaveBeenCalled();
      expect(NotificationService.onBookingCreated).toHaveBeenCalledWith("book-100");
    });

    it("should update existing calendar availability if already present", async () => {
      const listingId = "11111111-1111-1111-1111-111111111111";
      const eventDate = "2026-12-25T00:00:00.000Z";

      (prisma.vendorListing.findUnique as any).mockResolvedValue({ id: listingId });
      (prisma.booking.create as any).mockResolvedValue({
        id: "book-101",
        user_id: mockUser.id,
        listing_id: listingId,
        event_date: new Date(eventDate),
        agreed_total_price_paisa: 15000000n,
        status: "requested",
      });
      (prisma.calendarAvailability.findUnique as any).mockResolvedValue({ id: "avail-existing", status: "available" });
      (prisma.calendarAvailability.update as any).mockResolvedValue({ id: "avail-existing", status: "held" });
      (prisma.payment.create as any).mockResolvedValue({ id: "pay-2" });

      const res = await request(app)
        .post("/api/v1/bookings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          listingId,
          eventDate,
          agreedTotalPricePaisa: 15000000,
        });

      expect(res.status).toBe(201);
      expect(prisma.calendarAvailability.update).toHaveBeenCalled();
    });

    it("should return 404 if listing does not exist", async () => {
      (prisma.vendorListing.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/bookings")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          listingId: "nonexistent-listing",
          eventDate: "2026-12-25T00:00:00.000Z",
          agreedTotalPricePaisa: 10000,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Listing not found");
    });
  });

  describe("GET /api/v1/bookings (List Bookings)", () => {
    it("should return list of user bookings", async () => {
      const mockBookings = [
        {
          id: "book-100",
          user_id: mockUser.id,
          status: "requested",
          agreed_total_price_paisa: 30000000n,
          payments: [{ id: "pay-1", status: "pending", amount_paisa: 30000000n }],
        },
      ];

      (prisma.booking.findMany as any).mockResolvedValue(mockBookings);

      const res = await request(app)
        .get("/api/v1/bookings")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/bookings/:id (Get Booking By Id)", () => {
    it("should return booking details by ID", async () => {
      const mockBooking = {
        id: "book-100",
        user_id: mockUser.id,
        status: "requested",
        agreed_total_price_paisa: 30000000n,
      };

      (prisma.booking.findFirstOrThrow as any).mockResolvedValue(mockBooking);

      const res = await request(app)
        .get("/api/v1/bookings/book-100")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("book-100");
    });
  });

  describe("PATCH /api/v1/bookings/:id/cancel (Cancel Booking with Refund)", () => {
    it("should cancel booking, release calendar availability, refund payments, and send notification", async () => {
      const mockBooking = {
        id: "book-100",
        user_id: mockUser.id,
        status: "requested",
      };

      (prisma.booking.findFirst as any).mockResolvedValue(mockBooking);
      (prisma.booking.update as any).mockResolvedValue({ ...mockBooking, status: "cancelled" });
      (prisma.calendarAvailability.updateMany as any).mockResolvedValue({ count: 1 });
      (prisma.payment.updateMany as any).mockResolvedValue({ count: 1 });

      const res = await request(app)
        .patch("/api/v1/bookings/book-100/cancel")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Booking cancelled successfully");
      expect(prisma.booking.update).toHaveBeenCalledWith({
        where: { id: "book-100" },
        data: { status: "cancelled" },
      });
      expect(prisma.calendarAvailability.updateMany).toHaveBeenCalledWith({
        where: { booking_id: "book-100" },
        data: { status: "available", booking_id: null, hold_expires_at: null },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { booking_id: "book-100" },
        data: { status: "refunded" },
      });
      expect(NotificationService.onBookingCancelled).toHaveBeenCalledWith("book-100");
    });

    it("should return 400 if booking is already cancelled", async () => {
      (prisma.booking.findFirst as any).mockResolvedValue({
        id: "book-100",
        user_id: mockUser.id,
        status: "cancelled",
      });

      const res = await request(app)
        .patch("/api/v1/bookings/book-100/cancel")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Booking is already cancelled");
    });
  });
});
