#!/usr/bin/env tsx
/**
 * Curation seed data — covers all 6 curation sections:
 *   Step 1 (A): Distribution sites      — product directories, listing sites
 *   Step 2 (B): Guest Post & Backlinks  — blogs, publications
 *   Step 3 (C): Press Release Sites     — PR platforms, news
 *   Step 4 (D): Social Influencers      — TikTok / Instagram / YouTube / Twitter
 *   Step 5 (E): Reddit Communities      — subreddits
 *   Step 6 (F): Investors & Funds       — VCs, angel investors
 *
 * Run: npx tsx --env-file=.env.local scripts/seed-curation-data.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaPg } = require("@prisma/adapter-pg");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

// ─── helpers ─────────────────────────────────────────────────────────────────

async function upsertTag(slug: string, name: string) {
  return db.tag.upsert({ where: { slug }, create: { slug, name, isActive: true }, update: { name } });
}

async function upsertCategory(slug: string, name: string, description?: string) {
  return db.category.upsert({
    where: { slug },
    create: { slug, name, description: description ?? null, isActive: true },
    update: { name },
  });
}

async function upsertCountry(slug: string, name: string, flagEmoji: string) {
  return db.country.upsert({ where: { slug }, create: { slug, name, flagEmoji, isActive: true }, update: {} });
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding curation test data...\n");

  // ── 1. Tags ───────────────────────────────────────────────────────────────
  const tagDefs = [
    ["saas", "SaaS"], ["startup", "Startup"], ["tech", "Tech"], ["ai", "AI"],
    ["b2b", "B2B"], ["b2c", "B2C"], ["marketing", "Marketing"], ["product", "Product"],
    ["press", "Press"], ["developer", "Developer"], ["design", "Design"],
    ["growth", "Growth"], ["content", "Content"], ["social-media", "Social Media"],
    ["ecommerce", "E-commerce"], ["fintech", "Fintech"], ["productivity", "Productivity"],
    ["analytics", "Analytics"], ["crm", "CRM"], ["api", "API"],
    ["mobile", "Mobile"], ["web", "Web"], ["crypto", "Crypto"],
    ["education", "Education"], ["health", "Health"], ["hr", "HR"],
    ["vc", "VC"], ["seed", "Seed"], ["pre-seed", "Pre-Seed"], ["series-a", "Series A"],
    ["india", "India"], ["usa", "USA"], ["global", "Global"],
    ["indie-hacker", "Indie Hacker"], ["no-code", "No-Code"], ["open-source", "Open Source"],
  ];
  const tagMap: Record<string, string> = {}; // slug → id
  for (const [slug, name] of tagDefs) {
    const t = await upsertTag(slug, name);
    tagMap[slug] = t.id;
  }
  console.log(`✅  ${tagDefs.length} tags seeded`);

  // ── 2. Categories ─────────────────────────────────────────────────────────
  const catDefs: [string, string, string][] = [
    ["technology",  "Technology",  "Software, hardware, and emerging tech"],
    ["business",    "Business",    "Business tools and operations"],
    ["marketing",   "Marketing",   "Marketing and growth tools"],
    ["startup",     "Startup",     "Early-stage companies and founder resources"],
    ["saas",        "SaaS",        "Software-as-a-service products"],
    ["ecommerce",   "E-commerce",  "Online retail and shopping"],
    ["fintech",     "Fintech",     "Financial technology and payments"],
    ["education",   "Education",   "Ed-tech and learning platforms"],
    ["health",      "Health",      "Health and wellness technology"],
    ["developer",   "Developer",   "Tools for software developers"],
  ];
  const catMap: Record<string, string> = {}; // slug → id
  for (const [slug, name, description] of catDefs) {
    const c = await upsertCategory(slug, name, description);
    catMap[slug] = c.id;
  }
  console.log(`✅  ${catDefs.length} categories seeded`);

  // ── 3. Countries ──────────────────────────────────────────────────────────
  const countryDefs: [string, string, string][] = [
    ["global",          "Global",          "🌍"],
    ["united-states",   "United States",   "🇺🇸"],
    ["united-kingdom",  "United Kingdom",  "🇬🇧"],
    ["india",           "India",           "🇮🇳"],
    ["canada",          "Canada",          "🇨🇦"],
    ["australia",       "Australia",       "🇦🇺"],
    ["germany",         "Germany",         "🇩🇪"],
    ["singapore",       "Singapore",       "🇸🇬"],
  ];
  const countryMap: Record<string, string> = {}; // slug → id
  for (const [slug, name, flagEmoji] of countryDefs) {
    const c = await upsertCountry(slug, name, flagEmoji);
    countryMap[slug] = c.id;
  }
  console.log(`✅  ${countryDefs.length} countries seeded`);

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: create/update a website and sync its tags + categories
  // ─────────────────────────────────────────────────────────────────────────
  async function upsertWebsite(data: {
    name: string; url: string; type: "distribution" | "guest_post" | "press_release";
    da: number; pa: number; spamScore: number; traffic: number;
    description: string; countrySlug?: string; categorySlugs?: string[]; tagSlugs?: string[];
    isPinned?: boolean;
  }) {
    const countryId = data.countrySlug ? countryMap[data.countrySlug] : null;
    const categoryId = data.categorySlugs?.[0] ? catMap[data.categorySlugs[0]] : null;
    const tagSlugArr = data.tagSlugs ?? [];

    const website = await db.website.upsert({
      where: { url: data.url },
      create: {
        name: data.name, url: data.url, type: data.type,
        da: data.da, pa: data.pa, spamScore: data.spamScore, traffic: data.traffic,
        description: data.description,
        countryId, categoryId, tagSlugs: tagSlugArr,
        isActive: true, isPinned: data.isPinned ?? false, isExcluded: false,
      },
      update: {
        name: data.name, type: data.type, da: data.da, pa: data.pa,
        spamScore: data.spamScore, traffic: data.traffic,
        description: data.description, countryId, categoryId, tagSlugs: tagSlugArr,
      },
    });

    // Sync tags junction
    await db.websiteTag.deleteMany({ where: { websiteId: website.id } });
    if (tagSlugArr.length > 0) {
      const tagIds = tagSlugArr.map((s) => tagMap[s]).filter(Boolean);
      await db.websiteTag.createMany({
        data: tagIds.map((tagId) => ({ websiteId: website.id, tagId })),
        skipDuplicates: true,
      });
    }

    // Sync categories junction
    await db.websiteCategory.deleteMany({ where: { websiteId: website.id } });
    if (data.categorySlugs && data.categorySlugs.length > 0) {
      const catIds = data.categorySlugs.map((s) => catMap[s]).filter(Boolean);
      await db.websiteCategory.createMany({
        data: catIds.map((categoryId) => ({ websiteId: website.id, categoryId })),
        skipDuplicates: true,
      });
    }

    return website;
  }

  // ── 4. Websites — Step 1 (A): Distribution sites ─────────────────────────
  const distributionSites = [
    { name: "Product Hunt",      url: "https://producthunt.com",          da: 90, pa: 84, spamScore: 2, traffic: 4200000, description: "The best new products in tech. Submit your product to reach early adopters and get community upvotes. Ideal for SaaS, apps, and dev tools.", categorySlugs: ["technology", "startup"], tagSlugs: ["saas", "startup", "product", "tech", "b2b"] },
    { name: "Hacker News",       url: "https://news.ycombinator.com",     da: 91, pa: 87, spamScore: 1, traffic: 5100000, description: "Y Combinator's social news for the tech and startup community. High-quality audience of developers, founders, and investors.", categorySlugs: ["technology", "developer"], tagSlugs: ["startup", "tech", "developer", "b2b", "saas"] },
    { name: "BetaList",          url: "https://betalist.com",             da: 66, pa: 58, spamScore: 3, traffic: 280000,  description: "Discover and get early access to tomorrow's startups. Submit your product before launch for beta testers and early adopters.", categorySlugs: ["startup"],               tagSlugs: ["startup", "saas", "product", "b2c"] },
    { name: "Indie Hackers",     url: "https://indiehackers.com",         da: 76, pa: 68, spamScore: 2, traffic: 1800000, description: "Community for bootstrapped and independent founders. Share your product, revenue milestones, and get feedback from fellow makers.", categorySlugs: ["startup", "saas"],      tagSlugs: ["indie-hacker", "startup", "saas", "product"] },
    { name: "AppSumo",           url: "https://appsumo.com",              da: 77, pa: 69, spamScore: 4, traffic: 2300000, description: "Marketplace for software deals. List your SaaS product to reach deal-hunters and early adopters willing to pay lifetime deals.", categorySlugs: ["saas", "business"],     tagSlugs: ["saas", "b2b", "startup", "productivity"] },
    { name: "G2",                url: "https://g2.com",                   da: 89, pa: 82, spamScore: 3, traffic: 7800000, description: "Leading software review platform. List your SaaS product for user reviews, comparisons, and B2B buyer discovery.", categorySlugs: ["saas", "business"],     tagSlugs: ["saas", "b2b", "crm", "marketing", "analytics"] },
    { name: "Capterra",          url: "https://capterra.com",             da: 88, pa: 80, spamScore: 3, traffic: 6500000, description: "Business software discovery platform. Get found by SMBs actively looking for your category of software.", categorySlugs: ["business", "saas"],     tagSlugs: ["b2b", "saas", "crm", "hr", "marketing"] },
    { name: "AlternativeTo",     url: "https://alternativeto.net",        da: 82, pa: 75, spamScore: 2, traffic: 3200000, description: "Software alternative discovery site. List your product as an alternative to established tools to capture competitor's audience.", categorySlugs: ["technology"],           tagSlugs: ["saas", "tech", "open-source", "developer"] },
    { name: "GetApp",            url: "https://getapp.com",               da: 87, pa: 79, spamScore: 3, traffic: 4900000, description: "Business app discovery platform. Get featured in category comparisons for SMB software buyers.", categorySlugs: ["business", "saas"],     tagSlugs: ["b2b", "saas", "crm", "analytics"] },
    { name: "SaaSHub",           url: "https://saashub.com",              da: 65, pa: 57, spamScore: 2, traffic: 420000,  description: "SaaS product discovery platform. List your tool to be found by users searching in your category.", categorySlugs: ["saas"],                  tagSlugs: ["saas", "b2b", "startup"] },
    { name: "Launching Next",    url: "https://launchingnext.com",        da: 51, pa: 44, spamScore: 4, traffic: 85000,   description: "Community for launching startups. Submit your startup to get early exposure and feedback.", categorySlugs: ["startup"],               tagSlugs: ["startup", "product", "b2c"] },
    { name: "StackShare",        url: "https://stackshare.io",            da: 71, pa: 64, spamScore: 2, traffic: 950000,  description: "Tech stack sharing community for developers. Ideal for dev tools, APIs, and infrastructure products.", categorySlugs: ["developer", "technology"], tagSlugs: ["developer", "api", "tech", "saas"] },
    { name: "Software Advice",   url: "https://softwareadvice.com",       da: 85, pa: 77, spamScore: 3, traffic: 5200000, description: "Software recommendation site for businesses. Get listed to reach buyers looking for solutions in your category.", categorySlugs: ["business", "saas"],     tagSlugs: ["b2b", "saas", "crm", "hr"] },
    { name: "Slant",             url: "https://slant.co",                 da: 72, pa: 64, spamScore: 3, traffic: 740000,  description: "Product comparison platform. Get listed to appear in comparisons with competitors in your category.", categorySlugs: ["technology"],           tagSlugs: ["tech", "saas", "developer"] },
    { name: "There's An AI For That", url: "https://theresanaiforthat.com", da: 68, pa: 60, spamScore: 2, traffic: 1200000, description: "Directory for AI-powered tools. Essential submission for any product with AI features.", categorySlugs: ["technology", "saas"],  tagSlugs: ["ai", "saas", "tech", "productivity"] },
  ];

  for (const s of distributionSites) {
    await upsertWebsite({ ...s, type: "distribution", countrySlug: "global" });
  }
  console.log(`✅  ${distributionSites.length} distribution sites (Step 1 / Section A)`);

  // ── 5. Websites — Step 2 (B): Guest Post & Backlinks ─────────────────────
  const guestPostSites = [
    { name: "Medium",               url: "https://medium.com",               da: 95, pa: 89, spamScore: 2, traffic: 130000000, description: "World's largest publishing platform. Write articles for startup, tech, and business audiences. High domain authority for backlinks.", categorySlugs: ["technology", "business"], tagSlugs: ["content", "marketing", "startup", "saas", "tech"] },
    { name: "Dev.to",               url: "https://dev.to",                   da: 82, pa: 75, spamScore: 1, traffic: 4500000,   description: "Developer community for sharing articles, tutorials, and opinions. Excellent for developer-focused products and open-source tools.", categorySlugs: ["developer"],              tagSlugs: ["developer", "open-source", "tech", "api", "web"] },
    { name: "HubSpot Blog",         url: "https://blog.hubspot.com",         da: 93, pa: 86, spamScore: 2, traffic: 12000000,  description: "Leading marketing and sales blog. Guest posts reach millions of marketers and business owners actively looking for tools.", categorySlugs: ["marketing", "business"],  tagSlugs: ["marketing", "b2b", "crm", "growth", "content"] },
    { name: "SaaStr",               url: "https://saastr.com",               da: 72, pa: 65, spamScore: 3, traffic: 820000,    description: "The world's largest SaaS community. Guest posts and articles for B2B SaaS founders, executives, and investors.", categorySlugs: ["saas", "startup"],        tagSlugs: ["saas", "b2b", "startup", "vc", "growth"] },
    { name: "Entrepreneur",         url: "https://entrepreneur.com",         da: 91, pa: 84, spamScore: 2, traffic: 8500000,   description: "Business and entrepreneurship publication. Submit guest articles to reach entrepreneurs, founders, and small business owners.", categorySlugs: ["business", "startup"],    tagSlugs: ["startup", "business", "marketing", "growth"] },
    { name: "Hackernoon",           url: "https://hackernoon.com",           da: 81, pa: 73, spamScore: 3, traffic: 3200000,   description: "Technology stories and opinions for hackers and developers. Great for dev tools, APIs, and technical SaaS products.", categorySlugs: ["technology", "developer"], tagSlugs: ["tech", "developer", "saas", "ai", "crypto"] },
    { name: "Smashing Magazine",    url: "https://smashingmagazine.com",     da: 90, pa: 83, spamScore: 1, traffic: 4800000,   description: "Premier web design and development publication. Excellent for design tools, UI libraries, and developer productivity products.", categorySlugs: ["developer", "design"],    tagSlugs: ["design", "developer", "web", "no-code"] },
    { name: "Moz Blog",             url: "https://moz.com/blog",             da: 92, pa: 85, spamScore: 1, traffic: 5200000,   description: "SEO and digital marketing blog. Guest posts reach SEO professionals and digital marketers seeking tools and strategies.", categorySlugs: ["marketing"],              tagSlugs: ["marketing", "seo", "growth", "content", "b2b"] },
    { name: "Search Engine Journal", url: "https://searchenginejournal.com", da: 88, pa: 81, spamScore: 2, traffic: 4200000,   description: "Search marketing and SEO publication. Submit guest posts to reach digital marketing professionals.", categorySlugs: ["marketing"],              tagSlugs: ["marketing", "content", "b2b", "growth"] },
    { name: "Copyblogger",          url: "https://copyblogger.com",          da: 82, pa: 75, spamScore: 2, traffic: 1100000,   description: "Content marketing and copywriting authority. Guest posts reach content creators and marketers.", categorySlugs: ["marketing"],              tagSlugs: ["content", "marketing", "growth"] },
    { name: "CSS-Tricks",           url: "https://css-tricks.com",           da: 89, pa: 82, spamScore: 1, traffic: 3600000,   description: "Frontend web development tutorials and resources. Ideal for UI libraries, CSS tools, and developer products.", categorySlugs: ["developer"],              tagSlugs: ["developer", "design", "web", "open-source"] },
    { name: "A List Apart",         url: "https://alistapart.com",           da: 87, pa: 80, spamScore: 1, traffic: 1200000,   description: "Web design and development publication for professionals. Guest posts for design-forward products.", categorySlugs: ["developer", "design"],    tagSlugs: ["design", "web", "developer"] },
    { name: "Neil Patel Blog",      url: "https://neilpatel.com/blog",       da: 90, pa: 83, spamScore: 3, traffic: 6800000,   description: "Digital marketing and SEO blog by Neil Patel. Massive audience of small business owners and marketers.", categorySlugs: ["marketing"],              tagSlugs: ["marketing", "seo", "growth", "b2b", "content"] },
    { name: "Inc.com",              url: "https://inc.com",                  da: 91, pa: 84, spamScore: 2, traffic: 9200000,   description: "Business media for entrepreneurs and business owners. Submit articles to reach decision-makers and startup founders.", categorySlugs: ["business", "startup"],    tagSlugs: ["startup", "business", "growth", "b2b"] },
    { name: "Towards Data Science", url: "https://towardsdatascience.com",   da: 85, pa: 78, spamScore: 2, traffic: 5100000,   description: "Medium publication focused on data science and AI. Submit technical tutorials for AI, analytics, and data products.", categorySlugs: ["technology", "developer"], tagSlugs: ["ai", "analytics", "developer", "tech"] },
  ];

  for (const s of guestPostSites) {
    await upsertWebsite({ ...s, type: "guest_post", countrySlug: "global" });
  }
  console.log(`✅  ${guestPostSites.length} guest post sites   (Step 2 / Section B)`);

  // ── 6. Websites — Step 3 (C): Press Release Sites ────────────────────────
  const pressReleaseSites = [
    { name: "TechCrunch",       url: "https://techcrunch.com",         da: 93, pa: 87, spamScore: 2, traffic: 22000000,  description: "World-leading tech media. Covers startup launches, funding rounds, and product announcements. High impact press coverage.", categorySlugs: ["technology", "startup"],  tagSlugs: ["tech", "startup", "press", "vc", "saas"], isPinned: true },
    { name: "Forbes",           url: "https://forbes.com",             da: 94, pa: 88, spamScore: 2, traffic: 78000000,  description: "Global business and finance media. Cover startup stories, CEO profiles, and technology innovation articles.", categorySlugs: ["business"],               tagSlugs: ["business", "startup", "press", "vc", "b2b"] },
    { name: "VentureBeat",      url: "https://venturebeat.com",        da: 88, pa: 81, spamScore: 2, traffic: 6200000,   description: "Transformative tech media for enterprise and startup. Covers AI, cloud, and enterprise software launches.", categorySlugs: ["technology"],             tagSlugs: ["tech", "ai", "saas", "press", "b2b"] },
    { name: "Wired",            url: "https://wired.com",              da: 92, pa: 86, spamScore: 1, traffic: 14000000,  description: "In-depth coverage of technology's impact on culture, business, and politics. Premium placement for innovative products.", categorySlugs: ["technology"],             tagSlugs: ["tech", "press", "ai", "crypto", "design"] },
    { name: "Fast Company",     url: "https://fastcompany.com",        da: 91, pa: 85, spamScore: 2, traffic: 8200000,   description: "Media brand that focuses on technology, business, and design. Covers innovation, leadership, and entrepreneurship stories.", categorySlugs: ["business", "startup"],    tagSlugs: ["startup", "press", "design", "business", "growth"] },
    { name: "PR Newswire",      url: "https://prnewswire.com",         da: 91, pa: 84, spamScore: 4, traffic: 11000000,  description: "Premier press release distribution service. Distributes your announcement to thousands of journalists, newsrooms, and syndication partners.", categorySlugs: ["business"],               tagSlugs: ["press", "b2b", "startup", "global"] },
    { name: "Business Wire",    url: "https://businesswire.com",       da: 92, pa: 85, spamScore: 3, traffic: 7800000,   description: "Berkshire Hathaway-owned press release distribution platform. Industry standard for official company announcements.", categorySlugs: ["business"],               tagSlugs: ["press", "b2b", "startup", "fintech", "global"] },
    { name: "The Verge",        url: "https://theverge.com",           da: 93, pa: 87, spamScore: 2, traffic: 19000000,  description: "Tech and consumer electronics media. Covers product launches, reviews, and tech culture stories for mainstream tech audiences.", categorySlugs: ["technology"],             tagSlugs: ["tech", "press", "mobile", "ai", "design"] },
    { name: "Mashable",         url: "https://mashable.com",           da: 91, pa: 84, spamScore: 3, traffic: 13000000,  description: "Digital media and entertainment for tech-savvy consumers. Covers startups, social media, and consumer technology.", categorySlugs: ["technology"],             tagSlugs: ["tech", "social-media", "press", "b2c", "startup"] },
    { name: "TNW",              url: "https://thenextweb.com",         da: 87, pa: 80, spamScore: 2, traffic: 5400000,   description: "International technology news and events. European tech startup coverage with global reach.", categorySlugs: ["technology", "startup"],  tagSlugs: ["tech", "startup", "press", "ai", "fintech"] },
    { name: "Globe Newswire",   url: "https://globenewswire.com",      da: 88, pa: 81, spamScore: 3, traffic: 8900000,   description: "Global press release distribution service. Reach financial journalists, investors, and industry analysts worldwide.", categorySlugs: ["business"],               tagSlugs: ["press", "b2b", "vc", "fintech", "global"] },
    { name: "PRWeb",            url: "https://prweb.com",              da: 81, pa: 74, spamScore: 4, traffic: 3200000,   description: "Affordable press release distribution for startups. Good SEO value and syndication to news aggregators.", categorySlugs: ["business", "startup"],    tagSlugs: ["press", "startup", "b2b", "saas"] },
    { name: "Engadget",         url: "https://engadget.com",           da: 91, pa: 84, spamScore: 2, traffic: 12000000,  description: "Consumer electronics and technology media. Covers hardware, software, and startup product launches.", categorySlugs: ["technology"],             tagSlugs: ["tech", "press", "mobile", "developer"] },
    { name: "ReadWrite",        url: "https://readwrite.com",          da: 79, pa: 72, spamScore: 4, traffic: 2100000,   description: "Internet of Things and connected technology media. Covers IoT, cloud, and startup product stories.", categorySlugs: ["technology"],             tagSlugs: ["tech", "press", "saas", "api", "startup"] },
    { name: "Betakit",          url: "https://betakit.com",            da: 67, pa: 60, spamScore: 3, traffic: 420000,    description: "Canadian startup and technology media. Best for products targeting Canadian market or with Canadian founders.", categorySlugs: ["startup", "technology"],  tagSlugs: ["startup", "press", "tech", "canada"] },
  ];

  for (const s of pressReleaseSites) {
    await upsertWebsite({ ...s, type: "press_release", countrySlug: "global" });
  }
  console.log(`✅  ${pressReleaseSites.length} press release sites (Step 3 / Section C)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: upsert an influencer and sync tags + categories
  // ─────────────────────────────────────────────────────────────────────────
  async function upsertInfluencer(data: {
    name: string; platform: "tiktok" | "instagram" | "youtube" | "twitter";
    followersCount: number; profileLink: string; email?: string;
    description: string; countrySlug?: string;
    categorySlugs: string[]; tagSlugs: string[];
  }) {
    const countryId = data.countrySlug ? countryMap[data.countrySlug] : null;
    const catSlugs = data.categorySlugs.filter((s) => catMap[s]);
    const tagSlugArr = data.tagSlugs.filter((s) => tagMap[s]);

    const existing = await db.influencer.findFirst({ where: { profileLink: data.profileLink } });
    const payload = {
      name: data.name, platform: data.platform,
      followersCount: data.followersCount, profileLink: data.profileLink,
      email: data.email ?? null, description: data.description,
      countryId, categorySlugs: catSlugs, tagSlugs: tagSlugArr, isActive: true,
    };
    const influencer = existing
      ? await db.influencer.update({ where: { id: existing.id }, data: payload })
      : await db.influencer.create({ data: payload });

    // Sync tags junction
    await db.influencerTag.deleteMany({ where: { influencerId: influencer.id } });
    if (tagSlugArr.length > 0) {
      const tagIds = tagSlugArr.map((s) => tagMap[s]).filter(Boolean);
      await db.influencerTag.createMany({
        data: tagIds.map((tagId) => ({ influencerId: influencer.id, tagId })),
        skipDuplicates: true,
      });
    }

    // Sync categories junction
    await db.influencerCategory.deleteMany({ where: { influencerId: influencer.id } });
    if (catSlugs.length > 0) {
      const catIds = catSlugs.map((s) => catMap[s]).filter(Boolean);
      await db.influencerCategory.createMany({
        data: catIds.map((categoryId) => ({ influencerId: influencer.id, categoryId })),
        skipDuplicates: true,
      });
    }

    return influencer;
  }

  // ── 7. Influencers — Step 4 (D) ───────────────────────────────────────────
  const influencers = [
    { name: "Rand Fishkin",     platform: "twitter"   as const, followersCount: 452000,   profileLink: "https://twitter.com/randfish",        description: "Co-founder of Moz and SparkToro. Covers SEO, marketing, and SaaS industry insights. Audience: marketers, SaaS founders.", countrySlug: "united-states", categorySlugs: ["marketing", "saas"],     tagSlugs: ["marketing", "saas", "b2b", "growth", "content"] },
    { name: "Pieter Levels",    platform: "twitter"   as const, followersCount: 524000,   profileLink: "https://twitter.com/levelsio",         description: "Indie hacker who built multiple profitable products. Covers bootstrapping, indie hacking, and building in public.", countrySlug: "global",         categorySlugs: ["startup", "saas"],       tagSlugs: ["indie-hacker", "saas", "startup", "b2c", "no-code"] },
    { name: "Justin Welsh",     platform: "twitter"   as const, followersCount: 862000,   profileLink: "https://twitter.com/thejustinwelsh",   description: "Solopreneur who built a $5M business. Covers B2B SaaS, LinkedIn growth, and solopreneurship. Audience: B2B founders.", countrySlug: "united-states", categorySlugs: ["saas", "marketing"],     tagSlugs: ["saas", "b2b", "startup", "content", "growth"] },
    { name: "Lenny Rachitsky",  platform: "twitter"   as const, followersCount: 295000,   profileLink: "https://twitter.com/lennysan",          description: "Ex-Airbnb PM turned newsletter writer. Covers product strategy, growth, and SaaS metrics. Audience: product managers.", countrySlug: "united-states", categorySlugs: ["saas", "business"],      tagSlugs: ["saas", "product", "growth", "b2b", "analytics"] },
    { name: "Hiten Shah",       platform: "twitter"   as const, followersCount: 314000,   profileLink: "https://twitter.com/hnshah",            description: "SaaS founder (Crazy Egg, FYI, Product Habits). Covers SaaS product strategy, growth, and customer success.", countrySlug: "united-states", categorySlugs: ["saas", "startup"],       tagSlugs: ["saas", "startup", "b2b", "product", "growth"] },
    { name: "Gary Vaynerchuk",  platform: "instagram" as const, followersCount: 10200000, profileLink: "https://instagram.com/garyvee",         description: "Serial entrepreneur and media personality. Covers marketing, social media, and entrepreneurship to massive business audience.", countrySlug: "united-states", categorySlugs: ["marketing", "business"], tagSlugs: ["marketing", "b2c", "social-media", "startup", "content"] },
    { name: "Alex Hormozi",     platform: "instagram" as const, followersCount: 6800000,  profileLink: "https://instagram.com/hormozi",         description: "$100M+ entrepreneur. Covers business acquisition, scaling, and offer creation. Massive audience of entrepreneurs.", countrySlug: "united-states", categorySlugs: ["business", "startup"],   tagSlugs: ["business", "b2b", "startup", "growth", "marketing"] },
    { name: "Marie Forleo",     platform: "instagram" as const, followersCount: 890000,   profileLink: "https://instagram.com/marieforleo",    description: "Entrepreneur and author of Everything is Figureoutable. Covers business, creativity, and online entrepreneurship for women.", countrySlug: "united-states", categorySlugs: ["business", "marketing"], tagSlugs: ["business", "b2c", "content", "marketing", "startup"] },
    { name: "Neil Patel",       platform: "youtube"   as const, followersCount: 1400000,  profileLink: "https://youtube.com/@neilpatel",        description: "Digital marketing expert. Covers SEO, content marketing, and business growth. Audience: marketers and business owners worldwide.", countrySlug: "united-states", categorySlugs: ["marketing"],             tagSlugs: ["marketing", "seo", "growth", "b2b", "content"] },
    { name: "Ali Abdaal",       platform: "youtube"   as const, followersCount: 5200000,  profileLink: "https://youtube.com/@aliabdaal",        description: "Doctor-turned-creator covering productivity, tech, and business. Audience: young professionals and students interested in tech tools.", countrySlug: "united-kingdom", categorySlugs: ["education", "technology"], tagSlugs: ["productivity", "tech", "b2c", "saas", "developer"] },
    { name: "Pat Flynn",        platform: "youtube"   as const, followersCount: 375000,   profileLink: "https://youtube.com/@patflynn",         description: "Passive income expert and founder of Smart Passive Income. Covers online business, affiliate marketing, and SaaS tools.", countrySlug: "united-states", categorySlugs: ["business", "startup"],   tagSlugs: ["startup", "b2c", "content", "saas", "indie-hacker"] },
    { name: "Ankur Warikoo",    platform: "instagram" as const, followersCount: 4200000,  profileLink: "https://instagram.com/ankurwarikoo",    description: "Indian entrepreneur and angel investor. Covers startup ecosystem, personal finance, and entrepreneurship for Indian audience.", countrySlug: "india",          categorySlugs: ["startup", "business"],   tagSlugs: ["startup", "india", "b2c", "fintech", "education"] },
    { name: "Nikhil Kamath",    platform: "twitter"   as const, followersCount: 1100000,  profileLink: "https://twitter.com/nikhilkamathcio",   description: "Indian entrepreneur and investor (Zerodha co-founder). Covers fintech, investing, and Indian startup ecosystem.", countrySlug: "india",          categorySlugs: ["fintech", "startup"],    tagSlugs: ["fintech", "india", "startup", "vc", "b2b"] },
    { name: "David Perell",     platform: "twitter"   as const, followersCount: 468000,   profileLink: "https://twitter.com/david_perell",      description: "Online writing teacher and essayist. Covers content creation, writing, and building an online audience for knowledge businesses.", countrySlug: "united-states", categorySlugs: ["education", "marketing"], tagSlugs: ["content", "education", "b2c", "marketing", "saas"] },
    { name: "Sam Parr",         platform: "twitter"   as const, followersCount: 342000,   profileLink: "https://twitter.com/theSamParr",        description: "Founder of The Hustle (acquired by HubSpot). Covers startup ideas, business analysis, and entrepreneurship for ambitious founders.", countrySlug: "united-states", categorySlugs: ["startup", "business"],   tagSlugs: ["startup", "b2b", "saas", "growth", "marketing"] },
  ];

  for (const inf of influencers) {
    await upsertInfluencer(inf);
  }
  console.log(`✅  ${influencers.length} influencers        (Step 4 / Section D)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: upsert a reddit channel and sync tags + categories
  // ─────────────────────────────────────────────────────────────────────────
  async function upsertRedditChannel(data: {
    name: string; url: string; totalMembers: number; weeklyVisitors: number;
    postingDifficulty: "easy" | "medium" | "hard";
    description: string; categorySlugs: string[]; tagSlugs: string[];
  }) {
    const catSlugs = data.categorySlugs.filter((s) => catMap[s]);
    const tagSlugArr = data.tagSlugs.filter((s) => tagMap[s]);

    const payload = {
      name: data.name, url: data.url,
      totalMembers: data.totalMembers, weeklyVisitors: data.weeklyVisitors,
      postingDifficulty: data.postingDifficulty, description: data.description,
      categorySlugs: catSlugs, tagSlugs: tagSlugArr, isActive: true,
    };
    const channel = await db.redditChannel.upsert({
      where: { url: data.url },
      create: payload,
      update: { name: payload.name, totalMembers: payload.totalMembers, weeklyVisitors: payload.weeklyVisitors, postingDifficulty: payload.postingDifficulty, description: payload.description, categorySlugs: payload.categorySlugs, tagSlugs: payload.tagSlugs },
    });

    // Sync tags
    await db.redditChannelTag.deleteMany({ where: { redditChannelId: channel.id } });
    if (tagSlugArr.length > 0) {
      const tagIds = tagSlugArr.map((s) => tagMap[s]).filter(Boolean);
      await db.redditChannelTag.createMany({
        data: tagIds.map((tagId) => ({ redditChannelId: channel.id, tagId })),
        skipDuplicates: true,
      });
    }

    // Sync categories
    await db.redditChannelCategory.deleteMany({ where: { redditChannelId: channel.id } });
    if (catSlugs.length > 0) {
      const catIds = catSlugs.map((s) => catMap[s]).filter(Boolean);
      await db.redditChannelCategory.createMany({
        data: catIds.map((categoryId) => ({ redditChannelId: channel.id, categoryId })),
        skipDuplicates: true,
      });
    }

    return channel;
  }

  // ── 8. Reddit Channels — Step 5 (E) ──────────────────────────────────────
  const redditChannels = [
    { name: "r/startups",        url: "https://reddit.com/r/startups",        totalMembers: 1820000,  weeklyVisitors: 480000,  postingDifficulty: "medium" as const, description: "Community for startup founders, employees, and enthusiasts. Share your product, seek feedback, and discuss startup strategy.", categorySlugs: ["startup", "business"], tagSlugs: ["startup", "saas", "b2b", "product", "growth"] },
    { name: "r/entrepreneur",    url: "https://reddit.com/r/entrepreneur",    totalMembers: 3250000,  weeklyVisitors: 890000,  postingDifficulty: "medium" as const, description: "Largest entrepreneurship subreddit. Self-promotion allowed on specific days. Great for business tools, growth hacks, and founder stories.", categorySlugs: ["business", "startup"], tagSlugs: ["startup", "business", "b2b", "marketing", "growth"] },
    { name: "r/SaaS",            url: "https://reddit.com/r/SaaS",            totalMembers: 185000,   weeklyVisitors: 52000,   postingDifficulty: "easy" as const,   description: "Dedicated SaaS community for founders, operators, and enthusiasts. Share launches, ask for feedback, and discuss pricing, churn, and growth.", categorySlugs: ["saas"],                tagSlugs: ["saas", "b2b", "startup", "product", "analytics"] },
    { name: "r/webdev",          url: "https://reddit.com/r/webdev",          totalMembers: 2550000,  weeklyVisitors: 720000,  postingDifficulty: "hard" as const,   description: "Web development community. Very active but strict about self-promotion. Best for dev tools, APIs, and open-source projects.", categorySlugs: ["developer"],           tagSlugs: ["developer", "web", "api", "open-source", "tech"] },
    { name: "r/technology",      url: "https://reddit.com/r/technology",      totalMembers: 15200000, weeklyVisitors: 4100000, postingDifficulty: "hard" as const,   description: "General technology subreddit. Very large but promotional content difficult. Best for genuinely innovative products with news angle.", categorySlugs: ["technology"],          tagSlugs: ["tech", "ai", "startup", "global"] },
    { name: "r/marketing",       url: "https://reddit.com/r/marketing",       totalMembers: 762000,   weeklyVisitors: 195000,  postingDifficulty: "medium" as const, description: "Marketing professionals community. Share strategies, tools, and case studies. Good for marketing SaaS products and analytics tools.", categorySlugs: ["marketing"],           tagSlugs: ["marketing", "b2b", "growth", "content", "analytics"] },
    { name: "r/smallbusiness",   url: "https://reddit.com/r/smallbusiness",   totalMembers: 1230000,  weeklyVisitors: 330000,  postingDifficulty: "easy" as const,   description: "Community for small business owners. Product recommendations welcome. Ideal for affordable B2B tools targeting SMBs.", categorySlugs: ["business"],            tagSlugs: ["b2b", "startup", "saas", "ecommerce", "marketing"] },
    { name: "r/growthhacking",   url: "https://reddit.com/r/growthhacking",   totalMembers: 355000,   weeklyVisitors: 82000,   postingDifficulty: "easy" as const,   description: "Growth marketing tactics and tools. Very receptive to new marketing tools, landing page builders, and analytics products.", categorySlugs: ["marketing", "startup"], tagSlugs: ["growth", "marketing", "saas", "analytics", "b2b"] },
    { name: "r/indiehackers",    url: "https://reddit.com/r/indiehackers",    totalMembers: 158000,   weeklyVisitors: 42000,   postingDifficulty: "easy" as const,   description: "Community for indie hackers building products. Very supportive of Show HN and product launches from solo founders.", categorySlugs: ["startup"],             tagSlugs: ["indie-hacker", "startup", "saas", "no-code", "product"] },
    { name: "r/artificial",      url: "https://reddit.com/r/artificial",      totalMembers: 1450000,  weeklyVisitors: 380000,  postingDifficulty: "medium" as const, description: "AI and machine learning community. Good for AI-powered products, chatbots, and tools leveraging LLMs and generative AI.", categorySlugs: ["technology"],          tagSlugs: ["ai", "tech", "developer", "saas", "api"] },
    { name: "r/digitalnomad",    url: "https://reddit.com/r/digitalnomad",    totalMembers: 1520000,  weeklyVisitors: 410000,  postingDifficulty: "medium" as const, description: "Remote work and digital nomad community. Good for productivity tools, remote collaboration software, and freelancer tools.", categorySlugs: ["business"],            tagSlugs: ["productivity", "saas", "b2c", "mobile", "global"] },
    { name: "r/fintech",         url: "https://reddit.com/r/fintech",         totalMembers: 148000,   weeklyVisitors: 39000,   postingDifficulty: "easy" as const,   description: "Financial technology community. Discussions on payments, banking, crypto, and fintech startups. Ideal for fintech products.", categorySlugs: ["fintech"],             tagSlugs: ["fintech", "b2b", "startup", "crypto", "api"] },
    { name: "r/ecommerce",       url: "https://reddit.com/r/ecommerce",       totalMembers: 488000,   weeklyVisitors: 128000,  postingDifficulty: "medium" as const, description: "E-commerce entrepreneurs and professionals. Covers Shopify, Amazon, and DTC brands. Good for e-commerce tools and plugins.", categorySlugs: ["ecommerce"],           tagSlugs: ["ecommerce", "b2b", "marketing", "mobile", "saas"] },
    { name: "r/india",           url: "https://reddit.com/r/india",           totalMembers: 2180000,  weeklyVisitors: 590000,  postingDifficulty: "hard" as const,   description: "Main subreddit for Indian users. Large audience for India-focused products. Strict rules but occasional product posts get traction.", categorySlugs: ["startup", "technology"], tagSlugs: ["india", "startup", "b2c", "fintech", "tech"] },
    { name: "r/ProductHunters",  url: "https://reddit.com/r/ProductHunters",  totalMembers: 88000,    weeklyVisitors: 21000,   postingDifficulty: "easy" as const,   description: "Community of Product Hunt enthusiasts. Share your PH launch, coordinate upvote campaigns, and get feedback before launch day.", categorySlugs: ["startup", "technology"], tagSlugs: ["product", "startup", "saas", "tech"] },
  ];

  for (const r of redditChannels) {
    await upsertRedditChannel(r);
  }
  console.log(`✅  ${redditChannels.length} reddit channels    (Step 5 / Section E)`);

  // ─────────────────────────────────────────────────────────────────────────
  // Helper: upsert a fund and sync tags + categories
  // ─────────────────────────────────────────────────────────────────────────
  async function upsertFund(data: {
    name: string; websiteUrl: string; investmentStage: string;
    ticketSize: string; description: string; countrySlug?: string;
    categorySlugs: string[]; tagSlugs: string[];
  }) {
    const countryId = data.countrySlug ? countryMap[data.countrySlug] : null;
    const catSlugs = data.categorySlugs.filter((s) => catMap[s]);
    const tagSlugArr = data.tagSlugs.filter((s) => tagMap[s]);

    const existing = await db.fund.findFirst({ where: { websiteUrl: data.websiteUrl } });
    const payload = {
      name: data.name, websiteUrl: data.websiteUrl,
      investmentStage: data.investmentStage as never,
      ticketSize: data.ticketSize, description: data.description,
      countryId, categorySlugs: catSlugs, tagSlugs: tagSlugArr, isActive: true,
    };
    const fund = existing
      ? await db.fund.update({ where: { id: existing.id }, data: payload })
      : await db.fund.create({ data: payload });

    // Sync tags
    await db.fundTag.deleteMany({ where: { fundId: fund.id } });
    if (tagSlugArr.length > 0) {
      const tagIds = tagSlugArr.map((s) => tagMap[s]).filter(Boolean);
      await db.fundTag.createMany({
        data: tagIds.map((tagId) => ({ fundId: fund.id, tagId })),
        skipDuplicates: true,
      });
    }

    // Sync categories
    await db.fundCategory.deleteMany({ where: { fundId: fund.id } });
    if (catSlugs.length > 0) {
      const catIds = catSlugs.map((s) => catMap[s]).filter(Boolean);
      await db.fundCategory.createMany({
        data: catIds.map((categoryId) => ({ fundId: fund.id, categoryId })),
        skipDuplicates: true,
      });
    }

    return fund;
  }

  // ── 9. Funds — Step 6 (F) ─────────────────────────────────────────────────
  const funds = [
    { name: "Y Combinator",              websiteUrl: "https://ycombinator.com",           investmentStage: "pre_seed",  ticketSize: "$500K for 7%",     countrySlug: "united-states", description: "World's most prestigious startup accelerator. Funds pre-seed companies with $500K, provides mentorship, and alumni network including Airbnb, Stripe, Dropbox.", categorySlugs: ["startup", "technology"], tagSlugs: ["startup", "saas", "tech", "pre-seed", "b2b"] },
    { name: "Andreessen Horowitz (a16z)", websiteUrl: "https://a16z.com",                  investmentStage: "seed",      ticketSize: "$1M–$50M",         countrySlug: "united-states", description: "Top-tier VC investing in software, bio, crypto, and consumer. Led by Marc Andreessen and Ben Horowitz. Backs category-defining companies.", categorySlugs: ["technology", "saas"],    tagSlugs: ["vc", "saas", "tech", "ai", "crypto", "seed"] },
    { name: "Sequoia Capital",            websiteUrl: "https://sequoiacap.com",             investmentStage: "series_a",  ticketSize: "$1M–$100M",        countrySlug: "united-states", description: "One of the world's most successful VCs. Has backed Apple, Google, WhatsApp, Airbnb. Focuses on technology companies with transformational potential.", categorySlugs: ["technology", "startup"], tagSlugs: ["vc", "tech", "saas", "series-a", "b2b", "global"] },
    { name: "First Round Capital",        websiteUrl: "https://firstround.com",             investmentStage: "seed",      ticketSize: "$500K–$5M",        countrySlug: "united-states", description: "Seed-stage VC known for being the first check. Portfolio includes Uber, Square, Roblox. Focused on exceptional founders building important companies.", categorySlugs: ["startup", "technology"], tagSlugs: ["seed", "startup", "saas", "b2b", "tech"] },
    { name: "Techstars",                  websiteUrl: "https://techstars.com",              investmentStage: "pre_seed",  ticketSize: "$120K for 6%",     countrySlug: "global",         description: "Global startup accelerator program. Operates in 50+ cities worldwide. Strong network and mentorship. Portfolio includes SendGrid, Digital Ocean, ClassPass.", categorySlugs: ["startup", "technology"], tagSlugs: ["startup", "pre-seed", "saas", "global", "tech"] },
    { name: "500 Global",                 websiteUrl: "https://500.co",                     investmentStage: "seed",      ticketSize: "$150K–$500K",      countrySlug: "global",         description: "Global VC and startup accelerator. Has invested in 2,700+ companies across 75 countries. Focuses on emerging markets and underrepresented founders.", categorySlugs: ["startup", "saas"],       tagSlugs: ["seed", "startup", "global", "saas", "b2b"] },
    { name: "Accel",                      websiteUrl: "https://accel.com",                  investmentStage: "series_a",  ticketSize: "$5M–$50M",         countrySlug: "global",         description: "Leading early-stage VC with offices in Palo Alto, London, and Bangalore. Portfolio includes Facebook, Slack, Atlassian, Flipkart.", categorySlugs: ["technology", "saas"],    tagSlugs: ["series-a", "saas", "b2b", "tech", "global", "india"] },
    { name: "Bessemer Venture Partners",  websiteUrl: "https://bvp.com",                    investmentStage: "seed",      ticketSize: "$1M–$30M",         countrySlug: "united-states", description: "One of the oldest and most successful VC firms. Anti-Portfolio includes Google, Apple, FedEx. Cloud 100 list maker. Focuses on cloud and SaaS.", categorySlugs: ["saas", "technology"],    tagSlugs: ["saas", "seed", "b2b", "tech", "vc"] },
    { name: "Lightspeed Venture Partners", websiteUrl: "https://lsvp.com",                 investmentStage: "seed",      ticketSize: "$1M–$20M",         countrySlug: "global",         description: "Multi-stage VC investing in enterprise, consumer, and health. Portfolio includes Snap, Affirm, and multiple unicorns in India.", categorySlugs: ["technology", "saas"],    tagSlugs: ["seed", "b2b", "saas", "fintech", "india", "global"] },
    { name: "Tiger Global Management",    websiteUrl: "https://tigerglobal.com",            investmentStage: "growth",    ticketSize: "$10M–$500M",       countrySlug: "united-states", description: "Aggressive growth-stage investor that moves fast and writes large checks. Backed many Indian unicorns. Focuses on internet and technology businesses.", categorySlugs: ["technology", "business"], tagSlugs: ["vc", "growth", "b2b", "saas", "fintech", "india"] },
    { name: "Nexus Venture Partners",     websiteUrl: "https://nexusvp.com",                investmentStage: "seed",      ticketSize: "$500K–$10M",       countrySlug: "india",          description: "Leading early-stage India-focused VC. Has backed Druva, Unacademy, Snapdeal. Strong network in Indian startup ecosystem.", categorySlugs: ["startup", "technology"],  tagSlugs: ["india", "seed", "saas", "b2b", "startup"] },
    { name: "Blume Ventures",             websiteUrl: "https://blumeventures.com",          investmentStage: "pre_seed",  ticketSize: "$250K–$2M",        countrySlug: "india",          description: "Top Indian seed-stage VC. Focuses on Indian founders solving Indian problems. Portfolio includes Unacademy, Dunzo, and GreyOrange.", categorySlugs: ["startup", "technology"],  tagSlugs: ["india", "pre-seed", "startup", "tech", "b2c"] },
    { name: "Sequoia India & SEA",        websiteUrl: "https://surgeahead.com",             investmentStage: "seed",      ticketSize: "$1M–$15M",         countrySlug: "india",          description: "Sequoia's Southeast Asia and India arm. Runs Surge accelerator program for early-stage startups. Portfolio includes BYJU's, Razorpay, Meesho.", categorySlugs: ["startup", "fintech"],    tagSlugs: ["india", "seed", "startup", "fintech", "saas"] },
    { name: "Matrix Partners India",      websiteUrl: "https://matrixpartners.in",          investmentStage: "seed",      ticketSize: "$1M–$15M",         countrySlug: "india",          description: "India-focused VC with deep local networks. Has backed OlaMoney, Mswipe, Dailyhunt. Focuses on consumer internet and SaaS.", categorySlugs: ["startup", "saas"],       tagSlugs: ["india", "seed", "saas", "b2c", "fintech"] },
    { name: "Seedcamp",                   websiteUrl: "https://seedcamp.com",               investmentStage: "pre_seed",  ticketSize: "€100K–€200K",      countrySlug: "united-kingdom", description: "Europe's top pre-seed fund. Backs exceptional founders across Europe. Portfolio includes Revolut, UiPath, Wise. Strong UK and EU network.", categorySlugs: ["startup", "technology"],  tagSlugs: ["pre-seed", "startup", "saas", "fintech", "tech", "global"] },
    { name: "SoftBank Vision Fund",       websiteUrl: "https://visionfund.com",             investmentStage: "late_stage", ticketSize: "$100M–$10B",      countrySlug: "global",         description: "Largest technology investment fund. Backs growth-stage and late-stage companies. Portfolio includes Alibaba, ARM, WeWork. High-profile but selective.", categorySlugs: ["technology", "saas"],    tagSlugs: ["vc", "growth", "b2b", "ai", "global", "fintech"] },
  ];

  for (const f of funds) {
    await upsertFund(f);
  }
  console.log(`✅  ${funds.length} funds/investors     (Step 6 / Section F)`);

  // ── Summary ───────────────────────────────────────────────────────────────
  const totalWebsites = distributionSites.length + guestPostSites.length + pressReleaseSites.length;
  console.log(`
🎉  Curation seed complete!
────────────────────────────────────────
  Step 1 (Distribution)   ${distributionSites.length} sites
  Step 2 (Guest Posts)    ${guestPostSites.length} sites
  Step 3 (Press Release)  ${pressReleaseSites.length} sites
  Step 4 (Influencers)    ${influencers.length} influencers
  Step 5 (Reddit)         ${redditChannels.length} subreddits
  Step 6 (Funds)          ${funds.length} funds
────────────────────────────────────────
  Total websites:         ${totalWebsites}
  Total entities:         ${totalWebsites + influencers.length + redditChannels.length + funds.length}

Now run a curation at: http://localhost:3000/dashboard
Use keywords like: saas, startup, marketing, ai, b2b
`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
