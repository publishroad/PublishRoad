// Razorpay REST API v1 helpers
// Key ID (publicKey) + Key Secret (secretKey) from payment settings
// Amount is always in smallest currency unit (paise for INR, cents for USD, etc.)

import crypto from "crypto";

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

function basicAuth(keyId: string, keySecret: string) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpayOrder(opts: {
  keyId: string;
  keySecret: string;
  amountSmallestUnit: number; // paise for INR, cents for USD, etc.
  currency: string;           // "INR", "USD", etc.
  receipt: string;            // internal reference, max 40 chars
}): Promise<{ orderId: string; amount: number; currency: string }> {
  const res = await fetch(`${RAZORPAY_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(opts.keyId, opts.keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: opts.amountSmallestUnit,
      currency: opts.currency,
      receipt: opts.receipt.slice(0, 40),
    }),
  });

  type RazorpayOrder = {
    id?: string; amount?: number; currency?: string;
    error?: { description?: string; code?: string };
  };
  const data = await res.json() as RazorpayOrder;

  if (!data.id) {
    throw new Error(
      `Razorpay order creation failed: ${data.error?.description ?? data.error?.code ?? JSON.stringify(data)}`
    );
  }

  return { orderId: data.id, amount: data.amount!, currency: data.currency! };
}

export function verifyRazorpaySignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const body = `${opts.orderId}|${opts.paymentId}`;
  const expected = crypto
    .createHmac("sha256", opts.keySecret)
    .update(body)
    .digest("hex");
  return expected === opts.signature;
}
