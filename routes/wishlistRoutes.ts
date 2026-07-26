import { Router } from "express";
import { toggleWishlist, getWishlist, removeFromWishlist } from "../controllers/wishlistController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

router.use(verifyJWT);

router.route("/").post(toggleWishlist).get(getWishlist);
router.route("/:listingId").delete(removeFromWishlist);

export default router;