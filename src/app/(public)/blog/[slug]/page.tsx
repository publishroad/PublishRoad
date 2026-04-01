import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import { SITE_NAME, buildTwitterMetadata, getCanonicalUrl, getSiteUrl, getSocialImageUrl, getSocialImages, stripSiteName } from "@/lib/seo";

export const revalidate = 3600; // ISR: 1 hour, with on-demand revalidation

interface Props {
  params: Promise<{ slug: string }>;
}

const APP_URL = getSiteUrl();

async function getPostMeta(slug: string) {
  try {
    return await db.blogPost.findUnique({
      where: { slug, status: "published" },
      select: {
        title: true, metaTitle: true, metaDescription: true, excerpt: true,
        featuredImage: true, publishDate: true,
        author: { select: { name: true } },
      },
    });
  } catch {
    return null;
  }
}

async function getPost(slug: string) {
  try {
    return await db.blogPost.findUnique({
      where: { slug, status: "published" },
      include: { author: { select: { name: true } } },
    });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostMeta(slug);

  if (!post) return {};

  const title = stripSiteName(post.metaTitle ?? post.title) ?? post.title;
  const description = post.metaDescription ?? post.excerpt ?? undefined;
  const canonicalUrl = getCanonicalUrl(`/blog/${slug}`);
  const ogImage = getSocialImageUrl(post.featuredImage ?? "/og-image.png");

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
      authors: post.author?.name ? [post.author.name] : [SITE_NAME],
      siteName: SITE_NAME,
      images: getSocialImages(title, ogImage),
    },
    twitter: buildTwitterMetadata({
      title,
      description,
      image: ogImage,
    }),
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPost(slug);

  if (!post) notFound();

  const canonicalUrl = getCanonicalUrl(`/blog/${slug}`);
  const socialImage = getSocialImageUrl(post.featuredImage ?? "/og-image.png");

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

  const plainTextContent = sanitizedContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainTextContent.length > 0 ? plainTextContent.split(" ").length : undefined;
  const blogPostingSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? "",
    url: canonicalUrl,
    datePublished: post.publishDate?.toISOString(),
    dateModified: post.updatedAt?.toISOString(),
    articleSection: "Product Launch Distribution",
    inLanguage: "en-US",
    isAccessibleForFree: true,
    wordCount,
    image: [socialImage],
    author: {
      "@type": "Person",
      name: post.author?.name ?? SITE_NAME,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
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

        <div className="mt-16 rounded-[1.5rem] bg-white p-6" style={{ border: "1px solid rgba(226,232,240,0.8)", boxShadow: "0 2px 16px rgba(91,88,246,0.05)" }}>
          <p className="text-sm text-slate-600 leading-relaxed">
            Want a tailored launch plan instead of doing everything manually? Compare our <Link href="/pricing" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>pricing options</Link> or see the <Link href="/hire-us" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>done-for-you launch service</Link>.
          </p>
        </div>

        {/* Back link */}
        <div className="mt-8 pt-8" style={{ borderTop: "1px solid rgba(226,232,240,0.8)" }}>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
            style={{ color: "var(--indigo)" }}
          >
            ← Back to Blog
          </Link>
        </div>
      </article>
    </div>
  );
}
