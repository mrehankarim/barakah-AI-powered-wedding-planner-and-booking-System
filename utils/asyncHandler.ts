import { Request, Response, NextFunction } from "express";
import ApiError from "./apiError";
import ApiResponse from "./apiResponse";

type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;

const asyncHandler = (fn: RequestHandler) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        await fn(req, res, next);
    } catch (error: any) {
        if (error instanceof ApiError) {
            return res.status(error.statusCode).json(
                new ApiResponse(error.statusCode, null, error.message)
            );
        }
        next(error);
    }
};

export default asyncHandler;