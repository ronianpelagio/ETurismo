-- ETurismo artifact ratings schema
-- Run in the Supabase SQL editor. Safe to run repeatedly.

create table if not exists public.artifact_ratings (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references public.users(id) on delete set null,
  artifact_id uuid        not null references public.artifacts(id) on delete cascade,
  rating      integer     not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now()
);

-- One rating per user per artifact (named constraint for upsert)
alter table public.artifact_ratings
  drop constraint if exists uq_artifact_ratings_user_artifact_constraint;
alter table public.artifact_ratings
  add constraint uq_artifact_ratings_user_artifact_constraint
  unique (user_id, artifact_id);

-- Drop the old partial index if it exists (replaced by the named constraint above)
drop index if exists uq_artifact_ratings_user_artifact;

create index if not exists idx_artifact_ratings_artifact
  on public.artifact_ratings (artifact_id);

create index if not exists idx_artifact_ratings_user
  on public.artifact_ratings (user_id);

create index if not exists idx_artifact_ratings_created_at
  on public.artifact_ratings (created_at desc);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.artifact_ratings enable row level security;

-- Users can insert their own rating
drop policy if exists "Users can insert own ratings" on public.artifact_ratings;
create policy "Users can insert own ratings"
  on public.artifact_ratings
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Users can update their own rating
drop policy if exists "Users can update own ratings" on public.artifact_ratings;
create policy "Users can update own ratings"
  on public.artifact_ratings
  for update
  to authenticated
  using ((select auth.uid()) = user_id);

-- All authenticated users can read all ratings
-- (needed so each user can see community aggregate + their own past rating)
drop policy if exists "Users can read own ratings" on public.artifact_ratings;
drop policy if exists "Authenticated users can read all ratings" on public.artifact_ratings;
create policy "Authenticated users can read all ratings"
  on public.artifact_ratings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins can read all ratings" on public.artifact_ratings;
create policy "Admins can read all ratings"
  on public.artifact_ratings
  for select
  to authenticated
  using (public.is_current_user_admin());

grant select, insert, update on public.artifact_ratings to authenticated;
revoke all on public.artifact_ratings from anon;

-- ─── Aggregate summary view (avg rating + count per artifact) ─────────────────
-- Queried by the app as: artifact_rating_summary?artifact_id=eq.{id}

create or replace view public.artifact_rating_summary as
select
  artifact_id,
  round(avg(rating)::numeric, 2)  as avg_rating,
  count(*)::integer                as rating_count,
  count(*) filter (where rating = 1)::integer as count_1,
  count(*) filter (where rating = 2)::integer as count_2,
  count(*) filter (where rating = 3)::integer as count_3,
  count(*) filter (where rating = 4)::integer as count_4,
  count(*) filter (where rating = 5)::integer as count_5
from public.artifact_ratings
group by artifact_id;

-- Grant read access on the view
grant select on public.artifact_rating_summary to authenticated;
