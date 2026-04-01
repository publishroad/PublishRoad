import { NextRequest, NextResponse } from "next/server";
import { handlers } from "@/lib/auth";
import {
	buildRateLimitIdentifiers,
	checkRateLimitForIdentifiers,
	loginLimiter,
	tryAcquireBackpressure,
} from "@/lib/rate-limit";

const AUTH_POST_MAX_INFLIGHT = Number(process.env.AUTH_POST_MAX_INFLIGHT ?? 45);

export const GET = handlers.GET;

export async function POST(request: NextRequest) {
	const isCredentialsFlow = request.nextUrl.pathname.includes("/callback/credentials");
	if (!isCredentialsFlow) {
		return handlers.POST(request);
	}

	const rateLimitIdentifiers = buildRateLimitIdentifiers(request, {
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

	const release = tryAcquireBackpressure("nextauth-credentials", AUTH_POST_MAX_INFLIGHT);
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

	try {
		return handlers.POST(request);
	} finally {
		release();
	}
}
