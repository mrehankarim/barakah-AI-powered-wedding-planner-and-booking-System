import { Resend } from "resend";
import VerificationEmail from "../email/VerificationEmail";

const getResendClient = () => {
  const apiKey = process.env.RESEND_EMAIL_VERIFICATION_KEY || process.env.RESEND_API_KEY || "re_123456789";
  return new Resend(apiKey);
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const resend = getResendClient();
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: to,
      subject: subject,
      html: html,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
  }
};

class EmailService {
  static async sendVerificationEmail(from: string, to: string, name: string, otp: string) {
    try {
      const resend = getResendClient();
      await resend.emails.send({
        from: from,
        to: to,
        subject: "Verify Your Email Address",
        react: VerificationEmail({ name, OTP: otp }),
      });
    } catch (error) {
      console.error("Verification email sending failed:", error);
    }
  }
}

export { sendEmail };
export default EmailService;
