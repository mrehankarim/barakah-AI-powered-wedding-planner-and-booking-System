import { Router } from "express";
import { createBooking, listBookings, getBookingById, cancelBooking } from "../controllers/bookingController";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Bookings
 *   description: Booking management, details, and cancellation
 */

router.use(isAuthenticated);

/**
 * @openapi
 * /bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
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
 *               - eventDate
 *             properties:
 *               listingId:
 *                 type: string
 *               tierId:
 *                 type: string
 *               eventDate:
 *                 type: string
 *                 format: date
 *                 example: "2026-12-25"
 *               guestCount:
 *                 type: integer
 *                 example: 300
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully with deposit milestone
 *   get:
 *     summary: List all user bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user bookings
 */
router.route("/").post(createBooking).get(listBookings);

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     summary: Get booking details by ID
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details including payment milestones
 *       404:
 *         description: Booking not found
 */
router.route("/:id").get(getBookingById);

/**
 * @openapi
 * /bookings/{id}/cancel:
 *   patch:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancellationReason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
router.route("/:id/cancel").patch(cancelBooking);

export default router;