// Blog posts use ISR — force-dynamic removed to allow static generation

import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog — PublishRoad",
  description: "Product launch tips, distribution strategies, and SEO advice.",
};

export const revalidate = 60; // ISR: revalidate every 60 seconds

async function getPosts(page = 1) {
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  const [posts, total] = await Promise.all([
    db.blogPost.findMany({
      where: { status: "published", publishDate: { lte: new Date() } },
      orderBy: { publishDate: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        publishDate: true,
        author: { select: { name: true } },
      },
    }),
    db.blogPost.count({
      where: { status: "published", publishDate: { lte: new Date() } },
    }),
  ]);

  return { posts, total, pageSize };
}

export default async function BlogPage() {
  const { posts } = await getPosts();

  if (posts.length === 0) {
    return (
      <div className="min-h-screen py-20" style={{ backgroundColor: "var(--background)" }}>
        <div className="max-w-[1280px] mx-auto px-4 text-center">
          <h1
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
          >
            Blog
          </h1>
          <p className="text-slate-500 font-light">No posts yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Header */}
      <div className="bg-mesh relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
        <div className="relative text-center px-4">
          <p className="text-sm font-medium uppercase tracking-widest mb-3" style={{ color: "var(--indigo)" }}>
            Blog
          </p>
          <h1
            className="text-5xl font-bold mb-4"
            style={{ fontFamily: "var(--font-heading)", color: "var(--dark)", letterSpacing: "-0.02em" }}
          >
            Insights & Strategies
          </h1>
          <p className="text-slate-500 text-lg font-light">
            Product launch tips, distribution strategies, and growth advice.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 block"
              style={{
                boxShadow: "0 4px 24px rgba(91,88,246,0.06)",
                border: "1px solid rgba(226,232,240,0.8)",
              }}
            >
              {post.featuredImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.featuredImage}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-5">
                <h2
                  className="font-semibold text-lg mb-2 line-clamp-2"
                  style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}
                >
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="text-slate-500 text-sm mb-3 line-clamp-3 font-light">
                    {post.excerpt}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400 font-light">
                  <span>{post.author.name}</span>
                  <span>
                    {post.publishDate ? formatDate(post.publishDate) : ""}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
