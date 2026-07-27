import { describe, it, expect, vi, beforeEach } from "vitest";
import NotificationService from "../services/notificationService";
import { sendEmail } from "../services/emailsendingservice";
import { prisma } from "../lib/prisma";

vi.mock("../lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
    },
    review: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("../services/emailsendingservice", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

describe("Module 6: Notification Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("onBookingCreated", () => {
    it("should send confirmation email with formatted details when booking is created", async () => {
      const mockBooking = {
        id: "book-1",
        event_date: new Date("2026-10-10T00:00:00.000Z"),
        agreed_total_price_paisa: 25000000n, // PKR 250,000.00
        guest_count: 200,
        user: { full_name: "Ahmad Khan", email: "ahmad@example.com" },
        listing: { vendor: { legal_business_name: "Royal Palace Marquee" } },
        tier: { name: "VIP Package" },
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      await NotificationService.onBookingCreated("book-1");

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject, html] = (sendEmail as any).mock.calls[0];
      expect(to).toBe("ahmad@example.com");
      expect(subject).toBe("Booking Confirmed - Barakah");
      expect(html).toContain("Royal Palace Marquee");
      expect(html).toContain("VIP Package");
      expect(html).toContain("PKR 250,000.00");
    });

    it("should do nothing if booking or user email is missing", async () => {
      (prisma.booking.findUnique as any).mockResolvedValue(null);

      await NotificationService.onBookingCreated("book-invalid");

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe("onBookingCancelled", () => {
    it("should send cancellation notification email when booking is cancelled", async () => {
      const mockBooking = {
        id: "book-1",
        event_date: new Date("2026-10-10T00:00:00.000Z"),
        user: { full_name: "Ahmad Khan", email: "ahmad@example.com" },
        listing: { vendor: { legal_business_name: "Royal Palace Marquee" } },
      };

      (prisma.booking.findUnique as any).mockResolvedValue(mockBooking);

      await NotificationService.onBookingCancelled("book-1");

      expect(sendEmail).toHaveBeenCalledTimes(1);
      const [to, subject, html] = (sendEmail as any).mock.calls[0];
      expect(to).toBe("ahmad@example.com");
      expect(subject).toBe("Booking Cancelled - Barakah");
      expect(html).toContain("Booking Cancelled");
      expect(html).toContain("Royal Palace Marquee");
    });
  });

  describe("onReviewSubmitted", () => {
    it("should send confirmation email to reviewer AND notification to vendor owner", async () => {
      const mockReview = {
        id: "rev-100",
        rating: 5,
        text: "Exceptional food and service!",
        user: { full_name: "Fatima Ali", email: "fatima@example.com" },
        listing: {
          title: "Catering Service",
          vendor: {
            legal_business_name: "Gourmet Caterers",
            owner_user: { email: "vendor_owner@gourmet.com" },
          },
        },
      };

      (prisma.review.findUnique as any).mockResolvedValue(mockReview);

      await NotificationService.onReviewSubmitted("rev-100");

      expect(sendEmail).toHaveBeenCalledTimes(2);

      // Check email 1: to Reviewer
      const [to1, subject1, html1] = (sendEmail as any).mock.calls[0];
      expect(to1).toBe("fatima@example.com");
      expect(subject1).toBe("Review Submitted - Barakah");
      expect(html1).toContain("Thank You for Your Review!");
      expect(html1).toContain("Exceptional food and service!");

      // Check email 2: to Vendor Owner
      const [to2, subject2, html2] = (sendEmail as any).mock.calls[1];
      expect(to2).toBe("vendor_owner@gourmet.com");
      expect(subject2).toBe("New Review - Barakah");
      expect(html2).toContain("New Review Received");
      expect(html2).toContain("Catering Service");
    });
  });
});
