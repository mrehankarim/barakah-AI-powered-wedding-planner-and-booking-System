import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import isAdmin from "../middlewares/isAdmin";
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
} from "../controllers/categoryController";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Categories
 *   description: Category management and catalog taxonomy
 */

/**
 * @openapi
 * /categories:
 *   get:
 *     summary: Retrieve all catalog categories
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: List of categories sorted by name
 *   post:
 *     summary: Create a new category (admin only)
 *     tags: [Categories]
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
 *               - default_budget_weight_pct
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Venues & Marquees"
 *               slug:
 *                 type: string
 *                 example: "venues-marquees"
 *               default_budget_weight_pct:
 *                 type: number
 *                 example: 40
 *                 description: Default percentage weight for budget calculation
 *               attribute_schema:
 *                 type: object
 *                 example:
 *                   capacity: { type: "number", required: true }
 *                   catering_policy: { type: "string", enum: ["internal", "external", "both"] }
 *     responses:
 *       201:
 *         description: Category created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Category slug already exists
 */
router.route("/")
    .get(getAllCategories)
    .post(isAuthenticated, isAdmin, createCategory);

/**
 * @openapi
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID or slug
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category UUID or slug
 *     responses:
 *       200:
 *         description: Category details with counts of listings and package line items
 *       404:
 *         description: Category not found
 *   patch:
 *     summary: Update category details (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category UUID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               slug:
 *                 type: string
 *               default_budget_weight_pct:
 *                 type: number
 *               attribute_schema:
 *                 type: object
 *     responses:
 *       200:
 *         description: Category updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 *       409:
 *         description: New slug conflicts with an existing category
 *   delete:
 *     summary: Delete a category (admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Category UUID
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Cannot delete category with active listings or package line items
 */
router.route("/:id")
    .get(getCategoryById)
    .patch(isAuthenticated, isAdmin, updateCategory)
    .delete(isAuthenticated, isAdmin, deleteCategory);

export default router;
