import {
    Html,
    Head,
    Body,
    Preview,
    Text,
    Heading,
    Container,
    Section,
    Hr,
    Font
} from "@react-email/components";

interface verifyEmailProps {
    email?: string;
    name: string;
    OTP: string;
}

export default function VerificationEmail({ name, OTP }: verifyEmailProps) {
    return (
        <Html>
            <Head>
                <Font
                    fontFamily="Playfair Display"
                    fallbackFontFamily="Georgia"
                    webFont={{
                        url: "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_RJ3ijVRyePt7j405fb5.woff2",
                        format: "woff2",
                    }}
                    fontWeight={600}
                    fontStyle="normal"
                />
                <Font
                    fontFamily="Inter"
                    fallbackFontFamily="sans-serif"
                    webFont={{
                        url: "https://fonts.gstatic.com/s/inter/v13/UcbC-G16r63F320dF0wUGYA.woff2",
                        format: "woff2",
                    }}
                    fontWeight={400}
                    fontStyle="normal"
                />
            </Head>
            <Preview>Your Barakah Verification Code: {OTP}</Preview>
            <Body style={main}>
                <Container style={container}>
                    <Section style={headerSection}>
                        <Text style={brandLogo}>💍 BARAKAH</Text>
                        <Text style={brandSubtext}>Wedding & Event Platform</Text>
                    </Section>

                    <Hr style={divider} />

                    <Section style={contentSection}>
                        <Heading style={heading}>Verify Your Email Address</Heading>
                        <Text style={paragraph}>
                            Hello <strong>{name}</strong>,
                        </Text>
                        <Text style={paragraph}>
                            Thank you for registering with <strong>Barakah</strong>. To complete your account setup, please use the verification code below:
                        </Text>

                        <Section style={codeBoxContainer}>
                            <Text style={codeBoxLabel}>YOUR VERIFICATION CODE</Text>
                            <Text style={codeText}>{OTP}</Text>
                        </Section>

                        <Text style={expiryText}>
                            ⏰ This code is valid for <strong>10 minutes</strong>. Please do not share this code with anyone.
                        </Text>

                        <Text style={paragraph}>
                            If you did not request this verification email, please disregard it or reach out to our support team.
                        </Text>
                    </Section>

                    <Hr style={divider} />

                    <Section style={footerSection}>
                        <Text style={footerText}>
                            Wishing you warmth & blessings for your journey ✨
                        </Text>
                        <Text style={footerSubtext}>
                            © {new Date().getFullYear()} Barakah Wedding Platform. All rights reserved.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
}

// Inline Styles for HTML Email Compatibility
const main = {
    backgroundColor: "#FAF8F5",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "40px 0",
};

const container = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E6D7C3",
    borderRadius: "12px",
    margin: "0 auto",
    padding: "40px",
    maxWidth: "520px",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
};

const headerSection = {
    textAlign: "center" as const,
    marginBottom: "24px",
};

const brandLogo = {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "28px",
    fontWeight: "700",
    color: "#B8860B",
    margin: "0 0 4px 0",
    letterSpacing: "2px",
};

const brandSubtext = {
    fontSize: "11px",
    color: "#8C7A6B",
    textTransform: "uppercase" as const,
    letterSpacing: "1.5px",
    margin: "0",
};

const divider = {
    borderColor: "#F0E6D8",
    margin: "24px 0",
};

const contentSection = {
    padding: "0 8px",
};

const heading = {
    fontFamily: "'Playfair Display', Georgia, serif",
    fontSize: "24px",
    fontWeight: "600",
    color: "#1A1A1A",
    margin: "0 0 20px 0",
    textAlign: "center" as const,
};

const paragraph = {
    fontSize: "15px",
    lineHeight: "24px",
    color: "#4A4A4A",
    margin: "0 0 16px 0",
};

const codeBoxContainer = {
    backgroundColor: "#FFFBF2",
    border: "1px dashed #D4AF37",
    borderRadius: "10px",
    padding: "24px 16px",
    textAlign: "center" as const,
    margin: "24px 0",
};

const codeBoxLabel = {
    fontSize: "11px",
    fontWeight: "700",
    color: "#B8860B",
    letterSpacing: "2px",
    textTransform: "uppercase" as const,
    margin: "0 0 8px 0",
};

const codeText = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "36px",
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: "8px",
    margin: "0",
};

const expiryText = {
    fontSize: "13px",
    color: "#856404",
    backgroundColor: "#FFF3CD",
    border: "1px solid #FFEEBA",
    borderRadius: "6px",
    padding: "10px 14px",
    textAlign: "center" as const,
    margin: "0 0 20px 0",
};

const footerSection = {
    textAlign: "center" as const,
};

const footerText = {
    fontSize: "14px",
    color: "#6B5E52",
    fontStyle: "italic",
    margin: "0 0 8px 0",
};

const footerSubtext = {
    fontSize: "12px",
    color: "#9E9E9E",
    margin: "0",
};