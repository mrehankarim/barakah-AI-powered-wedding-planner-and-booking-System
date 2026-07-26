import { Router } from "express";
import {
  createPackage,
  listPackages,
  getPackageById,
  updatePackage,
  deletePackage,
  addPackageItem,
  updatePackageItem,
  removePackageItem,
} from "../controllers/packageController";
import { verifyJWT } from "../middlewares/authMiddleware";

const router = Router();

router.use(verifyJWT);

router.route("/").post(createPackage).get(listPackages);
router
  .route("/:id")
  .get(getPackageById)
  .patch(updatePackage)
  .delete(deletePackage);
router.route("/:id/items").post(addPackageItem);
router
  .route("/:id/items/:itemId")
  .patch(updatePackageItem)
  .delete(removePackageItem);

export default router;