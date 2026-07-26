import { Router } from "express";
import { myPackages, myBookings, myReviews, updateProfile } from "../controllers/dashboardController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Dashboard
 *   description: User dashboard overview, packages, bookings, reviews, and profile
 */

router.use(verifyJWT);

/**
 * @openapi
 * /dashboard/packages:
 *   get:
 *     summary: Retrieve current user's created packages
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard packages summary
 */
router.route("/packages").get(myPackages);

/**
 * @openapi
 * /dashboard/bookings:
 *   get:
 *     summary: Retrieve current user's active and historical bookings
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard bookings summary
 */
router.route("/bookings").get(myBookings);

/**
 * @openapi
 * /dashboard/reviews:
 *   get:
 *     summary: Retrieve current user's submitted reviews
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard reviews summary
 */
router.route("/reviews").get(myReviews);

/**
 * @openapi
 * /dashboard/profile:
 *   patch:
 *     summary: Update user profile settings
 *     tags: [Dashboard]
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
 *               full_name:
 *                 type: string
 *                 example: John Doe
 *               city:
 *                 type: string
 *                 example: Islamabad
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.route("/profile").patch(updateProfile);

export default router;