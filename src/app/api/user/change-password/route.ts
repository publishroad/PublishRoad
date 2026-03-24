import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword } from "@/lib/server-utils";
import { changePasswordSchema } from "@/lib/validations/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, authProvider: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Can't change password for OAuth-only accounts
  if (user.authProvider !== "email" || !user.passwordHash) {
    return NextResponse.json(
      { error: "Password change is not available for OAuth accounts" },
      { status: 400 }
    );
  }

  const valid = await verifyPassword(user.passwordHash, currentPassword);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await hashPassword(newPassword);

  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      // Invalidate all sessions by updating a timestamp the JWT checks
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ success: true });
}
