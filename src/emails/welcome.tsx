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

interface WelcomeProps {
  name: string;
}

export function WelcomeTemplate({ name }: WelcomeProps) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

  return (
    <Html>
      <Head />
      <Preview>Welcome to PublishRoad! Your free curation is waiting.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to PublishRoad!</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            You&apos;re all set! You have <strong>1 free curation</strong>{" "}
            ready to use. Submit your product URL and we&apos;ll generate a
            curated list of the best places to launch.
          </Text>
          <Section style={buttonContainer}>
            <Button href={dashboardUrl} style={button}>
              Start Your First Curation
            </Button>
          </Section>
          <Text style={text}>
            <strong>What you can do with PublishRoad:</strong>
          </Text>
          <Text style={listItem}>✓ Find the best product directories to submit to</Text>
          <Text style={listItem}>✓ Discover guest post opportunities for backlinks</Text>
          <Text style={listItem}>✓ Get press release distribution sites</Text>
          <Text style={smallText}>
            Need more curations? Check out our{" "}
            <a href={`${process.env.NEXT_PUBLIC_APP_URL}/pricing`} style={link}>
              pricing plans
            </a>
            .
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
const listItem = { color: "#333333", fontSize: "16px", lineHeight: "1.8", marginBottom: "4px" };
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
const link = { color: "#2E75B6" };
