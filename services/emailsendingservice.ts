import { Resend } from "resend";

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY || "re_123456789";
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

export { sendEmail };