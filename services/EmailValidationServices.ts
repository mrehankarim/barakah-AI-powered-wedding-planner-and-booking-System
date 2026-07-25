import { z } from "zod"

const emailValidationSchema = z.email("Invalid email address")

const validateEmail = (email: string) => {
    const result = emailValidationSchema.safeParse(email)
    return result
}
export default validateEmail
