-- =============================================================================
-- ETurismo — 05 Storage Buckets & Performance Indexes
-- Run after 01_base_schema.sql.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('artifact-images', 'artifact-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('artifacts-audio', 'artifacts-audio', true)   -- matches server.cjs bucket name
on conflict (id) do nothing;

-- Public read
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'artifact_images_public_read') then
    create policy "artifact_images_public_read"
      on storage.objects for select
      using (bucket_id = 'artifact-images');
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'artifacts_audio_public_read') then
    create policy "artifacts_audio_public_read"
      on storage.objects for select
      using (bucket_id = 'artifacts-audio');
  end if;
end $$;

-- Admin write
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'artifact_images_admin_write') then
    create policy "artifact_images_admin_write"
      on storage.objects for insert
      with check (
        bucket_id = 'artifact-images'
        and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'artifacts_audio_admin_write') then
    create policy "artifacts_audio_admin_write"
      on storage.objects for insert
      with check (
        bucket_id = 'artifacts-audio'
        and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'artifact_images_admin_delete') then
    create policy "artifact_images_admin_delete"
      on storage.objects for delete
      using (
        bucket_id = 'artifact-images'
        and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
      );
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'artifacts_audio_admin_delete') then
    create policy "artifacts_audio_admin_delete"
      on storage.objects for delete
      using (
        bucket_id = 'artifacts-audio'
        and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Performance indexes (CREATE INDEX IF NOT EXISTS is valid PostgreSQL)
-- ---------------------------------------------------------------------------
create index if not exists idx_users_created_at
  on public.users (created_at desc);

create index if not exists idx_users_last_seen
  on public.users (last_seen desc)
  where last_seen is not null;

create index if not exists idx_users_country_province
  on public.users (country, province);

create index if not exists idx_tour_feedback_submitted_at
  on public.tour_feedback (submitted_at desc);

create index if not exists idx_artifact_comments_created_at
  on public.artifact_comments (created_at desc);

create index if not exists idx_artifact_comments_artifact_id
  on public.artifact_comments (artifact_id);

create index if not exists idx_artifact_translations_artifact_id
  on public.artifact_translations (artifact_id);

create index if not exists idx_artifact_ratings_artifact_id
  on public.artifact_ratings (artifact_id);

create index if not exists idx_event_interests_event_id
  on public.event_interests (event_id);
