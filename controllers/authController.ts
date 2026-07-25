import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import validatePassword from "../services/PasswordValidaionService";
import validateEmail from "../services/EmailValidationServices";
import { prisma } from "../lib/prisma";
import { UserRole } from "../generated/prisma/enums";
import bcrypt from "bcrypt";
import ApiResponse from "../utils/apiResponse";

const validationRoles: UserRole[] = ["admin", "end_user", "vendor"]
const resgiterUser = asyncHandler(async (req: Request, res: Response) => {

    const { fullName, email, password, city, role } = req.body
    if ([fullName, email, password, city, role].some(field => field?.trim() === "")) {
        throw new ApiError(400, "All Fields are required")
    }
    if (!validationRoles.includes(role)) {
        throw new ApiError(400, "Invalid Role")
    }
    const passwordValidation = validatePassword(password)
    if (!passwordValidation.success)
        throw new ApiError(400, passwordValidation.error.message)

    const emailValidation = validateEmail(email)
    if (!emailValidation.success)
        throw new ApiError(400, emailValidation.error.message)
    const existingUser = await prisma.user.findFirst({
        where: {
            email: email
        }
    })
    if (existingUser)
        throw new ApiError(400, "User already exists")

    const user = await prisma.user.create({
        data: {
            full_name: fullName,
            email: email,
            password_hash: await bcrypt.hash(password, 10),
            city: city,
            role: role as UserRole
        }
    })

    return res
        .status(201)
        .json(new ApiResponse(201, user, "User registered successfully"))
})