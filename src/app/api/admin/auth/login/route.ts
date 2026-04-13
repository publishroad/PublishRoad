import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/server-utils";
import { cookies } from "next/headers";
import { z } from "zod";
import { createAdminSession } from "@/lib/admin-auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await db.adminUser.findUnique({
    where: { email: normalizedEmail, isActive: true },
    select: {
      id: true,
      passwordHash: true,
      totpEnabled: true,
      role: true,
    },
  });

  if (!admin) {
    // Constant-time response to prevent enumeration
    await new Promise((r) => setTimeout(r, 200));
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await verifyPassword(admin.passwordHash, password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const cookieStore = await cookies();

  // Check if TOTP is required
  if (admin.totpEnabled) {
    // Set a partial session (totpVerified: false) so verify-2fa can read the adminId.
    // requireAdmin() blocks all protected routes until totpVerified is upgraded to true.
    const partialToken = await createAdminSession(admin.id, false);
    cookieStore.set("admin_session", partialToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10, // 10 minutes — only long enough to complete 2FA
    });
    return NextResponse.json({ requireTotp: true });
  }

  // 2FA disabled — grant full access immediately
  const sessionToken = await createAdminSession(admin.id, true);

  cookieStore.set("admin_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 hours
  });

  // ✅ Return proper status with flags
  return NextResponse.json({ 
    success: true,
    requireTotp: false,
    requireSetup: false,
  });
}
