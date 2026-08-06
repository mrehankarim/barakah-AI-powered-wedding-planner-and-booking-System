import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import isVendor from "../middlewares/isVendor";
import {
  registerVendor,
  getMyVendorProfile,
  editVendorProfile,
  createListing,
  getMyListings,
  getListingById,
  updateListing,
  deleteListing,
  addPricingTier,
  updatePricingTier,
  deletePricingTier,
  getCalendar,
  setAvailability,
  getVendorBookings,
  confirmBooking,
  getPayoutLedger,
} from "../controllers/vendorController";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Vendor
 *   description: Vendor onboarding, listing management, bookings, calendar, and payouts
 */

router.use(isAuthenticated);

/**
 * @openapi
 * /vendor/register:
 *   post:
 *     summary: Register as a vendor
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - legal_business_name
 *               - cnic_or_reg_number
 *             properties:
 *               legal_business_name:
 *                 type: string
 *                 example: "Al-Noor Marquee"
 *               cnic_or_reg_number:
 *                 type: string
 *                 example: "3520212345678"
 *               payout_bank_iban:
 *                 type: string
 *                 example: "PK36SCBL0000001123456702"
 *     responses:
 *       201:
 *         description: Vendor registered successfully
 *       409:
 *         description: Vendor profile already exists
 */
router.post("/register", registerVendor);

// ─── Vendor-only routes ───────────────────────────────────────────────────────
router.use(isVendor);

/**
 * @openapi
 * /vendor/me:
 *   get:
 *     summary: Get my vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Vendor profile with all listings summary
 */
router.get("/me", getMyVendorProfile);

/**
 * @openapi
 * /vendor/me:
 *   patch:
 *     summary: Update my vendor profile
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               legal_business_name:
 *                 type: string
 *                 example: "Al-Noor Marquee Updated"
 *               payout_bank_iban:
 *                 type: string
 *                 example: "PK36SCBL0000001123456702"
 *               cnic_or_reg_number:
 *                 type: string
 *                 example: "3520212345678"
 *     responses:
 *       200:
 *         description: Vendor profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – vendor role required
 */
router.patch("/me", editVendorProfile);

// ─── Listings ─────────────────────────────────────────────────────────────────

/**
 * @openapi
 * /vendor/listings:
 *   post:
 *     summary: Create a new listing
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - category_id
 *               - city
 *               - title
 *             properties:
 *               category_id:
 *                 type: string
 *                 format: uuid
 *               city:
 *                 type: string
 *                 example: "Lahore"
 *               area:
 *                 type: string
 *                 example: "DHA Phase 5"
 *               title:
 *                 type: string
 *                 example: "Royal Marquee — Grand Ballroom"
 *               description:
 *                 type: string
 *               attributes:
 *                 type: object
 *     responses:
 *       201:
 *         description: Listing created
 *   get:
 *     summary: List all my listings
 *     tags: [Vendor]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of vendor listings
 */
router.route("/listings").post(createListing).get(getMyListings);

/**
 * @openapi
 * /vendor/listings/{listingId}:
 *   get:
 *     summary: Get a single listing by ID
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Listing details with tiers and recent reviews
 *       404:
 *         description: Listing not found
 *   patch:
 *     summary: Update a listing
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Updated listing
 *   delete:
 *     summary: Remove (suspend) a listing
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Listing removed
 *       409:
 *         description: Listing has active bookings
 */
router.route("/listings/:listingId").get(getListingById).patch(updateListing).delete(deleteListing);

// ─── Pricing Tiers ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /vendor/listings/{listingId}/tiers:
 *   post:
 *     summary: Add a pricing tier to a listing
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - base_price_paisa
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Silver Package"
 *               min_capacity:
 *                 type: integer
 *               max_capacity:
 *                 type: integer
 *               base_price_paisa:
 *                 type: integer
 *                 example: 15000000
 *               inclusions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Pricing tier added
 */
router.route("/listings/:listingId/tiers").post(addPricingTier);

/**
 * @openapi
 * /vendor/listings/{listingId}/tiers/{tierId}:
 *   patch:
 *     summary: Update a pricing tier
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tierId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tier updated
 *   delete:
 *     summary: Deactivate a pricing tier
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: tierId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tier deactivated
 */
router.route("/listings/:listingId/tiers/:tierId").patch(updatePricingTier).delete(deletePricingTier);

// ─── Calendar Availability ────────────────────────────────────────────────────

/**
 * @openapi
 * /vendor/listings/{listingId}/calendar:
 *   get:
 *     summary: Get availability calendar for a listing
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of date-availability slots
 *   post:
 *     summary: Bulk-set availability dates
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dates
 *               - status
 *             properties:
 *               dates:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: date
 *                 example: ["2026-12-24", "2026-12-25"]
 *               status:
 *                 type: string
 *                 enum: [available, blocked]
 *     responses:
 *       200:
 *         description: Availability updated
 */
router.route("/listings/:listingId/calendar").get(getCalendar).post(setAvailability);

// ─── Bookings (Vendor View) ───────────────────────────────────────────────────

/**
 * @openapi
 * /vendor/bookings:
 *   get:
 *     summary: Get all bookings for my listings
 *     tags: [Vendor]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [requested, confirmed, in_progress, completed, cancelled, disputed]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of bookings across all vendor listings
 */
router.get("/bookings", getVendorBookings);

/**
 * @openapi
 * /vendor/bookings/{bookingId}/confirm:
 *   patch:
 *     summary: Confirm a requested booking
 *     tags: [Vendor]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Booking confirmed
 *       400:
 *         description: Booking is not in requested state
 */
router.patch("/bookings/:bookingId/confirm", confirmBooking);

// ─── Payout Ledger ────────────────────────────────────────────────────────────

/**
 * @openapi
 * /vendor/payouts:
 *   get:
 *     summary: Get my payout ledger
 *     tags: [Vendor]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, paid]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Payout ledger entries with totals summary
 */
router.get("/payouts", getPayoutLedger);

export default router;
