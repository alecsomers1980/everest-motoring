-- Dedup guard for the auto-created "sold video" social post (ember-social).
-- Set when the post is created so concurrent video finalizers do not duplicate it.
ALTER TABLE sales ADD COLUMN IF NOT EXISTS social_post_created_at timestamptz;
