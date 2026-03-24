-- ============================================================
-- PublishRoad — DB-level Optimizations
-- Run AFTER the Prisma initial migration
-- ============================================================

-- ─────────────────────────────────────────────
-- 1. GIN Index on websites.tag_slugs (array overlap queries)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_websites_tag_slugs ON websites USING GIN (tag_slugs);

-- ─────────────────────────────────────────────
-- 2. Partial indexes on users (exclude soft-deleted rows)
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_active_email ON users (email)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_active_plan ON users (plan_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- ─────────────────────────────────────────────
-- 3. Compound cursor index for curation pagination
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_curations_user_cursor
  ON curations (user_id, created_at DESC, id DESC);

-- ─────────────────────────────────────────────
-- 4. Blog listing index
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_blog_listing
  ON blog_posts (status, publish_date DESC)
  WHERE status = 'published';

-- Covering index for slug lookup
CREATE INDEX IF NOT EXISTS idx_blog_slug_covering ON blog_posts (slug)
  INCLUDE (title, excerpt, featured_image, publish_date, author_id)
  WHERE status = 'published';

-- ─────────────────────────────────────────────
-- 5. Auto-update updated_at trigger
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'admin_users', 'countries', 'categories', 'sub_categories',
    'tags', 'websites', 'curations', 'blog_posts', 'service_leads',
    'plan_configs', 'ai_config'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      t, t
    );
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────
-- 6. Tag sync trigger — keeps websites.tag_slugs in sync with website_tags
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION sync_website_tag_slugs()
RETURNS TRIGGER AS $$
DECLARE
  target_website_id TEXT;
BEGIN
  target_website_id := COALESCE(NEW.website_id, OLD.website_id);

  UPDATE websites SET tag_slugs = (
    SELECT COALESCE(array_agg(t.slug ORDER BY t.slug), '{}')
    FROM website_tags wt
    JOIN tags t ON wt.tag_id = t.id
    WHERE wt.website_id = target_website_id
  )
  WHERE id = target_website_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_website_tags
  AFTER INSERT OR DELETE ON website_tags
  FOR EACH ROW EXECUTE FUNCTION sync_website_tag_slugs();

-- ─────────────────────────────────────────────
-- 7. Materialized view for admin dashboard stats
-- (refresh every 5 minutes via cron/job)
-- ─────────────────────────────────────────────
CREATE MATERIALIZED VIEW IF NOT EXISTS admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL)::bigint AS total_users,
  (SELECT COUNT(*) FROM curations)::bigint AS total_curations,
  (SELECT COALESCE(SUM(amount_cents), 0) FROM payments WHERE status = 'completed')::bigint AS total_revenue_cents,
  (SELECT COUNT(*) FROM curations WHERE created_at > NOW() - INTERVAL '7 days')::bigint AS curations_this_week,
  (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days' AND deleted_at IS NULL)::bigint AS signups_this_week,
  (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND plan_id IN (SELECT id FROM plan_configs WHERE slug != 'free'))::bigint AS paid_users,
  NOW() AS refreshed_at;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_dashboard_stats ON admin_dashboard_stats (refreshed_at);

-- ─────────────────────────────────────────────
-- 8. PostgreSQL performance settings (advisory — set in Supabase dashboard)
-- random_page_cost = 1.1  (SSD storage)
-- effective_cache_size = 3GB
-- log_min_duration_statement = 100 (log slow queries > 100ms)
-- idle_in_transaction_session_timeout = 60000
-- statement_timeout = 30000
-- ─────────────────────────────────────────────
