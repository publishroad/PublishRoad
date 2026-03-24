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

interface CurationCompleteProps {
  name: string;
  productUrl: string;
  resultsUrl: string;
}

export function CurationCompleteTemplate({
  name,
  productUrl,
  resultsUrl,
}: CurationCompleteProps) {
  return (
    <Html>
      <Head />
      <Preview>Your PublishRoad curation is ready to view!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your curation is ready!</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Great news! We&apos;ve finished generating your curated distribution
            plan for:
          </Text>
          <Text style={productUrlStyle}>{productUrl}</Text>
          <Text style={text}>
            Your results include curated lists of product directories, guest
            post opportunities, and press release sites — all matched to your
            product.
          </Text>
          <Section style={buttonContainer}>
            <Button href={resultsUrl} style={button}>
              View Your Results
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
const productUrlStyle = {
  color: "#2E75B6",
  fontSize: "14px",
  backgroundColor: "#EDF5FA",
  padding: "12px",
  borderRadius: "8px",
  wordBreak: "break-all" as const,
  marginBottom: "16px",
};
const buttonContainer = { textAlign: "center" as const, marginTop: "24px" };
const button = {
  backgroundColor: "#1A3C6E",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "8px",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
};
