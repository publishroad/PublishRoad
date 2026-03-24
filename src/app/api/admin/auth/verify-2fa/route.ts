import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession, createAdminSession } from "@/lib/admin-auth";
import { totpVerify } from "@/lib/totp";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(6),
  isBackupCode: z.boolean().optional().default(false),
});

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
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { token, isBackupCode } = parsed.data;

  const admin = await db.adminUser.findUnique({
    where: { id: session.adminId },
    select: { totpSecret: true, backupCodes: true },
  });

  if (!admin) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  let isValid = false;

  if (isBackupCode) {
    const codes: string[] = admin.backupCodes
      ? JSON.parse(admin.backupCodes as string)
      : [];
    const index = codes.indexOf(token.toUpperCase());
    if (index !== -1) {
      isValid = true;
      codes.splice(index, 1);
      await db.adminUser.update({
        where: { id: session.adminId },
        data: { backupCodes: JSON.stringify(codes) },
      });
    }
  } else {
    if (!admin.totpSecret) {
      return NextResponse.json({ error: "TOTP not configured" }, { status: 400 });
    }
    isValid = await totpVerify(token, admin.totpSecret);
  }

  if (!isValid) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const newToken = await createAdminSession(session.adminId, true);
  cookieStore.set("admin_session", newToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return NextResponse.json({ success: true });
}
