import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { verifyAdminSession } from "@/lib/admin-auth";
import { blogPostSchema } from "@/lib/validations/admin/blog";

async function requireAdmin() {
  const cookieStore = await cookies();
  const c = cookieStore.get("admin_session");
  if (!c) return null;
  const session = await verifyAdminSession(c.value);
  return session?.totpVerified ? session : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = blogPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const post = await db.blogPost.update({
    where: { id },
    data: {
      ...parsed.data,
      publishDate: parsed.data.publishDate ? new Date(parsed.data.publishDate) : null,
    },
  });

  // Trigger ISR revalidation
  const revalidateUrls = ["/blog", `/blog/${post.slug}`];
  for (const path of revalidateUrls) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }

  return NextResponse.json(post);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const post = await db.blogPost.delete({ where: { id } });

  fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
    method: "POST",
    headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
    body: JSON.stringify({ path: "/blog" }),
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
