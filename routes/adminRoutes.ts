import { Router } from "express";
import isAuthenticated from "../middlewares/isAuthenticated";
import isAdmin from "../middlewares/isAdmin";
import {
    getAllVendors,
    getVendorById,
    updateVendor,
    getAllListings,
    updateListingStatus,
    getAllBookings,
    resolveDispute,
    getAllPayments,
    markPayoutPaid,
    getDashboardStats,
} from "../controllers/adminController";

const router = Router();

router.use(isAuthenticated, isAdmin);

router.get("/stats", getDashboardStats);

router.get("/vendors", getAllVendors);
router.get("/vendors/:vendorId", getVendorById);
router.patch("/vendors/:vendorId", updateVendor);

router.get("/listings", getAllListings);
router.patch("/listings/:listingId/status", updateListingStatus);

router.get("/bookings", getAllBookings);
router.patch("/bookings/:bookingId/dispute/resolve", resolveDispute);

router.get("/payments", getAllPayments);
router.patch("/payouts/:ledgerId/mark-paid", markPayoutPaid);

export default router;
