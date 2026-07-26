import { Router } from "express";
import {
  resgiterUser,
  loginUser,
  logoutUser,
  updateUserDetails,
  refreshAccessAndRefreshToken,
  verifyOTP,
} from "../controllers/authController";
import { verifyJWT } from "../middlewares/authMiddleware";
import isAuthenticated from "../middlewares/isAuthenticated";

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Auth
 *   description: User authentication and account management endpoints
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - city
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *               city:
 *                 type: string
 *                 example: Lahore
 *               role:
 *                 type: string
 *                 enum: [admin, end_user, vendor]
 *                 example: end_user
 *     responses:
 *       201:
 *         description: User registered successfully & OTP sent
 *       400:
 *         description: Validation error or user already exists
 */
router.route("/register").post(resgiterUser);

/**
 * @openapi
 * /auth/verify-otp:
 *   post:
 *     summary: Verify email address via OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       401:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 */
router.route("/verify-otp").post(verifyOTP);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: john@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *     responses:
 *       200:
 *         description: Login successful, tokens set in HTTP-only cookies
 *       401:
 *         description: Invalid password or email not verified
 *       404:
 *         description: User not found
 */
router.route("/login").post(loginUser);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful, cookies cleared
 *       401:
 *         description: Unauthorized
 */
router.route("/logout").post(verifyJWT, logoutUser);

/**
 * @openapi
 * /auth/update-details:
 *   patch:
 *     summary: Update profile details
 *     tags: [Auth]
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
 *               fullName:
 *                 type: string
 *                 example: John Doe Updated
 *               city:
 *                 type: string
 *                 example: Karachi
 *     responses:
 *       200:
 *         description: User updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.route("/update-details").patch(verifyJWT, updateUserDetails);
router.route("/me").patch(verifyJWT, updateUserDetails);

/**
 * @openapi
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access and refresh tokens
 *     tags: [Auth]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token (optional if provided in cookie)
 *     responses:
 *       200:
 *         description: Tokens refreshed successfully
 *       401:
 *         description: Invalid or expired refresh token
 */
router.route("/refresh-token").post(refreshAccessAndRefreshToken);

export default router;
