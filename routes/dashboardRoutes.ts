import { Router } from "express";
import { myPackages, myBookings, myReviews, updateProfile } from "../controllers/dashboardController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

router.use(verifyJWT);

router.route("/packages").get(myPackages);
router.route("/bookings").get(myBookings);
router.route("/reviews").get(myReviews);
router.route("/profile").patch(updateProfile);

export default router;