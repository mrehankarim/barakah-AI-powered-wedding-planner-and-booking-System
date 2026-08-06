import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import isAdmin from "../middlewares/isAdmin";
import {
    getAllVendors,
    getVendorById,
    updateVendor,
    getAllListings,
    updateListingStatus,
    getAllBookings,
    resolveDispute,
    getAllPayments,
    markPayoutPaid,
    getDashboardStats,
} from "../controllers/adminController";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Admin
 *   description: Admin-only endpoints for platform management (vendors, listings, bookings, payments)
 */

router.use(isAuthenticated, isAdmin);

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Platform-wide counts (users, vendors, listings, bookings, disputes, payouts)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – admin role required
 */
router.get("/stats", getDashboardStats);

/**
 * @openapi
 * /admin/vendors:
 *   get:
 *     summary: List all vendors
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, suspended]
 *         description: Filter vendors by verification status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of vendors with owner and listing summaries
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/vendors", getAllVendors);

/**
 * @openapi
 * /admin/vendors/{vendorId}:
 *   get:
 *     summary: Get a single vendor by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Vendor UUID
 *     responses:
 *       200:
 *         description: Full vendor details including listings and recent payouts
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Vendor not found
 *   patch:
 *     summary: Update a vendor (verification status / commission override)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: vendorId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               verification_status:
 *                 type: string
 *                 enum: [pending, approved, rejected, suspended]
 *               commission_rate_override:
 *                 type: number
 *                 example: 12.5
 *                 description: Override commission rate (percentage)
 *     responses:
 *       200:
 *         description: Vendor updated successfully
 *       400:
 *         description: Validation error
 *       404:
 *         description: Vendor not found
 */
router.get("/vendors/:vendorId", getVendorById);
router.patch("/vendors/:vendorId", updateVendor);

/**
 * @openapi
 * /admin/listings:
 *   get:
 *     summary: List all vendor listings
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, under_review, approved, rejected, changes_requested, suspended]
 *         description: Filter by listing status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of listings with vendor and category info
 */
router.get("/listings", getAllListings);

/**
 * @openapi
 * /admin/listings/{listingId}/status:
 *   patch:
 *     summary: Update listing approval status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [under_review, approved, rejected, changes_requested, suspended]
 *                 example: approved
 *     responses:
 *       200:
 *         description: Listing status updated
 *       400:
 *         description: Validation error or invalid status transition
 *       404:
 *         description: Listing not found
 *       409:
 *         description: Invalid status transition
 */
router.patch("/listings/:listingId/status", updateListingStatus);

/**
 * @openapi
 * /admin/bookings:
 *   get:
 *     summary: List all bookings platform-wide
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, confirmed, in_progress, completed, cancelled, disputed]
 *         description: Filter by booking status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of bookings with user, listing, and payment summaries
 */
router.get("/bookings", getAllBookings);

/**
 * @openapi
 * /admin/bookings/{bookingId}/dispute/resolve:
 *   patch:
 *     summary: Resolve a disputed booking
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resolution
 *             properties:
 *               resolution:
 *                 type: string
 *                 enum: [release, refund]
 *                 description: "release = pay vendor; refund = return funds to customer"
 *                 example: release
 *     responses:
 *       200:
 *         description: Dispute resolved and booking status updated
 *       400:
 *         description: Validation error
 *       404:
 *         description: Booking not found
 *       409:
 *         description: Booking is not in disputed state
 */
router.patch("/bookings/:bookingId/dispute/resolve", resolveDispute);

/**
 * @openapi
 * /admin/payments:
 *   get:
 *     summary: List all payments platform-wide
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid, held_escrow, released, refunded, verifying]
 *         description: Filter by payment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Paginated list of payments with booking context
 */
router.get("/payments", getAllPayments);

/**
 * @openapi
 * /admin/payouts/{ledgerId}/mark-paid:
 *   patch:
 *     summary: Mark a payout ledger entry as paid
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: ledgerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ledger entry UUID
 *     responses:
 *       200:
 *         description: Payout marked as paid with timestamp
 *       404:
 *         description: Payout ledger entry not found
 *       409:
 *         description: Payout is not in pending state
 */
router.patch("/payouts/:ledgerId/mark-paid", markPayoutPaid);

export default router;
