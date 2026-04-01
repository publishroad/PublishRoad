import { NextRequest, NextResponse } from "next/server";
import { apiError } from "@/lib/api/responses";
import { loginSchema } from "@/lib/validations/auth";
import { evaluateLoginCredentials, type LoginCheckCode } from "@/lib/login-evaluator";
import {
  buildRateLimitIdentifiers,
  checkRateLimitForIdentifiers,
  loginLimiter,
  tryAcquireBackpressure,
} from "@/lib/rate-limit";

const LOGIN_CHECK_MAX_INFLIGHT = Number(process.env.LOGIN_CHECK_MAX_INFLIGHT ?? 40);

export async function POST(req: NextRequest) {
  const rateLimitIdentifiers = buildRateLimitIdentifiers(req, {
    scope: "login",
  });

  const rl = await checkRateLimitForIdentifiers(loginLimiter, rateLimitIdentifiers);
  if (!rl.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many login attempts. Please wait and try again.",
        },
      },
      { status: 429, headers: rl.headers }
    );
  }

  const release = tryAcquireBackpressure("login-check", LOGIN_CHECK_MAX_INFLIGHT);
  if (!release) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Server is busy. Please retry shortly.",
        },
      },
      { status: 429, headers: { ...rl.headers, "Retry-After": "1" } }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    release();
    return apiError(422, "VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid input");
  }

  const { email, password } = parsed.data;

  try {
    const result = await evaluateLoginCredentials(email, password, {
      loadProfile: false,
      useCache: true,
      recordFailures: false,
    });

    if (result.code !== "OK") {
      return apiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }

    return NextResponse.json({ success: true, code: result.code satisfies LoginCheckCode }, { status: 200 });
  } catch (error) {
    console.error("login-check unavailable:", error);
    return apiError(503, "AUTH_UNAVAILABLE", "Authentication is temporarily unavailable. Please try again.");
  } finally {
    release();
  }
}
