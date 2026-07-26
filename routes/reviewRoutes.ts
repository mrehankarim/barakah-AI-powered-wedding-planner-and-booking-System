import { Router } from "express";
import { createReview, updateReview, deleteReview, getVendorReviews } from "../controllers/reviewController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

router.route("/vendors/:id/reviews").get(getVendorReviews);

router.use(verifyJWT);

router.route("/").post(createReview);
router.route("/:id").patch(updateReview).delete(deleteReview);

export default router;