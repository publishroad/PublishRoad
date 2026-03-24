import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { invalidateUserProfile } from "@/lib/cache";
import { sendEmail } from "@/lib/email";

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Soft delete — sets deletedAt so middleware filter hides the user
  await db.user.update({
    where: { id: userId },
    data: { deletedAt: new Date() },
  });

  await invalidateUserProfile(userId);

  // Send confirmation email (fire and forget)
  sendEmail({
    to: user.email,
    subject: "Your PublishRoad account has been deleted",
    text: "Your account and all associated data have been permanently deleted. We're sorry to see you go.",
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
