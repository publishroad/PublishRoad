import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { blogPostSchema } from "@/lib/validations/admin/blog";
import { slugify } from "@/lib/utils";


export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = blogPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 422 });
  }

  const d = parsed.data;
  const post = await db.blogPost.create({
    data: {
      title: d.title,
      slug: d.slug ?? slugify(d.title),
      excerpt: d.excerpt ?? null,
      content: d.content,
      featuredImage: d.featuredImage ?? null,
      categoryId: d.categoryId ?? null,
      status: d.status,
      publishDate: d.publishDate ?? null,
      metaTitle: d.metaTitle ?? null,
      metaDescription: d.metaDescription ?? null,
      authorId: session.adminId,
    },
  });

  // Revalidate blog listing on publish
  if (parsed.data.status === "published") {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/revalidate`, {
      method: "POST",
      headers: { "x-revalidation-secret": process.env.REVALIDATION_SECRET ?? "" },
      body: JSON.stringify({ path: "/blog" }),
    }).catch(() => {});
  }

  return NextResponse.json(post, { status: 201 });
}
