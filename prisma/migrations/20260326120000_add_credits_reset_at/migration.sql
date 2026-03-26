-- Add credits_reset_at to track monthly reset for Lifetime plan users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "credits_reset_at" TIMESTAMP(3);
