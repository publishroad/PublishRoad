#!/usr/bin/env tsx
/**
 * Dev seed: creates plan configs, a test admin user, and a test regular user.
 * Run: npx tsx scripts/seed-dev.ts
 *
 * Admin login:  admin@publishroad.com / Admin123!
 * User login:   user@publishroad.com  / User123!
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
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding dev database...\n");

  // ── Plan configs ─────────────────────────────
  const plans = [
    { id: "plan_free",     name: "Free",     slug: "free",     priceCents: 0,    credits: 1,  billingType: "one_time", isActive: true },
    { id: "plan_starter",  name: "Starter",  slug: "starter",  priceCents: 900,  credits: 1,  billingType: "one_time", isActive: true },
    { id: "plan_pro",      name: "Pro",      slug: "pro",      priceCents: 3900, credits: 10, billingType: "monthly",  isActive: true },
    { id: "plan_lifetime", name: "Lifetime", slug: "lifetime", priceCents: 59900, credits: 999999, billingType: "one_time", isActive: true },
  ];

  for (const plan of plans) {
    await db.planConfig.upsert({
      where: { id: plan.id },
      create: plan,
      update: plan,
    });
  }
  console.log("✅ Plan configs seeded (free, starter, pro, lifetime)");

  // ── Admin user ────────────────────────────────
  const adminPassword = await bcrypt.hash("Admin123!", 12);
  await db.adminUser.upsert({
    where: { email: "admin@publishroad.com" },
    create: {
      email: "admin@publishroad.com",
      name: "Admin",
      passwordHash: adminPassword,
      role: "super_admin",
      totpEnabled: false,
      isActive: true,
    },
    update: { passwordHash: adminPassword },
  });
  console.log("✅ Admin user:  admin@publishroad.com / Admin123!");

  // ── Regular user ──────────────────────────────
  const freePlan = await db.planConfig.findFirst({ where: { slug: "free" } });
  const userPassword = await bcrypt.hash("User123!", 12);
  await db.user.upsert({
    where: { email: "user@publishroad.com" },
    create: {
      email: "user@publishroad.com",
      name: "Test User",
      passwordHash: userPassword,
      authProvider: "email",
      emailVerifiedAt: new Date(),
      creditsRemaining: 3,
      planId: freePlan?.id ?? null,
    },
    update: { passwordHash: userPassword },
  });
  console.log("✅ Test user:   user@publishroad.com  / User123!");

  // ── Sample countries ──────────────────────────
  const countries = [
    { name: "Global",         slug: "global",         flagEmoji: "🌍", isActive: true },
    { name: "United States",  slug: "united-states",  flagEmoji: "🇺🇸", isActive: true },
    { name: "United Kingdom", slug: "united-kingdom", flagEmoji: "🇬🇧", isActive: true },
    { name: "India",          slug: "india",          flagEmoji: "🇮🇳", isActive: true },
    { name: "Canada",         slug: "canada",         flagEmoji: "🇨🇦", isActive: true },
    { name: "Australia",      slug: "australia",      flagEmoji: "🇦🇺", isActive: true },
  ];
  for (const c of countries) {
    await db.country.upsert({ where: { slug: c.slug }, create: c, update: c });
  }
  console.log(`✅ ${countries.length} countries seeded`);

  // ── Sample categories ─────────────────────────
  const categories = [
    { name: "Technology",   slug: "technology",   isActive: true },
    { name: "Business",     slug: "business",     isActive: true },
    { name: "Marketing",    slug: "marketing",    isActive: true },
    { name: "Startup",      slug: "startup",      isActive: true },
    { name: "SaaS",         slug: "saas",         isActive: true },
    { name: "E-commerce",   slug: "ecommerce",    isActive: true },
  ];
  for (const c of categories) {
    await db.category.upsert({ where: { slug: c.slug }, create: c, update: c });
  }
  console.log(`✅ ${categories.length} categories seeded`);

  // ── Sample tags ───────────────────────────────
  const tags = [
    { name: "tech",       slug: "tech" },
    { name: "startup",    slug: "startup" },
    { name: "saas",       slug: "saas" },
    { name: "marketing",  slug: "marketing" },
    { name: "product",    slug: "product" },
    { name: "press",      slug: "press" },
    { name: "ai",         slug: "ai" },
    { name: "b2b",        slug: "b2b" },
  ];
  for (const t of tags) {
    await db.tag.upsert({ where: { slug: t.slug }, create: t, update: t });
  }
  console.log(`✅ ${tags.length} tags seeded`);

  // ── Sample websites ───────────────────────────
  const websites = [
    { name: "TechCrunch",       url: "https://techcrunch.com",       type: "press_release", da: 93, description: "Leading tech news site" },
    { name: "Product Hunt",     url: "https://producthunt.com",      type: "distribution",  da: 90, description: "Platform for discovering new products" },
    { name: "Hacker News",      url: "https://news.ycombinator.com", type: "distribution",  da: 91, description: "Social news for hackers" },
    { name: "Indie Hackers",    url: "https://indiehackers.com",     type: "distribution",  da: 75, description: "Community for bootstrapped founders" },
    { name: "BetaList",         url: "https://betalist.com",         type: "distribution",  da: 66, description: "Discover and get early access to startups" },
    { name: "Forbes",           url: "https://forbes.com",           type: "press_release", da: 94, description: "Business and finance media" },
    { name: "VentureBeat",      url: "https://venturebeat.com",      type: "press_release", da: 88, description: "Tech journalism" },
    { name: "SaaStr",           url: "https://saastr.com",           type: "guest_post",    da: 72, description: "Community for SaaS founders" },
    { name: "Medium",           url: "https://medium.com",           type: "guest_post",    da: 95, description: "Publishing platform" },
    { name: "Dev.to",           url: "https://dev.to",               type: "guest_post",    da: 82, description: "Developer community blog" },
  ];

  for (const w of websites) {
    await db.website.upsert({
      where: { url: w.url },
      create: { ...w, isActive: true, isPinned: false, isExcluded: false },
      update: { da: w.da, description: w.description },
    });
  }
  console.log(`✅ ${websites.length} sample websites seeded`);

  console.log("\n🎉 Dev seed complete!\n");
  console.log("  Admin:  http://localhost:3000/admin/login");
  console.log("    → admin@publishroad.com / Admin123!\n");
  console.log("  User:   http://localhost:3000/login");
  console.log("    → user@publishroad.com / User123!\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
