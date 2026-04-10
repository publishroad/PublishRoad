import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { blogPostSchema } from "@/lib/validations/admin/blog";


export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = blogPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const existingPost = await db.blogPost.findUnique({
    where: { id },
    select: { slug: true },
  });

  const post = await db.blogPost.update({
    where: { id },
    data: {
      ...parsed.data,
      publishDate: parsed.data.publishDate ? new Date(parsed.data.publishDate) : null,
    },
  });

  // Trigger ISR revalidation
  const revalidateUrls = new Set(["/blog", `/blog/${post.slug}`]);
  if (existingPost?.slug && existingPost.slug !== post.slug) {
    revalidateUrls.add(`/blog/${existingPost.slug}`);
  }

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

  for (const path of ["/blog", `/blog/${post.slug}`]) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true });
}
