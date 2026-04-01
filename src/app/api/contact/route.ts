import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withDbRetry } from "@/lib/db-resilience";
import { contactSchema } from "@/lib/validations/contact";
import {
  buildRateLimitIdentifiers,
  checkRateLimitForIdentifiers,
  contactLimiter,
  getClientIp,
  tryAcquireBackpressure,
} from "@/lib/rate-limit";
import { enqueueEmailJob } from "@/lib/email/queue";
import { runIdempotentJson } from "@/lib/idempotency";

const CONTACT_MAX_INFLIGHT = Number(process.env.CONTACT_MAX_INFLIGHT ?? 35);

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  const ip = getClientIp(request);

  return runIdempotentJson({
    request,
    scope: "contact",
    payload: parsed.success ? parsed.data : body,
    clientIp: ip,
    execute: async () => {
      const rateLimitIdentifiers = buildRateLimitIdentifiers(request, {
        scope: "contact",
      });

      const rl = await checkRateLimitForIdentifiers(contactLimiter, rateLimitIdentifiers);

      if (!rl.success) {
        return {
          status: 429,
          headers: rl.headers,
          body: {
            success: false,
            error: {
              code: "RATE_LIMITED",
              message: "Too many contact requests. Please wait and try again.",
            },
          },
        };
      }

      const release = tryAcquireBackpressure("contact", CONTACT_MAX_INFLIGHT);
      if (!release) {
        return {
          status: 429,
          headers: { ...rl.headers, "Retry-After": "1" },
          body: {
            success: false,
            error: {
              code: "RATE_LIMITED",
              message: "Server is busy. Please retry shortly.",
            },
          },
        };
      }

      try {
        if (!parsed.success) {
          return {
            status: 422,
            body: {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: parsed.error.issues[0]?.message ?? "Invalid input",
              },
            },
          };
        }

        const { name, email, subject, message } = parsed.data;

        try {
          await withDbRetry(() =>
            db.contactSubmission.create({
              data: { name, email, subject, message },
            })
          );
        } catch (error) {
          console.error("Contact submission unavailable:", error);
          return {
            status: 503,
            body: {
              success: false,
              error: {
                code: "CONTACT_UNAVAILABLE",
                message: "Contact service is temporarily unavailable. Please try again.",
              },
            },
          };
        }

        await enqueueEmailJob("support_contact", {
          to: "support@publishroad.com",
          subject: `New contact form: ${subject}`,
          text: `From: ${name} <${email}>\n\n${message}`,
        });

        return {
          status: 200,
          body: {
            success: true,
            emailQueued: true,
            emailDelivery: "queued",
          },
        };
      } finally {
        release();
      }
    },
  });
}
