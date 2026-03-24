import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validations/auth";
import { evaluateLoginCredentials, type LoginCheckCode } from "@/lib/login-evaluator";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid login payload." }, { status: 400 });
  }

  const { email, password } = parsed.data;

  const result = await evaluateLoginCredentials(email, password);
  return NextResponse.json({ code: result.code satisfies LoginCheckCode }, { status: 200 });
}
