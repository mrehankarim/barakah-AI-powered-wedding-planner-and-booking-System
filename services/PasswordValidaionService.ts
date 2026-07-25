import { z } from "zod";

const passwordValidationSchema = z.string().min(8, "Password must be at least 8 characters long").regex(/[a-z]/, "Password must contain at least one lowercase letter").regex(/[A-Z]/, "Password must contain at least one uppercase letter").regex(/[0-9]/, "Password must contain at least one number")

const validatePassword = (password: string) => {
    const result = passwordValidationSchema.safeParse(password)
    return result
}

export default validatePassword