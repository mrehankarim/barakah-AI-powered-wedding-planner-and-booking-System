import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";

const isAdmin = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    if (req.user?.role !== "admin") {
        throw new ApiError(403, "Forbidden: Only admins can perform this action")
    }
    next()
})

export default isAdmin