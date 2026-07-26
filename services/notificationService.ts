import { sendEmail } from "./emailsendingservice";
import { prisma } from "../lib/prisma";

function formatDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const formatCurrency = (paisa: bigint): string => {
  const rupees = Number(paisa) / 100;
  return `PKR ${rupees.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const NotificationService = {
  async onBookingCreated(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { full_name: true, email: true } },
        listing: { include: { vendor: { select: { legal_business_name: true } } } },
        tier: true,
      },
    });
    if (!booking?.user?.email) return;

    const vendorName = booking.listing?.vendor?.legal_business_name ?? "the vendor";
    const tierName = booking.tier?.name ?? "standard";
    const html = `
      <h2>Booking Confirmed</h2>
      <p>Dear ${booking.user.full_name},</p>
      <p>Your booking with <strong>${vendorName}</strong> has been confirmed.</p>
      <ul>
        <li><strong>Event Date:</strong> ${formatDate(booking.event_date)}</li>
        <li><strong>Package:</strong> ${booking.tier?.name ?? "Standard"}</li>
        <li><strong>Total Price:</strong> ${formatCurrency(booking.agreed_total_price_paisa)}</li>
        <li><strong>Guests:</strong> ${booking.guest_count ?? "TBD"}</li>
      </ul>
      <p>A deposit payment milestone has been created. Please complete payment to secure your booking.</p>
      <p>Thank you for choosing Barakah!</p>
    `;

    await sendEmail(booking.user.email, "Booking Confirmed - Barakah", html);
  },

  async onBookingCancelled(bookingId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { full_name: true, email: true } },
        listing: { include: { vendor: { select: { legal_business_name: true } } } },
      },
    });
    if (!booking?.user?.email) return;

    const vendorName = booking.listing?.vendor?.legal_business_name ?? "the vendor";
    const html = `
      <h2>Booking Cancelled</h2>
      <p>Dear ${booking.user.full_name},</p>
      <p>Your booking with <strong>${vendorName}</strong> for <strong>${formatDate(booking.event_date)}</strong> has been cancelled.</p>
      <p>We hope to serve you again in the future.</p>
      <p>If you have any questions, please reach out to our support team.</p>
      <p>Thank you for using Barakah!</p>
    `;

    await sendEmail(booking.user.email, "Booking Cancelled - Barakah", html);
  },

  async onReviewSubmitted(reviewId: string) {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        user: { select: { full_name: true, email: true } },
        listing: { include: { vendor: { select: { legal_business_name: true, owner_user: { select: { email: true } } } } } },
      },
    });
    if (!review?.user?.email) return;

    // Send confirmation to the reviewer
    const reviewHtml = `
      <h2>Thank You for Your Review!</h2>
      <p>Dear ${review.user.full_name},</p>
      <p>Thank you for submitting a <strong>${review.rating}-star</strong> review.</p>
      ${review.text ? `<p><em>"${review.text}"</em></p>` : ""}
      <p>Your feedback helps the community make better decisions.</p>
      <p>Thank you for using Barakah!</p>
    `;

    await sendEmail(review.user.email, "Review Submitted - Barakah", reviewHtml);

    // Send notification to the vendor owner
    const vendorEmail = review.listing?.vendor?.owner_user?.email;
    if (vendorEmail) {
      const vendorHtml = `
        <h2>New Review Received</h2>
        <p>Your listing <strong>${review.listing?.title ?? "a listing"}</strong> received a <strong>${review.rating}-star</strong> review.</p>
        ${review.text ? `<p><em>"${review.text}"</em></p>` : ""}
        <p>Keep up the great work!</p>
      `;

      await sendEmail(vendorEmail, "New Review - Barakah", vendorHtml);
    }
  },
};

export default NotificationService;