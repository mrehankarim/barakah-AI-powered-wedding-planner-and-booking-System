import { Resend } from "resend";
import VerificationEmail from "../email/VerificationEmail";

const resend = new Resend(process.env.RESEND_EMAIL_VERIFICATION_KEY)

class EmailService {
    static async sendVerificationEmail(from: string, to: string, name: string, otp: string) {
        await resend.emails.send({
            from: from,
            to: to,
            subject: "Verify Your Email Address",
            react: VerificationEmail({ name, OTP: otp })
        });

    }
}


export default EmailService
