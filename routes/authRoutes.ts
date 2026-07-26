import { Router } from "express";
import { resgiterUser } from "../controllers/authController";

const router = Router()

router.route("/register").post(resgiterUser)

export default router