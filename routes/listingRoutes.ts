import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import {
    getListings,
    getListingDetail,
    getCategories,
    createHold,
    releaseHold,
    checkAvailability,
} from "../controllers/listingController";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Listings
 *   description: Public marketplace listings, categories, availability, and date holds
 */

/**
 * @openapi
 * /listings:
 *   get:
 *     summary: Browse approved listings with optional filters
 *     tags: [Listings]
 *     parameters:
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (case-insensitive)
 *         example: Lahore
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category UUID
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: integer
 *         description: Minimum base price in paisa
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: integer
 *         description: Maximum base price in paisa
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
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Paginated list of approved listings sorted by rating
 */
router.get("/", getListings);

/**
 * @openapi
 * /listings/categories:
 *   get:
 *     summary: Get all listing categories
 *     tags: [Listings]
 *     responses:
 *       200:
 *         description: Array of categories with slugs and attribute schemas
 */
router.get("/categories", getCategories);

/**
 * @openapi
 * /listings/availability/check:
 *   post:
 *     summary: Bulk-check availability for multiple listings on a given date
 *     tags: [Listings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - listing_ids
 *               - date
 *             properties:
 *               listing_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["uuid-1", "uuid-2"]
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-25"
 *     responses:
 *       200:
 *         description: Availability status per listing (available, held, booked, blocked)
 *       400:
 *         description: Validation error
 */
router.post("/availability/check", checkAvailability);

/**
 * @openapi
 * /listings/{listingId}:
 *   get:
 *     summary: Get full details of an approved listing
 *     tags: [Listings]
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing UUID
 *     responses:
 *       200:
 *         description: Listing details with category, pricing tiers, and recent reviews
 *       404:
 *         description: Listing not found or not approved
 */
router.get("/:listingId", getListingDetail);

/**
 * @openapi
 * /listings/holds:
 *   post:
 *     summary: Place a 30-minute date hold on a listing (requires auth)
 *     tags: [Listings]
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
 *               - listingId
 *               - date
 *             properties:
 *               listingId:
 *                 type: string
 *                 description: Listing UUID to hold
 *               date:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-25"
 *     responses:
 *       201:
 *         description: Hold created – must complete booking within 30 minutes
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Listing not found or not available for booking
 *       409:
 *         description: Date is already held, booked, or blocked
 */
router.post("/holds", isAuthenticated, createHold);

/**
 * @openapi
 * /listings/{listingId}/holds/{date}:
 *   delete:
 *     summary: Release an active date hold on a listing (requires auth)
 *     tags: [Listings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing UUID
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Date of the hold to release (YYYY-MM-DD)
 *         example: "2026-12-25"
 *     responses:
 *       200:
 *         description: Hold released, date is available again
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active hold found for this date
 */
router.delete("/:listingId/holds/:date", isAuthenticated, releaseHold);

export default router;
