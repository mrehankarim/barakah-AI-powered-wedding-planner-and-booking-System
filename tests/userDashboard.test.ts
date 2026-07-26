import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    package: {
      findMany: vi.fn(),
    },
    booking: {
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
    },
  },
}));

const mockUser = {
  id: "66666666-6666-6666-6666-666666666666",
  role: "end_user",
  email: "dashuser@barakah.com",
  full_name: "Dashboard User",
  city: "Peshawar",
  created_at: new Date(),
  updated_at: new Date(),
};

const tokenSecret = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret_change_in_production";
const authToken = jwt.sign(
  { id: mockUser.id, role: mockUser.role, email: mockUser.email, full_name: mockUser.full_name },
  tokenSecret
);

describe("Module 4: User Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  });

  describe("GET /api/v1/dashboard/packages", () => {
    it("should retrieve aggregated packages for dashboard", async () => {
      const packagesMock = [
        {
          id: "pkg-1",
          title: "My Royal Package",
          total_budget_paisa: 5000000n,
          wedding_date: new Date(),
          guest_count: 250,
          status: "active",
        },
      ];

      (prisma.package.findMany as any).mockResolvedValue(packagesMock);

      const res = await request(app)
        .get("/api/v1/dashboard/packages")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("My Royal Package");
    });
  });

  describe("GET /api/v1/dashboard/bookings", () => {
    it("should retrieve aggregated bookings for dashboard", async () => {
      const bookingsMock = [
        {
          id: "book-1",
          listing: { title: "Grand Hall", vendor: { legal_business_name: "Grand Events" } },
          payments: [{ amount_paisa: 1000000n, status: "pending" }],
        },
      ];

      (prisma.booking.findMany as any).mockResolvedValue(bookingsMock);

      const res = await request(app)
        .get("/api/v1/dashboard/bookings")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/dashboard/reviews", () => {
    it("should retrieve aggregated reviews for dashboard", async () => {
      const reviewsMock = [
        {
          id: "rev-1",
          rating: 5,
          text: "Amazing experience",
          listing: { title: "Grand Hall", vendor: { legal_business_name: "Grand Events" } },
        },
      ];

      (prisma.review.findMany as any).mockResolvedValue(reviewsMock);

      const res = await request(app)
        .get("/api/v1/dashboard/reviews")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("PATCH /api/v1/dashboard/profile (Profile Update)", () => {
    it("should update user profile details", async () => {
      (prisma.user.update as any).mockResolvedValue({
        id: mockUser.id,
        full_name: "Updated Dashboard User",
        email: mockUser.email,
        city: "Quetta",
        role: mockUser.role,
      });

      const res = await request(app)
        .patch("/api/v1/dashboard/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          fullName: "Updated Dashboard User",
          city: "Quetta",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.full_name).toBe("Updated Dashboard User");
      expect(res.body.data.city).toBe("Quetta");
    });

    it("should return 400 if neither fullName nor city is provided", async () => {
      const res = await request(app)
        .patch("/api/v1/dashboard/profile")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("At least one field (fullName or city) must be provided");
    });
  });
});
