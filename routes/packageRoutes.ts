import { Router } from "express";
import {
  createPackage,
  listPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  addPackageItem,
  updatePackageItem,
  removePackageItem,
} from "../controllers/packageController";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Packages
 *   description: Custom package builder and item management
 */

router.use(isAuthenticated);

/**
 * @openapi
 * /packages:
 *   post:
 *     summary: Create a new wedding package
 *     tags: [Packages]
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Royal Wedding Package
 *               description:
 *                 type: string
 *                 example: Full service wedding plan
 *               budget:
 *                 type: number
 *                 example: 500000
 *     responses:
 *       201:
 *         description: Package created successfully
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: List all user packages
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user packages
 *       401:
 *         description: Unauthorized
 */
router.route("/").post(createPackage).get(listPackages);

/**
 * @openapi
 * /packages/{id}:
 *   get:
 *     summary: Get package by ID
 *     tags: [Packages]
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
 *         description: Package details
 *       404:
 *         description: Package not found
 *   patch:
 *     summary: Update package details
 *     tags: [Packages]
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
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               budget:
 *                 type: number
 *     responses:
 *       200:
 *         description: Package updated successfully
 *   delete:
 *     summary: Delete a package
 *     tags: [Packages]
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
 *         description: Package deleted successfully
 */
router
  .route("/:id")
  .get(getPackageById)
  .patch(updatePackage)
  .delete(deletePackage);

/**
 * @openapi
 * /packages/{id}/items:
 *   post:
 *     summary: Add item to a package
 *     tags: [Packages]
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
 *             required:
 *               - listingId
 *             properties:
 *               listingId:
 *                 type: string
 *               tierId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Item added to package
 */
router.route("/:id/items").post(addPackageItem);

/**
 * @openapi
 * /packages/{id}/items/{itemId}:
 *   patch:
 *     summary: Update an item in a package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
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
 *               tierId:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item updated successfully
 *   delete:
 *     summary: Remove an item from a package
 *     tags: [Packages]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Item removed from package
 */
router
  .route("/:id/items/:itemId")
  .patch(updatePackageItem)
  .delete(removePackageItem);

export default router;