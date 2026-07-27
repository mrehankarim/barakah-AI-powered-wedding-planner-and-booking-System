import { Router } from "express";
import { createReview, updateReview, deleteReview, getVendorReviews } from "../controllers/reviewController";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Reviews
 *   description: Vendor reviews and star rating system
 */

/**
 * @openapi
 * /reviews/vendors/{id}/reviews:
 *   get:
 *     summary: Get public reviews for a specific vendor listing
 *     tags: [Reviews]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of vendor reviews and ratings
 */
router.route("/vendors/:id/reviews").get(getVendorReviews);

router.use(isAuthenticated);

/**
 * @openapi
 * /reviews:
 *   post:
 *     summary: Create a review for a completed booking or listing
 *     tags: [Reviews]
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
 *               - rating
 *             properties:
 *               listingId:
 *                 type: string
 *               bookingId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               text:
 *                 type: string
 *                 example: Amazing service and beautiful venue!
 *     responses:
 *       201:
 *         description: Review created successfully
 */
router.route("/").post(createReview);

/**
 * @openapi
 * /reviews/{id}:
 *   patch:
 *     summary: Update an existing review
 *     tags: [Reviews]
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
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Review updated successfully
 *   delete:
 *     summary: Delete a review
 *     tags: [Reviews]
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
 *         description: Review deleted successfully
 */
router.route("/:id").patch(updateReview).delete(deleteReview);

export default router;