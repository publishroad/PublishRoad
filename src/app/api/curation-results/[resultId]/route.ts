import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redis } from "@/lib/redis";
import { updateCurationResultSchema } from "@/lib/validations/curation";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ resultId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { resultId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateCurationResultSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 422 });
  }

  const existingResult = await db.curationResult.findUnique({
    where: { id: resultId },
    select: { id: true, curationId: true, curation: { select: { userId: true } } },
  });

  if (!existingResult) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  if (existingResult.curation.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updatedResult = await db.curationResult.update({
    where: { id: resultId },
    data: {
      userStatus: parsed.data.userStatus,
      userNotes: parsed.data.userNotes,
    },
    select: {
      id: true,
      userStatus: true,
      userNotes: true,
    },
  });

  await redis.del(`curation:${existingResult.curationId}:data`);

  return NextResponse.json(updatedResult);
}