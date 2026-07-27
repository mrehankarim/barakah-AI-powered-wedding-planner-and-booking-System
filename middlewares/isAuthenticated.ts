import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/apiError";
import jwt from "jsonwebtoken";
import asyncHandler from "../utils/asyncHandler";
import { prisma } from "../lib/prisma";

interface CustomJwtPayload extends jwt.JwtPayload {
    id: string;
}

const isAuthenticated = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.accessToken
    if (!token)
        throw new ApiError(401, "Unauthorized")

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET as jwt.Secret) as CustomJwtPayload

    const user = await prisma.user.findUnique({
        where: {
            id: decodedToken.id
        }
    })
    if (!user)
        throw new ApiError(401, "Unauthorized: User not found")
    if (!user.is_verified) {
        throw new ApiError(401, "Unauthorized: User not verified")
    }
    req.user = user
    next()
})

export default isAuthenticated