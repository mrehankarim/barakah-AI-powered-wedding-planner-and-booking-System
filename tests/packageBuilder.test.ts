import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../app";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    package: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirstOrThrow: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    vendorListing: {
      findUnique: vi.fn(),
    },
    packageLineItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

const mockUser = {
  id: "99999999-9999-9999-9999-999999999999",
  role: "end_user",
  email: "testuser@barakah.com",
  full_name: "Test User",
  city: "Lahore",
  created_at: new Date(),
  updated_at: new Date(),
};

const tokenSecret = process.env.ACCESS_TOKEN_SECRET || "your_access_token_secret_change_in_production";
const authToken = jwt.sign({ id: mockUser.id, role: mockUser.role, email: mockUser.email, full_name: mockUser.full_name }, tokenSecret);

describe("Module 1: Package Builder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);
  });

  describe("POST /api/v1/packages (Create Package)", () => {
    it("should create a package successfully", async () => {
      const createdPkg = {
        id: "pkg-123",
        user_id: mockUser.id,
        title: "Royal Wedding 2026",
        total_budget_paisa: 50000000n,
        wedding_date: new Date("2026-11-15T00:00:00.000Z"),
        guest_count: 300,
        status: "draft",
        created_at: new Date(),
        updated_at: new Date(),
      };

      (prisma.package.create as any).mockResolvedValue(createdPkg);

      const res = await request(app)
        .post("/api/v1/packages")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Royal Wedding 2026",
          totalBudgetPaisa: 50000000,
          weddingDate: "2026-11-15T00:00:00.000Z",
          guestCount: 300,
          status: "draft",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("pkg-123");
      expect(res.body.message).toBe("Package created successfully");
      expect(prisma.package.create).toHaveBeenCalled();
    });

    it("should return 400 if totalBudgetPaisa is invalid or negative", async () => {
      const res = await request(app)
        .post("/api/v1/packages")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Invalid Package",
          totalBudgetPaisa: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 401 if request is unauthorized", async () => {
      const res = await request(app)
        .post("/api/v1/packages")
        .send({
          title: "Unauth Package",
          totalBudgetPaisa: 10000,
        });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/packages (List Packages)", () => {
    it("should list all packages for current user", async () => {
      const mockPackages = [
        {
          id: "pkg-1",
          title: "Package 1",
          total_budget_paisa: 1000000n,
          wedding_date: new Date(),
          guest_count: 150,
          status: "draft",
          line_items: [],
        },
      ];

      (prisma.package.findMany as any).mockResolvedValue(mockPackages);

      const res = await request(app)
        .get("/api/v1/packages")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe("GET /api/v1/packages/:id (Get Package By Id)", () => {
    it("should retrieve a package with line items", async () => {
      const mockPkg = {
        id: "pkg-123",
        user_id: mockUser.id,
        title: "Detailed Package",
        total_budget_paisa: 5000000n,
        line_items: [
          {
            id: "item-1",
            category: { name: "Catering" },
            allocated_budget_paisa: 2000000n,
            is_locked: false,
          },
        ],
      };

      (prisma.package.findFirstOrThrow as any).mockResolvedValue(mockPkg);

      const res = await request(app)
        .get("/api/v1/packages/pkg-123")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("pkg-123");
      expect(res.body.data.line_items).toHaveLength(1);
    });
  });

  describe("PATCH /api/v1/packages/:id (Update Package)", () => {
    it("should update package details", async () => {
      (prisma.package.findFirst as any).mockResolvedValue({ id: "pkg-123", user_id: mockUser.id });
      (prisma.package.update as any).mockResolvedValue({
        id: "pkg-123",
        title: "Updated Title",
        total_budget_paisa: 6000000n,
        status: "active",
      });

      const res = await request(app)
        .patch("/api/v1/packages/pkg-123")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          title: "Updated Title",
          totalBudgetPaisa: 6000000,
          status: "active",
        });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe("Updated Title");
      expect(res.body.data.status).toBe("active");
    });
  });

  describe("DELETE /api/v1/packages/:id (Delete Package)", () => {
    it("should delete package", async () => {
      (prisma.package.delete as any).mockResolvedValue({ id: "pkg-123" });

      const res = await request(app)
        .delete("/api/v1/packages/pkg-123")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Package deleted successfully");
    });
  });

  describe("Package Line Items CRUD + Lock/Unlock + Budget Tracking", () => {
    it("should add a line item to package", async () => {
      (prisma.package.findFirst as any).mockResolvedValue({ id: "pkg-123", user_id: mockUser.id });
      (prisma.vendorListing.findUnique as any).mockResolvedValue({ id: "list-1" });
      (prisma.packageLineItem.create as any).mockResolvedValue({
        id: "item-1",
        package_id: "pkg-123",
        category_id: "cat-1",
        listing_id: "list-1",
        allocated_budget_paisa: 1500000n,
        is_locked: false,
      });

      const res = await request(app)
        .post("/api/v1/packages/pkg-123/items")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          categoryId: "cat-1",
          listingId: "list-1",
          allocatedBudgetPaisa: 1500000,
          rationaleText: "Top venue selection",
        });

      expect(res.status).toBe(201);
      expect(res.body.data.id).toBe("item-1");
    });

    it("should update line item lock state (Lock/Unlock)", async () => {
      (prisma.packageLineItem.findFirst as any).mockResolvedValue({ id: "item-1", package_id: "pkg-123" });
      (prisma.packageLineItem.update as any).mockResolvedValue({
        id: "item-1",
        is_locked: true,
        allocated_budget_paisa: 2000000n,
      });

      const res = await request(app)
        .patch("/api/v1/packages/pkg-123/items/item-1")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          isLocked: true,
          allocatedBudgetPaisa: 2000000,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.is_locked).toBe(true);
    });

    it("should remove line item from package", async () => {
      (prisma.packageLineItem.findFirst as any).mockResolvedValue({ id: "item-1", package_id: "pkg-123" });
      (prisma.packageLineItem.delete as any).mockResolvedValue({ id: "item-1" });

      const res = await request(app)
        .delete("/api/v1/packages/pkg-123/items/item-1")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Package item removed successfully");
    });
  });
});
