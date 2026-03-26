// PayPal REST API v2 helpers
// Credentials: Client ID (publicKey) + Secret (secretKey) from payment settings
// Mode: "sandbox" or "live" — set in additionalConfig as { "mode": "sandbox" }

const PAYPAL_BASE = (mode: string) =>
  mode === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

export async function getPayPalAccessToken(
  clientId: string,
  secret: string,
  mode = "live"
): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE(mode)}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json() as { access_token?: string; error?: string; error_description?: string };
  if (!data.access_token) {
    const isInvalidClient = data.error === "invalid_client";
    throw new Error(
      isInvalidClient
        ? `PayPal credentials rejected (invalid_client). Check that your Client ID and Secret are correct and that the mode matches — use {"mode":"sandbox"} in Additional Config for sandbox credentials, or {"mode":"live"} for production.`
        : `PayPal auth failed: ${data.error ?? "no access_token"}${data.error_description ? ` — ${data.error_description}` : ""}`
    );
  }
  return data.access_token;
}

export async function createPayPalOrder(opts: {
  accessToken: string;
  mode: string;
  amountUsd: string; // e.g. "9.00"
  planName: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approveUrl: string }> {
  const res = await fetch(`${PAYPAL_BASE(opts.mode)}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          description: opts.planName,
          amount: { currency_code: "USD", value: opts.amountUsd },
        },
      ],
      application_context: {
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
        brand_name: "PublishRoad",
        landing_page: "BILLING",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });

  type PayPalLink = { rel: string; href: string };
  const data = await res.json() as { id?: string; status?: string; links?: PayPalLink[]; name?: string; message?: string };
  if (data.status !== "CREATED" || !data.id) {
    throw new Error(`PayPal order creation failed: ${data.name ?? data.message ?? JSON.stringify(data)}`);
  }

  const approveUrl = data.links?.find((l) => l.rel === "approve")?.href;
  if (!approveUrl) {
    throw new Error("PayPal approve URL missing from order response");
  }

  return { orderId: data.id, approveUrl };
}

export async function capturePayPalOrder(opts: {
  accessToken: string;
  mode: string;
  orderId: string;
}): Promise<{ amountCents: number; currency: string }> {
  const res = await fetch(
    `${PAYPAL_BASE(opts.mode)}/v2/checkout/orders/${opts.orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  type CaptureData = {
    status?: string;
    name?: string;
    message?: string;
    purchase_units?: Array<{
      payments?: { captures?: Array<{ amount?: { value?: string; currency_code?: string } }> };
    }>;
  };
  const data = await res.json() as CaptureData;
  if (data.status !== "COMPLETED") {
    throw new Error(`PayPal capture failed: ${data.name ?? data.message ?? JSON.stringify(data)}`);
  }

  const captureEntry = data.purchase_units?.[0]?.payments?.captures?.[0];
  const amountCents = Math.round(parseFloat(captureEntry?.amount?.value ?? "0") * 100);
  const currency = captureEntry?.amount?.currency_code?.toLowerCase() ?? "usd";

  return { amountCents, currency };
}
