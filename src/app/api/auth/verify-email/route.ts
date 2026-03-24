import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const user = await db.user.findFirst({
    where: { emailVerifyToken: parsed.data.token, deletedAt: null },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Invalid or expired verification link." },
      { status: 400 }
    );
  }

  if (user.emailVerifiedAt) {
    return NextResponse.json({ success: true }); // Already verified
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
    },
  });

  return NextResponse.json({ success: true });
}
