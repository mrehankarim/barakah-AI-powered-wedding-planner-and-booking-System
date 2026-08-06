import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import isAdmin from "../middlewares/isAdmin";
import {
    initiatePayment,
    handleWebhook,
    getPaymentsByBooking,
    triggerAutoRelease,
    forceReleasePayment,
    markPaymentVerifying,
} from "../controllers/paymentController";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Payments
 *   description: Payment initiation, webhook processing, escrow management, and admin controls
 */

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     summary: Payment gateway webhook receiver
 *     tags: [Payments]
 *     description: >
 *       Receives payment status callbacks from the payment gateway.
 *       This endpoint is unauthenticated and should be secured via webhook signature verification.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Payload shape depends on the payment gateway provider
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook payload or signature
 */
router.post("/webhook", handleWebhook);

router.use(isAuthenticated);

/**
 * @openapi
 * /payments:
 *   post:
 *     summary: Initiate a payment for a booking milestone
 *     tags: [Payments]
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
 *               - bookingId
 *               - paymentId
 *             properties:
 *               bookingId:
 *                 type: string
 *                 description: Booking UUID the payment belongs to
 *               paymentId:
 *                 type: string
 *                 description: Payment milestone UUID to initiate
 *     responses:
 *       200:
 *         description: Payment initiation successful, returns gateway checkout URL or reference
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking or payment not found
 */
router.post("/", initiatePayment);

/**
 * @openapi
 * /payments/booking/{bookingId}:
 *   get:
 *     summary: Get all payment milestones for a specific booking
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking UUID
 *     responses:
 *       200:
 *         description: List of payment milestones with status and amounts
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Booking not found
 */
router.get("/booking/:bookingId", getPaymentsByBooking);

/**
 * @openapi
 * /payments/{paymentId}/verify:
 *   patch:
 *     summary: Mark a payment as verifying (after manual bank transfer)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment UUID
 *     responses:
 *       200:
 *         description: Payment status updated to verifying
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Payment not found
 */
router.patch("/:paymentId/verify", markPaymentVerifying);

/**
 * @openapi
 * /payments/admin/auto-release:
 *   post:
 *     summary: Trigger automatic release of eligible escrow payments (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     description: >
 *       Scans all held-escrow payments whose auto-release date has passed and releases them
 *       to vendor payout ledger. Intended to be called by a cron job or manually by admins.
 *     responses:
 *       200:
 *         description: Auto-release completed, returns count of released payments
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – admin role required
 */
router.post("/admin/auto-release", isAdmin, triggerAutoRelease);

/**
 * @openapi
 * /payments/admin/{paymentId}/force-release:
 *   post:
 *     summary: Force-release a specific escrow payment to vendor (admin only)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment UUID to force-release
 *     responses:
 *       200:
 *         description: Payment force-released and payout ledger entry created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden – admin role required
 *       404:
 *         description: Payment not found
 *       409:
 *         description: Payment is not in held_escrow state
 */
router.post("/admin/:paymentId/force-release", isAdmin, forceReleasePayment);

export default router;
