import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 3600; // ISR: 1 hour, with on-demand revalidation

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await db.blogPost.findUnique({
    where: { slug, status: "published" },
    select: { title: true, metaTitle: true, metaDescription: true, excerpt: true },
  });

  if (!post) return {};

  return {
    title: post.metaTitle ?? post.title,
    description: post.metaDescription ?? post.excerpt ?? undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  const post = await db.blogPost.findUnique({
    where: { slug, status: "published" },
    include: { author: { select: { name: true } } },
  });

  if (!post) notFound();

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Hero header for post */}
      <div className="bg-mesh relative overflow-hidden py-16">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative max-w-[720px] mx-auto px-4 sm:px-6 text-center">
          <div className="flex items-center justify-center gap-3 text-sm text-slate-400 font-light mb-6">
            <span>{post.author.name}</span>
            <span>·</span>
            <span>{post.publishDate ? formatDate(post.publishDate) : ""}</span>
          </div>
          <h1
            className="text-4xl sm:text-5xl font-bold leading-tight"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
          >
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-slate-500 text-lg mt-4 font-light leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>
      </div>

      <article className="max-w-[720px] mx-auto px-4 sm:px-6 py-12">
        {/* Featured Image */}
        {post.featuredImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full rounded-[2rem] mb-10 object-cover"
            style={{ boxShadow: "0 8px 40px rgba(91,88,246,0.1)" }}
          />
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          style={{ color: "var(--dark-gray)" }}
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Back link */}
        <div className="mt-16 pt-8" style={{ borderTop: "1px solid rgba(226,232,240,0.8)" }}>
          <a
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: "var(--indigo)" }}
          >
            ← Back to Blog
          </a>
        </div>
      </article>
    </div>
  );
}
