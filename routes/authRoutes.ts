import { Router } from "express";
import { resgiterUser, loginUser, logoutUser, updateUserDetails } from "../controllers/authController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

router.route("/register").post(resgiterUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").patch(verifyJWT, updateUserDetails);

export default router;