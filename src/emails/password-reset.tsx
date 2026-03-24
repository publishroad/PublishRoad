import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PasswordResetProps {
  name: string;
  resetUrl: string;
}

export function PasswordResetTemplate({ name, resetUrl }: PasswordResetProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your PublishRoad password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Reset your password</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            We received a request to reset your password. Click the button below
            to create a new password.
          </Text>
          <Section style={buttonContainer}>
            <Button href={resetUrl} style={button}>
              Reset Password
            </Button>
          </Section>
          <Text style={smallText}>
            This link expires in 1 hour. If you didn&apos;t request a password
            reset, you can safely ignore this email — your password will not
            change.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#EDF5FA", fontFamily: "Inter, sans-serif" };
const container = {
  margin: "40px auto",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  padding: "40px",
  border: "1px solid #E2E8F0",
};
const h1 = { color: "#1A3C6E", fontSize: "24px", fontWeight: "600", marginBottom: "16px" };
const text = { color: "#333333", fontSize: "16px", lineHeight: "1.6", marginBottom: "16px" };
const buttonContainer = { textAlign: "center" as const, marginTop: "24px", marginBottom: "24px" };
const button = {
  backgroundColor: "#1A3C6E",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
};
const smallText = { color: "#666666", fontSize: "14px", lineHeight: "1.6" };
