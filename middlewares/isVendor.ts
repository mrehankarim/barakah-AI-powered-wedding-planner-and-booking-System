import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";

const isVendor = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    if (req.user?.role !== "vendor") {
        throw new ApiError(403, "Forbidden: Only admins can perform this action")
    }
    next()
})

export default isVendor