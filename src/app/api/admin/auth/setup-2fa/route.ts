import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession, createAdminSession } from "@/lib/admin-auth";
import { totpGenerateSecret, totpVerify, totpKeyUri } from "@/lib/totp";
import QRCode from "qrcode";
import { z } from "zod";

const schema = z.object({ token: z.string().length(6) });

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifyAdminSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const secret = totpGenerateSecret();
  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { email: true },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  // Store pending secret
  await db.adminUser.update({
    where: { id: session.adminId },
    data: { totpSecret: secret },
  });

  const otpAuthUrl = totpKeyUri(admin.email, "PublishRoad Admin", secret);
  const qrCode = await QRCode.toDataURL(otpAuthUrl);

  return NextResponse.json({ qrCode, secret });
}

export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session");

  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await verifyAdminSession(sessionCookie.value);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid code" }, { status: 422 });
  }

  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { totpSecret: true },
  });

  if (!admin?.totpSecret) {
    return NextResponse.json({ error: "No TOTP secret found" }, { status: 400 });
  }

  const isValid = await totpVerify(parsed.data.token, admin.totpSecret);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    Math.random().toString(36).substring(2, 12).toUpperCase()
  );

  await db.adminUser.update({
    where: { id: session.adminId },
    data: {
      totpEnabled: true,
      backupCodes: JSON.stringify(backupCodes),
    },
  });

  // Upgrade session to TOTP-verified
  const newToken = await createAdminSession(session.adminId, true);
  cookieStore.set("admin_session", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return NextResponse.json({ backupCodes });
}
