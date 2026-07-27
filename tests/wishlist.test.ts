import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import app from "../app";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    vendorListing: {
      findUnique: vi.fn(),
    },
    wishlist: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

const mockUser = {
  id: "55555555-5555-5555-5555-555555555555",
  role: "end_user",
  email: "wishuser@barakah.com",
  full_name: "Wishlist User",
  city: "Multan",
  created_at: new Date(),
  updated_at: new Date(),
};

const tokenSecret = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret_change_in_production";
const authToken = jwt.sign(
  { id: mockUser.id, role: mockUser.role, email: mockUser.email, full_name: mockUser.full_name },
  tokenSecret
);

describe("Module 5: Wishlist System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  });

  describe("Wishlist Database Migration Check", () => {
    it("should verify that the wishlist migration file exists and contains table creation SQL", () => {
      const migrationPath = path.join(
        process.cwd(),
        "prisma",
        "migrations",
        "20260726050000_add_wishlist",
        "migration.sql"
      );

      expect(fs.existsSync(migrationPath)).toBe(true);

      const sqlContent = fs.readFileSync(migrationPath, "utf-8");
      expect(sqlContent).toContain('CREATE TABLE "wishlist"');
      expect(sqlContent).toContain('ALTER TABLE "wishlist" ADD CONSTRAINT "wishlist_user_id_fkey"');
    });
  });

  describe("POST /api/v1/wishlist (Toggle Favorite)", () => {
    it("should add listing to wishlist if not already present", async () => {
      const listingId = "list-500";

      (prisma.vendorListing.findUnique as any).mockResolvedValue({ id: listingId });
      (prisma.wishlist.findFirst as any).mockResolvedValue(null);
      (prisma.wishlist.create as any).mockResolvedValue({
        id: "wish-1",
        user_id: mockUser.id,
        listing_id: listingId,
        listing: { id: listingId, title: "Dream Venue" },
      });

      const res = await request(app)
        .post("/api/v1/wishlist")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ listingId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("wish-1");
      expect(prisma.wishlist.create).toHaveBeenCalled();
    });

    it("should remove listing from wishlist if already present (toggle off)", async () => {
      const listingId = "list-500";

      (prisma.vendorListing.findUnique as any).mockResolvedValue({ id: listingId });
      (prisma.wishlist.findFirst as any).mockResolvedValue({ id: "wish-1", user_id: mockUser.id, listing_id: listingId });
      (prisma.wishlist.delete as any).mockResolvedValue({ id: "wish-1" });

      const res = await request(app)
        .post("/api/v1/wishlist")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ listingId });

      expect(res.status).toBe(200);
      expect(res.body.data.saved).toBe(false);
      expect(res.body.message).toBe("Removed from wishlist successfully");
      expect(prisma.wishlist.delete).toHaveBeenCalledWith({ where: { id: "wish-1" } });
    });

    it("should return 404 if listing does not exist", async () => {
      (prisma.vendorListing.findUnique as any).mockResolvedValue(null);

      const res = await request(app)
        .post("/api/v1/wishlist")
        .set("Authorization", `Bearer ${authToken}`)
        .send({ listingId: "nonexistent-listing" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Listing not found");
    });
  });

  describe("GET /api/v1/wishlist (List Favorites)", () => {
    it("should retrieve user's wishlist entries", async () => {
      const mockWishlist = [
        {
          id: "wish-1",
          listing_id: "list-500",
          listing: {
            title: "Dream Venue",
            vendor: { legal_business_name: "Dream Events" },
            category: { name: "Venues" },
          },
        },
      ];

      (prisma.wishlist.findMany as any).mockResolvedValue(mockWishlist);

      const res = await request(app)
        .get("/api/v1/wishlist")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("DELETE /api/v1/wishlist/:listingId (Remove Favorite)", () => {
    it("should remove listing from wishlist by listingId", async () => {
      const listingId = "list-500";

      (prisma.wishlist.findFirst as any).mockResolvedValue({ id: "wish-1", user_id: mockUser.id, listing_id: listingId });
      (prisma.wishlist.delete as any).mockResolvedValue({ id: "wish-1" });

      const res = await request(app)
        .delete(`/api/v1/wishlist/${listingId}`)
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Removed from wishlist successfully");
      expect(prisma.wishlist.delete).toHaveBeenCalledWith({ where: { id: "wish-1" } });
    });

    it("should return 404 if wishlist entry not found", async () => {
      (prisma.wishlist.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .delete("/api/v1/wishlist/not-found-id")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Wishlist entry not found");
    });
  });
});
