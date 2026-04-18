import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { db } from "@/lib/db";
import { formatDate, normalizeImageSrc } from "@/lib/utils";
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
  const featuredImageSrc = normalizeImageSrc(post.featuredImage);
  const authorName = post.author?.name ?? SITE_NAME;
  const subtitle = post.excerpt?.trim() || "Practical product launch, SEO, and distribution guidance from PublishRoad.";

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

  const contentWithoutDuplicateH1 = sanitizedContent.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/i, "");

  const plainTextContent = sanitizedContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainTextContent.length > 0 ? plainTextContent.split(" ").length : undefined;
  const estimatedReadMinutes = wordCount ? Math.max(1, Math.ceil(wordCount / 220)) : 3;
  const publishedLabel = post.publishDate ? formatDate(post.publishDate) : "Recently updated";

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
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="relative overflow-hidden bg-mesh">
        <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />

        <div className="relative mx-auto max-w-[1280px] px-4 pb-14 pt-6 sm:px-6 sm:pb-16 sm:pt-8 lg:px-8 lg:pb-20">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue hover:underline"
          >
            ← Back to Blog
          </Link>

          <div className="mt-6">
            <div className="card-base overflow-hidden rounded-[2rem] p-3 sm:p-4 lg:p-5">
              <div className="relative aspect-[16/8] overflow-hidden rounded-[1.5rem] bg-indigo-light sm:aspect-[16/7] lg:aspect-[16/6]">
                {featuredImageSrc ? (
                  <Image
                    src={featuredImageSrc}
                    alt={`Featured image for ${post.title}`}
                    fill
                    sizes="(min-width: 1280px) 1120px, 100vw"
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(91,88,246,0.18),transparent_55%),linear-gradient(135deg,#ffffff_0%,#eef0fe_100%)] p-8 text-center">
                    <div>
                      <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue">PublishRoad</p>
                      <p className="mt-3 text-3xl font-semibold text-navy sm:text-4xl" style={{ fontFamily: "var(--font-heading)" }}>
                        Launch smarter.
                      </p>
                    </div>
                  </div>
                )}
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(91,88,246,0.12),transparent_45%,rgba(2,6,23,0.08))]" />
              </div>

              <div className="px-3 pb-4 pt-5 text-center sm:px-6 sm:pb-5 lg:px-8 lg:pt-6">
                <h1
                  className="text-3xl font-bold leading-[1.08] tracking-[-0.03em] text-navy sm:text-4xl lg:text-5xl"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {post.title}
                </h1>

                <p className="mx-auto mt-3 max-w-2xl text-sm font-light leading-7 text-medium-gray sm:text-base">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 -mt-4 pb-16 sm:-mt-6 sm:pb-20 lg:-mt-8">
        <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start xl:grid-cols-[minmax(0,1fr)_320px]">
            <article className="card-base rounded-[2rem] p-6 sm:p-8 lg:p-10">
              <div
                className="blog-article-content max-w-none"
                dangerouslySetInnerHTML={{ __html: contentWithoutDuplicateH1 }}
              />
            </article>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <div className="card-base rounded-[1.5rem] p-5 sm:p-6">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue">Ready to launch?</p>
                <h2 className="mt-2 text-xl font-semibold text-navy" style={{ fontFamily: "var(--font-heading)" }}>
                  It&apos;s not luck to be successful.
                </h2>
                <p className="mt-3 text-sm leading-6 text-medium-gray">
                  Generate your tailored launch distribution plan in minutes using our AI specialised tool for Free, No Card Needed.
                </p>
                <div className="mt-5 flex flex-col gap-3">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-full bg-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:opacity-95"
                  >
                    Try for Free
                  </Link>
                  <Link
                    href="/hire-us"
                    className="inline-flex items-center justify-center rounded-full border border-border-gray bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Done-for-you service
                  </Link>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-border-gray bg-white p-5 shadow-[0_4px_20px_rgba(91,88,246,0.06)] sm:p-6">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-medium-gray">Quick facts</p>
                <dl className="mt-4 space-y-3 text-sm text-medium-gray">
                  <div className="flex items-start justify-between gap-3">
                    <dt>Published</dt>
                    <dd className="text-right text-dark-gray">{publishedLabel}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt>Author</dt>
                    <dd className="text-right text-dark-gray">{authorName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt>Reading time</dt>
                    <dd className="text-right text-dark-gray">{estimatedReadMinutes} min</dd>
                  </div>
                  {wordCount ? (
                    <div className="flex items-start justify-between gap-3">
                      <dt>Word count</dt>
                      <dd className="text-right text-dark-gray">{wordCount.toLocaleString()}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>
            </aside>
          </div>

          <div className="mt-8 sm:mt-10">
            <div className="overflow-hidden rounded-[2rem] bg-navy px-6 py-8 text-white shadow-[0_18px_40px_rgba(2,6,23,0.18)] sm:px-8 lg:px-10 lg:py-10">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">Next step</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl" style={{ fontFamily: "var(--font-heading)" }}>
                    Ready to get your product the attention it deserves?
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">
                    Don&apos;t let your launch go unnoticed. Use our AI-powered tools to build your own strategy for FREE, or let the PublishRoad team handle the entire execution for you.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/pricing"
                    className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-navy transition-colors hover:bg-slate-100"
                  >
                    Try for Free
                  </Link>
                  <Link
                    href="/hire-us"
                    className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                  >
                    Hire us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
