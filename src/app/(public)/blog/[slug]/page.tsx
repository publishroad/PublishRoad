import Image from "next/image";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const revalidate = 3600; // ISR: 1 hour, with on-demand revalidation

interface Props {
  params: Promise<{ slug: string }>;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://publishroad.com";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  let post = null;

  try {
    post = await db.blogPost.findUnique({
      where: { slug, status: "published" },
      select: {
        title: true, metaTitle: true, metaDescription: true, excerpt: true,
        featuredImage: true, publishDate: true,
        author: { select: { name: true } },
      },
    });
  } catch {
    return {};
  }

  if (!post) return {};

  const title = post.metaTitle ?? post.title;
  const description = post.metaDescription ?? post.excerpt ?? undefined;
  const canonicalUrl = `${APP_URL}/blog/${slug}`;
  const ogImage = post.featuredImage ?? "/og-image.png";

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "article",
      publishedTime: post.publishDate?.toISOString(),
      authors: post.author?.name ? [post.author.name] : ["PublishRoad"],
      siteName: "PublishRoad",
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;

  let post = null;

  try {
    post = await db.blogPost.findUnique({
      where: { slug, status: "published" },
      include: { author: { select: { name: true } } },
    });
  } catch {
    notFound();
  }

  if (!post) notFound();

  const canonicalUrl = `${APP_URL}/blog/${slug}`;
  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? "",
    url: canonicalUrl,
    datePublished: post.publishDate?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    image: post.featuredImage ?? `${APP_URL}/og-image.png`,
    author: {
      "@type": "Person",
      name: post.author?.name ?? "PublishRoad",
    },
    publisher: {
      "@type": "Organization",
      name: "PublishRoad",
      logo: { "@type": "ImageObject", url: `${APP_URL}/favicon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: APP_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${APP_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  const sanitizedContent = sanitizeHtml(post.content, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "span"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ["href", "name", "target", "rel"],
      img: ["src", "alt", "title", "width", "height", "loading"],
      '*': ["class"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
    },
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
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
          <Image
            src={post.featuredImage}
            alt={`Featured image for ${post.title}`}
            width={1200}
            height={720}
            sizes="(min-width: 768px) 720px, 100vw"
            className="w-full rounded-[2rem] mb-10 object-cover"
            style={{ boxShadow: "0 8px 40px rgba(91,88,246,0.1)" }}
          />
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none"
          style={{ color: "var(--dark-gray)" }}
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
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
