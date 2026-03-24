import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCachedWithLock, invalidateUserProfile } from "@/lib/cache";
import { updateProfileSchema } from "@/lib/validations/user";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const cacheKey = `user:${userId}:profile`;

  const profile = await getCachedWithLock(cacheKey, 300, async () => {
    return db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        authProvider: true,
        creditsRemaining: true,
        emailVerifiedAt: true,
        createdAt: true,
        plan: {
          select: { name: true, slug: true, billingType: true },
        },
      },
    });
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const body = await req.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  // Explicit allowlist — only name can be updated
  await db.user.update({
    where: { id: userId },
    data: { name: parsed.data.name },
  });

  await invalidateUserProfile(userId);

  return NextResponse.json({ success: true });
}
