-- CreateEnum
CREATE TYPE "InfluencerPlatform" AS ENUM ('tiktok', 'instagram', 'youtube', 'twitter');

-- CreateEnum
CREATE TYPE "PostingDifficulty" AS ENUM ('easy', 'medium', 'hard');

-- CreateEnum
CREATE TYPE "InvestmentStage" AS ENUM ('pre_seed', 'seed', 'series_a', 'series_b', 'series_c', 'growth', 'late_stage');

-- AlterTable
ALTER TABLE "email_provider_config" ALTER COLUMN "from_address" DROP DEFAULT;

-- CreateTable
CREATE TABLE "beta_config" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by_id" TEXT,

    CONSTRAINT "beta_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "InfluencerPlatform" NOT NULL,
    "followers_count" INTEGER NOT NULL DEFAULT 0,
    "category_id" TEXT,
    "country_id" TEXT,
    "description" TEXT,
    "profile_link" TEXT NOT NULL,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tag_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencer_tags" (
    "influencer_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "influencer_tags_pkey" PRIMARY KEY ("influencer_id","tag_id")
);

-- CreateTable
CREATE TABLE "reddit_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "weekly_visitors" INTEGER NOT NULL DEFAULT 0,
    "total_members" INTEGER NOT NULL DEFAULT 0,
    "category_id" TEXT,
    "description" TEXT,
    "posting_difficulty" "PostingDifficulty",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tag_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reddit_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reddit_channel_tags" (
    "reddit_channel_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "reddit_channel_tags_pkey" PRIMARY KEY ("reddit_channel_id","tag_id")
);

-- CreateTable
CREATE TABLE "funds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logo_url" TEXT,
    "website_url" TEXT NOT NULL,
    "category_id" TEXT,
    "description" TEXT,
    "investment_stage" "InvestmentStage",
    "ticket_size" TEXT,
    "country_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "tag_slugs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_tags" (
    "fund_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "fund_tags_pkey" PRIMARY KEY ("fund_id","tag_id")
);

-- CreateIndex
CREATE INDEX "influencers_platform_is_active_idx" ON "influencers"("platform", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "reddit_channels_url_key" ON "reddit_channels"("url");

-- AddForeignKey
ALTER TABLE "beta_config" ADD CONSTRAINT "beta_config_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_tags" ADD CONSTRAINT "influencer_tags_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "influencer_tags" ADD CONSTRAINT "influencer_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reddit_channels" ADD CONSTRAINT "reddit_channels_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reddit_channel_tags" ADD CONSTRAINT "reddit_channel_tags_reddit_channel_id_fkey" FOREIGN KEY ("reddit_channel_id") REFERENCES "reddit_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reddit_channel_tags" ADD CONSTRAINT "reddit_channel_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funds" ADD CONSTRAINT "funds_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funds" ADD CONSTRAINT "funds_country_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_tags" ADD CONSTRAINT "fund_tags_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_tags" ADD CONSTRAINT "fund_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
