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

interface VerifyEmailProps {
  name: string;
  verifyUrl: string;
}

export function VerifyEmailTemplate({ name, verifyUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your PublishRoad email address</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Verify your email</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Thanks for signing up for PublishRoad! Please verify your email
            address to get started.
          </Text>
          <Section style={buttonContainer}>
            <Button href={verifyUrl} style={button}>
              Verify Email Address
            </Button>
          </Section>
          <Text style={smallText}>
            This link expires in 24 hours. If you didn&apos;t create an
            account, you can safely ignore this email.
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
