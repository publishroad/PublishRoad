-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('stripe', 'razorpay', 'paypal');

-- CreateTable
CREATE TABLE "payment_gateway_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "provider" "PaymentProvider" NOT NULL DEFAULT 'stripe',
  "public_key" TEXT,
  "secret_key" TEXT,
  "webhook_secret" TEXT,
  "additional_config" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" TEXT,

  CONSTRAINT "payment_gateway_config_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "payment_gateway_config"
ADD CONSTRAINT "payment_gateway_config_updated_by_id_fkey"
FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "users"
ADD COLUMN "stripe_customer_hash" TEXT;

-- CreateIndex
CREATE INDEX "users_stripe_customer_hash_idx" ON "users"("stripe_customer_hash");

-- CreateEnum
CREATE TYPE "EmailProvider" AS ENUM ('resend', 'smtp', 'sendgrid', 'ses');

-- CreateTable
CREATE TABLE "email_provider_config" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "provider" "EmailProvider" NOT NULL DEFAULT 'resend',
  "from_address" TEXT NOT NULL DEFAULT 'PublishRoad <noreply@publishroad.com>',
  "api_key" TEXT,
  "host" TEXT,
  "port" INTEGER,
  "username" TEXT,
  "password" TEXT,
  "use_tls" BOOLEAN NOT NULL DEFAULT true,
  "additional_config" JSONB NOT NULL DEFAULT '{}',
  "updated_at" TIMESTAMP(3) NOT NULL,
  "updated_by_id" TEXT,

  CONSTRAINT "email_provider_config_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "email_provider_config"
ADD CONSTRAINT "email_provider_config_updated_by_id_fkey"
FOREIGN KEY ("updated_by_id") REFERENCES "admin_users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
