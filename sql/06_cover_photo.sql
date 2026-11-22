-- =============================================================================
-- ETurismo — 06 Cover Photo
-- Adds a cover_photo column to public.users so visitors can set a profile
-- banner image. Run after 05_storage_and_indexes.sql.
-- Idempotent — safe to re-run on an existing database without data loss.
-- =============================================================================

-- Nullable text column holding the public URL of the visitor's cover/banner
-- image. The image itself lives in the existing `profile-pictures` storage
-- bucket under `<user_id>/cover.jpg`, so no new bucket or storage policy is
-- needed — the avatar folder policy already allows each authenticated user to
-- write objects under their own `<auth.uid()>/` folder.
alter table public.users
  add column if not exists cover_photo text;

comment on column public.users.cover_photo is
  'Public URL of the visitor''s profile cover/banner image (stored in the profile-pictures bucket under <uid>/cover.jpg). May be null when no cover has been set.';
