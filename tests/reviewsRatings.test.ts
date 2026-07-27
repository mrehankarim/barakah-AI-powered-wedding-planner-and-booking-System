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
    booking: {
      findFirst: vi.fn(),
    },
    review: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    vendorListing: {
      update: vi.fn(),
      findMany: vi.fn(),
    },
    vendor: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((cb) => cb(prisma)),
  },
}));

vi.mock("../services/notificationService", () => ({
  default: {
    onReviewSubmitted: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockUser = {
  id: "77777777-7777-7777-7777-777777777777",
  role: "end_user",
  email: "reviewer@barakah.com",
  full_name: "Reviewer User",
  city: "Islamabad",
  created_at: new Date(),
  updated_at: new Date(),
};

const tokenSecret = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret_change_in_production";
const authToken = jwt.sign(
  { id: mockUser.id, role: mockUser.role, email: mockUser.email, full_name: mockUser.full_name },
  tokenSecret
);

describe("Module 3: Reviews & Ratings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  });

  describe("POST /api/v1/reviews (Submit Review & Recalculate Vendor Rating)", () => {
    it("should create review, recalculate vendor rating, and send notification", async () => {
      const bookingId = "book-200";
      const listingId = "list-200";

      (prisma.booking.findFirst as any).mockResolvedValue({ id: bookingId, user_id: mockUser.id });
      (prisma.review.create as any).mockResolvedValue({
        id: "rev-1",
        booking_id: bookingId,
        user_id: mockUser.id,
        listing_id: listingId,
        rating: 5,
        text: "Outstanding service!",
        is_verified_booking: true,
      });
      (prisma.review.aggregate as any).mockResolvedValue({
        _avg: { rating: 5 },
        _count: 1,
      });
      (prisma.vendorListing.update as any).mockResolvedValue({ id: listingId, avg_rating: 5, review_count: 1 });

      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          bookingId,
          listingId,
          rating: 5,
          text: "Outstanding service!",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("rev-1");
      expect(prisma.review.create).toHaveBeenCalled();
      expect(prisma.vendorListing.update).toHaveBeenCalledWith({
        where: { id: listingId },
        data: { avg_rating: 5, review_count: 1 },
      });
      expect(NotificationService.onReviewSubmitted).toHaveBeenCalledWith("rev-1");
    });

    it("should return 404 if booking not found for user", async () => {
      (prisma.booking.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          bookingId: "invalid-book",
          listingId: "list-200",
          rating: 4,
        });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Booking not found");
    });

    it("should return 400 if rating is invalid (< 1 or > 5)", async () => {
      const res = await request(app)
        .post("/api/v1/reviews")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          bookingId: "book-200",
          listingId: "list-200",
          rating: 6,
        });

      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /api/v1/reviews/:id (Update Review)", () => {
    it("should update existing review rating and text and trigger rating recalculation", async () => {
      const reviewId = "rev-1";
      const listingId = "list-200";

      (prisma.review.findFirst as any).mockResolvedValue({
        id: reviewId,
        user_id: mockUser.id,
        listing_id: listingId,
        rating: 4,
      });
      (prisma.review.update as any).mockResolvedValue({
        id: reviewId,
        rating: 5,
        text: "Updated awesome text!",
      });
      (prisma.review.aggregate as any).mockResolvedValue({
        _avg: { rating: 4.5 },
        _count: 2,
      });
      (prisma.vendorListing.update as any).mockResolvedValue({ id: listingId, avg_rating: 4.5, review_count: 2 });

      const res = await request(app)
        .patch(`/api/v1/reviews/${reviewId}`)
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          rating: 5,
          text: "Updated awesome text!",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rating).toBe(5);
      expect(prisma.vendorListing.update).toHaveBeenCalledWith({
        where: { id: listingId },
        data: { avg_rating: 4.5, review_count: 2 },
      });
    });
  });

  describe("DELETE /api/v1/reviews/:id (Delete Review)", () => {
    it("should delete review and recalculate vendor aggregate rating", async () => {
      const reviewId = "rev-1";
      const listingId = "list-200";

      (prisma.review.findFirst as any).mockResolvedValue({ listing_id: listingId });
      (prisma.review.delete as any).mockResolvedValue({ id: reviewId });
      (prisma.review.aggregate as any).mockResolvedValue({
        _avg: { rating: 0 },
        _count: 0,
      });
      (prisma.vendorListing.update as any).mockResolvedValue({ id: listingId, avg_rating: 0, review_count: 0 });

      const res = await request(app)
        .delete(`/api/v1/reviews/${reviewId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Review deleted successfully");
      expect(prisma.review.delete).toHaveBeenCalledWith({ where: { id: reviewId } });
      expect(prisma.vendorListing.update).toHaveBeenCalledWith({
        where: { id: listingId },
        data: { avg_rating: 0, review_count: 0 },
      });
    });
  });

  describe("GET /api/v1/reviews/vendors/:id/reviews (Get Vendor Reviews)", () => {
    it("should return reviews and aggregate info for vendor listings", async () => {
      const vendorId = "vendor-1";

      (prisma.vendor.findUnique as any).mockResolvedValue({ id: vendorId });
      (prisma.vendorListing.findMany as any).mockResolvedValue([{ id: "list-1" }, { id: "list-2" }]);
      (prisma.review.findMany as any).mockResolvedValue([
        {
          id: "rev-1",
          rating: 5,
          text: "Great",
          user: { id: mockUser.id, full_name: mockUser.full_name },
        },
      ]);
      (prisma.review.aggregate as any).mockResolvedValue({
        _avg: { rating: 5 },
        _count: 1,
      });

      const res = await request(app).get(`/api/v1/reviews/vendors/${vendorId}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.data.aggregate.averageRating).toBe(5);
      expect(res.body.data.aggregate.totalReviews).toBe(1);
      expect(res.body.data.reviews).toHaveLength(1);
    });
  });
});
