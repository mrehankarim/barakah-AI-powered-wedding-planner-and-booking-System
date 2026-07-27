import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import isAdmin from "../middlewares/isAdmin";
import {
    initiatePayment,
    handleWebhook,
    getPaymentsByBooking,
    triggerAutoRelease,
    forceReleasePayment,
    markPaymentVerifying,
} from "../controllers/paymentController";

const router = Router();

router.post("/webhook", handleWebhook);

router.use(isAuthenticated);

router.post("/", initiatePayment);
router.get("/booking/:bookingId", getPaymentsByBooking);
router.patch("/:paymentId/verify", markPaymentVerifying);

router.post("/admin/auto-release", isAdmin, triggerAutoRelease);
router.post("/admin/:paymentId/force-release", isAdmin, forceReleasePayment);

export default router;
