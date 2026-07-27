import { NextFunction, Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";

const isEndUser = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {

    if (req.user?.role !== "end_user") {
        throw new ApiError(403, "Forbidden: Only end_users can perform this action")
    }
    next()
})

export default isEndUser