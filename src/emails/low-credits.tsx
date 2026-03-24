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

interface LowCreditsProps {
  name: string;
  creditsRemaining: number;
  upgradeUrl: string;
}

export function LowCreditsTemplate({
  name,
  creditsRemaining,
  upgradeUrl,
}: LowCreditsProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {`You have ${creditsRemaining} curation credit${creditsRemaining === 1 ? "" : "s"} remaining`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Low credits reminder</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            You have{" "}
            <strong style={{ color: "#E67E22" }}>
              {creditsRemaining} curation credit
              {creditsRemaining === 1 ? "" : "s"} remaining
            </strong>{" "}
            on your current plan.
          </Text>
          <Text style={text}>
            Upgrade to Pro to get 10 curations per month and never run out.
          </Text>
          <Section style={buttonContainer}>
            <Button href={upgradeUrl} style={button}>
              Upgrade Your Plan
            </Button>
          </Section>
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
const buttonContainer = { textAlign: "center" as const, marginTop: "24px" };
const button = {
  backgroundColor: "#2E75B6",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
};
