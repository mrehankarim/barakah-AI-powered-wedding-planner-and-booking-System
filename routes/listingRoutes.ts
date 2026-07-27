import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import {
    getListings,
    getListingDetail,
    getCategories,
    createHold,
    releaseHold,
    checkAvailability,
} from "../controllers/listingController";

const router = Router();

router.get("/", getListings);
router.get("/categories", getCategories);
router.post("/availability/check", checkAvailability);
router.get("/:listingId", getListingDetail);
router.post("/holds", isAuthenticated, createHold);
router.delete("/:listingId/holds/:date", isAuthenticated, releaseHold);

export default router;
