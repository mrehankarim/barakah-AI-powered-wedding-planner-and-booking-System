import { Router } from "express";
import { createBooking, listBookings, getBookingById, cancelBooking } from "../controllers/bookingController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createBooking).get(listBookings);
router.route("/:id").get(getBookingById);
router.route("/:id/cancel").patch(cancelBooking);

export default router;