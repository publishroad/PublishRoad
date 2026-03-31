-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('plan', 'hire_us');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "payment_type" "PaymentType" NOT NULL DEFAULT 'plan';
