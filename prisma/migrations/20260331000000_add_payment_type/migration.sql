-- CreateEnum (idempotent for environments where type already exists)
DO $$
BEGIN
	CREATE TYPE "PaymentType" AS ENUM ('plan', 'hire_us');
EXCEPTION
	WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "payments"
ADD COLUMN IF NOT EXISTS "payment_type" "PaymentType" NOT NULL DEFAULT 'plan';
