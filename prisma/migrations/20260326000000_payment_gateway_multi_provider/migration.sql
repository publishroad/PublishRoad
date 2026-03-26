-- Migration: multi-provider payment gateway support
-- Each provider gets its own row. isActive flag controls which is live.

-- 1. Add is_active column (default false — no gateway active until explicitly set)
ALTER TABLE payment_gateway_config
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT false;

-- 2. Migrate the existing single 'default' row to use the provider name as ID
--    and auto-activate it only if a secret_key is already saved.
UPDATE payment_gateway_config
SET
  id         = provider::text,
  is_active  = (secret_key IS NOT NULL AND secret_key <> '')
WHERE id = 'default';
