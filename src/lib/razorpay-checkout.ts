// Client-side Razorpay checkout helper
// Loads checkout.js, opens the payment modal, then calls our capture API.

export type RazorpayCheckoutData = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  planName: string;
  successUrl: string;
  cancelUrl: string;
};

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") { reject(new Error("Not in browser")); return; }
    if ((window as { Razorpay?: unknown }).Razorpay) { resolve(); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script"));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout(
  data: RazorpayCheckoutData,
  userEmail?: string
): Promise<void> {
  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const RazorpayConstructor = (window as { Razorpay?: new (opts: unknown) => { open(): void } }).Razorpay;
    if (!RazorpayConstructor) { reject(new Error("Razorpay not loaded")); return; }

    const rzp = new RazorpayConstructor({
      key: data.keyId,
      order_id: data.orderId,
      amount: data.amount,
      currency: data.currency,
      name: "PublishRoad",
      description: data.planName,
      prefill: { email: userEmail ?? "" },
      theme: { color: "#5B58F6" },
      modal: { ondismiss: () => reject(new Error("dismissed")) },
      handler: async (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) => {
        try {
          const res = await fetch("/api/payments/razorpay-capture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });
          const payload = await res.json() as { success?: boolean; redirectUrl?: string; error?: string };
          if (payload.success && payload.redirectUrl) {
            window.location.href = payload.redirectUrl;
            resolve();
          } else {
            window.location.href = data.cancelUrl + "?error=" + (payload.error ?? "capture_failed");
            reject(new Error(payload.error ?? "capture_failed"));
          }
        } catch (err) {
          window.location.href = data.cancelUrl + "?error=network_error";
          reject(err);
        }
      },
    });

    rzp.open();
  });
}
