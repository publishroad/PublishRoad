// Blog posts use ISR — force-dynamic removed to allow static generation

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatDate, normalizeImageSrc } from "@/lib/utils";
import type { Metadata } from "next";
import { SITE_NAME, buildTwitterMetadata, getCanonicalUrl, getSocialImageUrl, getSocialImages } from "@/lib/seo";

type BlogPageProps = {
  searchParams?: Promise<{ page?: string | string[] }>;
};

const topicHubs = [
  {
    title: "Launch distribution strategy",
    description: "Understand where to submit your product, how to prioritize channels, and how to turn outreach into traction.",
    href: "/pricing",
    cta: "Compare plans",
  },
  {
    title: "Done-for-you launch support",
    description: "If you want execution help, see how our team can handle submissions, guest posts, and launch logistics for you.",
    href: "/hire-us",
    cta: "Explore Hire Us",
  },
  {
    title: "Launch FAQs and workflows",
    description: "Review common questions about curations, credits, billing, and how the platform fits different launch stages.",
    href: "/faq",
    cta: "Read the FAQ",
  },
] as const;

function normalizePageNumber(value?: string | string[]): number {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue ?? "1");

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return Math.floor(parsed);
}

export async function generateMetadata({ searchParams }: BlogPageProps): Promise<Metadata> {
  const params = searchParams ? await searchParams : undefined;
  const currentPage = normalizePageNumber(params?.page);
  const canonical = currentPage > 1 ? getCanonicalUrl(`/blog?page=${currentPage}`) : getCanonicalUrl("/blog");

  return {
    title: currentPage > 1 ? `Blog — Page ${currentPage}` : "Blog — Product Launch Tips, Distribution & SEO Strategies",
    description:
      currentPage > 1
        ? `Browse page ${currentPage} of PublishRoad blog articles about product launch distribution, SEO, outreach, and growth.`
        : "Actionable guides on product launch distribution, getting your product listed on directories, guest posting, press coverage, social influencer outreach, and startup growth strategies.",
    alternates: { canonical },
    openGraph: {
      title: currentPage > 1 ? `Blog — Page ${currentPage}` : "Blog — Product Launch Tips & Distribution Strategies",
      description:
        currentPage > 1
          ? `More PublishRoad articles on launch strategy, SEO, distribution, and growth.`
          : "Guides on product distribution, directory submissions, guest posts, press releases, and launch growth strategies.",
      url: canonical,
      type: "website",
      siteName: SITE_NAME,
      images: getSocialImages("PublishRoad Blog"),
    },
    twitter: buildTwitterMetadata({
      title: currentPage > 1 ? `Blog — Page ${currentPage}` : "Blog — Product Launch Tips & Distribution Strategies",
      description:
        currentPage > 1
          ? `More PublishRoad articles on launch strategy, SEO, distribution, and growth.`
          : "Guides on product distribution, directory submissions, guest posts, press releases, and launch growth strategies.",
    }),
  };
}

export const revalidate = 60; // ISR: revalidate every 60 seconds

async function getPosts(page = 1) {
  const pageSize = 12;
  const skip = (page - 1) * pageSize;

  try {
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
  } catch (error) {
    console.error("Failed to fetch posts", error);
    return { posts: [], total: 0, pageSize };
  }
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const currentPage = normalizePageNumber(params?.page);
  const { posts, total, pageSize } = await getPosts(currentPage);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (currentPage > totalPages) {
    notFound();
  }

  const canonicalUrl = currentPage > 1 ? getCanonicalUrl(`/blog?page=${currentPage}`) : getCanonicalUrl("/blog");
  const blogCollectionSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `${SITE_NAME} Blog`,
    url: canonicalUrl,
    description: "Actionable guides on product launch distribution, SEO, outreach, and startup growth.",
    inLanguage: "en-US",
    blogPost: posts.map((post) => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: getCanonicalUrl(`/blog/${post.slug}`),
      description: post.excerpt ?? undefined,
      datePublished: post.publishDate?.toISOString(),
      author: {
        "@type": "Person",
        name: post.author.name,
      },
      image: [getSocialImageUrl(post.featuredImage ?? "/og-image.png")],
    })),
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogCollectionSchema) }}
      />
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
          <p className="text-slate-500 text-lg font-light max-w-2xl mx-auto leading-relaxed">
            Product launch tips, distribution strategies, and growth advice. Need a faster path to traction? Review our <Link href="/pricing" className="font-medium text-[var(--indigo)] hover:underline">pricing plans</Link> or let our team handle execution with <Link href="/hire-us" className="font-medium text-[var(--indigo)] hover:underline">Hire Us</Link>.
          </p>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {topicHubs.map((hub) => (
            <div
              key={hub.title}
              className="rounded-[1.5rem] bg-white p-6"
              style={{ boxShadow: "0 4px 24px rgba(91,88,246,0.06)", border: "1px solid rgba(226,232,240,0.8)" }}
            >
              <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}>
                {hub.title}
              </h2>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">{hub.description}</p>
              <Link href={hub.href} className="text-sm font-medium hover:underline" style={{ color: "var(--indigo)" }}>
                {hub.cta} →
              </Link>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}>
              Latest articles
            </h2>
            <p className="text-sm text-slate-500 mt-1">Page {currentPage} of {totalPages}</p>
          </div>
          {total > 0 && (
            <p className="text-sm text-slate-500 font-light">{total} published article{total === 1 ? "" : "s"}</p>
          )}
        </div>

        {posts.length === 0 ? (
          <div
            className="rounded-[1.5rem] bg-white p-8 text-center"
            style={{ boxShadow: "0 4px 24px rgba(91,88,246,0.06)", border: "1px solid rgba(226,232,240,0.8)" }}
          >
            <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--dark)" }}>
              Fresh guides are on the way
            </h3>
            <p className="text-slate-500 font-light max-w-2xl mx-auto">
              We&apos;re preparing more launch-distribution and SEO articles. In the meantime, you can review our <Link href="/pricing" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>pricing plans</Link>, explore the <Link href="/hire-us" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>done-for-you service</Link>, or check the <Link href="/faq" className="font-medium hover:underline" style={{ color: "var(--indigo)" }}>FAQ</Link>.
            </p>
          </div>
        ) : (
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
                {normalizeImageSrc(post.featuredImage) && (
                  <Image
                    src={normalizeImageSrc(post.featuredImage)!}
                    alt={`Featured image for ${post.title}`}
                    width={1200}
                    height={720}
                    sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
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
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Blog pagination"
            className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-[1.5rem] bg-white p-4"
            style={{ boxShadow: "0 4px 24px rgba(91,88,246,0.06)", border: "1px solid rgba(226,232,240,0.8)" }}
          >
            {currentPage > 1 ? (
              <Link href={currentPage === 2 ? "/blog" : `/blog?page=${currentPage - 1}`} className="text-sm font-medium hover:underline" style={{ color: "var(--indigo)" }}>
                ← Previous page
              </Link>
            ) : (
              <span className="text-sm text-slate-400">← Previous page</span>
            )}

            <span className="text-sm text-slate-500">Archive page {currentPage} of {totalPages}</span>

            {currentPage < totalPages ? (
              <Link href={`/blog?page=${currentPage + 1}`} className="text-sm font-medium hover:underline" style={{ color: "var(--indigo)" }}>
                Next page →
              </Link>
            ) : (
              <span className="text-sm text-slate-400">Next page →</span>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
