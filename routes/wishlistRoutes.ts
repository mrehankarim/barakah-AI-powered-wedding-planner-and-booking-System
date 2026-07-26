import { Router } from "express";
import { toggleWishlist, getWishlist, removeFromWishlist } from "../controllers/wishlistController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Wishlist
 *   description: Saved vendor listings and wishlist management
 */

router.use(verifyJWT);

/**
 * @openapi
 * /wishlist:
 *   post:
 *     summary: Toggle a listing in user's wishlist (add if missing, remove if present)
 *     tags: [Wishlist]
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
 *             properties:
 *               listingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Wishlist item toggled
 *   get:
 *     summary: Get all items in current user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of saved wishlist items
 */
router.route("/").post(toggleWishlist).get(getWishlist);

/**
 * @openapi
 * /wishlist/{listingId}:
 *   delete:
 *     summary: Remove a specific listing from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from wishlist
 */
router.route("/:listingId").delete(removeFromWishlist);

export default router;