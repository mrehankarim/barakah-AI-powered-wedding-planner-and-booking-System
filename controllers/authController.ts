import { Request, Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiError from "../utils/apiError";
import validatePassword from "../services/PasswordValidaionService";
import validateEmail from "../services/EmailValidationServices";
import { prisma } from "../lib/prisma";
import { UserRole } from "../generated/prisma/enums";
import bcrypt from "bcrypt";
import ApiResponse from "../utils/apiResponse";
import jwt from "jsonwebtoken";
import { User } from "../generated/prisma/client";
import { otpGenerator } from "../utils/otpgenerator";
import EmailService from "../services/emailsendingservice";
import { authVerificationEmail } from "../constants";

interface CustomJwtPayload extends jwt.JwtPayload {
    id: string;
}

const validationRoles: UserRole[] = ["admin", "end_user", "vendor"]


const generateAccessAndRefreshToken = (user: User) => {
    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

    if (!accessTokenSecret || !refreshTokenSecret) {
        throw new ApiError(500, "JWT secret environment variables are missing");
    }

    const accessToken = jwt.sign({
        id: user.id,
        role: user.role,
        email: user.email,
        full_name: user.full_name
    }, accessTokenSecret, {
        expiresIn: (process.env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']) || "15m"
    })

    const refreshToken = jwt.sign({
        id: user.id,
    }, refreshTokenSecret, {
        expiresIn: (process.env.REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']) || "10d"
    })

    return { accessToken, refreshToken }
}



const resgiterUser = asyncHandler(async (req: Request, res: Response) => {

    const { fullName, email, password, city, role } = req.body
    if ([fullName, email, password, city, role].some(field => !field?.trim())) {
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
            role: role
        },
        select: {
            id: true,
            full_name: true,
            email: true,
            city: true,
            role: true,
            created_at: true

        }
    })
    //send verification email
    const otp = otpGenerator()
    await prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            otp: await bcrypt.hash(otp, 10),
            otp_expires_at: new Date(Date.now() + 10 * 60 * 1000)
        }
    })

    //send email

    await EmailService.sendVerificationEmail(authVerificationEmail, user.email, user.full_name, otp)

    return res
        .status(201)
        .json(new ApiResponse(201, user, "User registered successfully"))
})


const verifyOTP = asyncHandler(async (req: Request, res: Response) => {

    const { email, otp } = req.body
    if (!email || !otp) {
        throw new ApiError(400, "Email and OTP are required")
    }
    const user = await prisma.user.findFirst({
        where: {
            email: email
        }
    })
    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const isOtpValid = await bcrypt.compare(otp, user.otp!)
    if (!isOtpValid) {
        throw new ApiError(401, "Invalid OTP")
    }
    if (user.otp_expires_at! < new Date()) {
        await prisma.user.update({
            where: {
                id: user.id
            },
            data: {
                otp: await bcrypt.hash(otpGenerator(), 10),
                otp_expires_at: new Date(Date.now() + 10 * 60 * 1000)
            }
        })
        await EmailService.sendVerificationEmail(authVerificationEmail, user.email, user.full_name, otp)

        throw new ApiError(401, "OTP has expired")
    }
    await prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            is_verified: true,
            otp: null,
            otp_expires_at: null
        }
    })
    return res.status(200).json(new ApiResponse(200, {}, "OTP verified successfully"))

})



const loginUser = asyncHandler(async (req: Request, res: Response) => {

    const { email, password } = req.body
    if (!email || !password)
        throw new ApiError(400, "All Fields are required")

    const emailValidation = validateEmail(email)
    if (!emailValidation.success)
        throw new ApiError(400, emailValidation.error.message)

    const user = await prisma.user.findFirst({
        where: {
            email: email
        }
    })

    if (!user) {
        throw new ApiError(404, "User not found")
    }
    const isPasswordValid = await bcrypt.compare(password, user.password_hash!)
    if (!isPasswordValid)
        throw new ApiError(401, "Invalid Password")

    if (!user.is_verified)
        throw new ApiError(401, "User not verified, first verify your email")

    const { accessToken, refreshToken } = generateAccessAndRefreshToken(user)

    await prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            refresh_token: refreshToken
        }
    })

    const responseUser = {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        city: user.city,
        role: user.role,
        created_at: user.created_at,
    }
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 }).cookie("refreshToken", refreshToken, { ...options, maxAge: 10 * 24 * 60 * 60 * 1000 }).json(
        new ApiResponse(200, responseUser, "Login Successfully")
    )

})


const logoutUser = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user)
        throw new ApiError(401, "Unauthorized")
    await prisma.user.update({
        where: {
            id: req.user.id
        },
        data: {
            refresh_token: null
        }
    })

    return res.status(200).clearCookie("accessToken").clearCookie("refreshToken").json(
        new ApiResponse(200, {}, "Logout Successfully")
    )
})

const updateUserDetails = asyncHandler(async (req: Request, res: Response) => {

    const { fullName, city } = req.body
    if (!req.user)
        throw new ApiError(401, "Unauthorized")
    if (!fullName && !city)
        throw new ApiError(400, "Atleast one field should be provided")

    const updatedUser = await prisma.user.update({
        where: {
            id: req.user.id
        },
        data: {
            full_name: fullName,
            city: city
        },
        select: {
            id: true,
            full_name: true,
            email: true,
            city: true,
            role: true,
            created_at: true
        }
    })
    return res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"))

})


const refreshAccessAndRefreshToken = asyncHandler(async (req: Request, res: Response) => {
    const incomingRefreshToken = req.cookies.refreshToken
    if (!incomingRefreshToken)
        throw new ApiError(401, "Unauthorized")

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET as jwt.Secret) as CustomJwtPayload
    const user = await prisma.user.findUnique({
        where: {
            id: decodedToken.id,
            refresh_token: incomingRefreshToken
        }
    })
    if (!user)
        throw new ApiError(401, "Unauthorized")

    const { accessToken, refreshToken } = generateAccessAndRefreshToken(user)

    await prisma.user.update({
        where: {
            id: user.id
        },
        data: {
            refresh_token: refreshToken
        }
    })

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200).cookie("accessToken", accessToken, { ...options, maxAge: 15 * 60 * 1000 }).cookie("refreshToken", refreshToken, { ...options, maxAge: 10 * 24 * 60 * 60 * 1000 }).json(
        new ApiResponse(200, {}, "Access and refresh token refreshed successfully")
    )
})

export { resgiterUser, loginUser, logoutUser, updateUserDetails, refreshAccessAndRefreshToken, verifyOTP }