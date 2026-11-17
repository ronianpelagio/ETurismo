-- =============================================================================
-- ETurismo — 01 Base Schema
-- Exact match to the live Supabase schema.
-- PostgreSQL does not support CREATE POLICY IF NOT EXISTS, so each policy
-- is wrapped in a DO block that skips creation when it already exists.
-- Idempotent — safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_current_user_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.artifact_category as enum (
    'Sacred Vessels',
    'Liturgical Books',
    'Vestments',
    'Altar Furnishings',
    'Devotional Objects',
    'Sacramentals',
    'Musical Instruments',
    'Architectural and Decorative Elements'
  );
exception when duplicate_object then null;
end $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. users
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                  uuid        primary key default uuid_generate_v4(),
  first_name          text        not null,
  last_name           text        not null,
  gender              text,
  age                 int4,
  status              text,
  email               text        unique not null,
  role                text,
  profile_picture     text,
  created_at          timestamp,
  "Address"           text,
  last_seen           timestamptz,
  country             text,
  province            text,
  city                text,
  barangay            text,
  expo_push_token     text,
  notification_prefs  jsonb,
  email_prefs         jsonb
);

alter table public.users enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Admins can read all profiles') then
    create policy "Admins can read all profiles"
      on public.users for select to authenticated
      using (is_current_user_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users can view own profile') then
    create policy "Users can view own profile"
      on public.users for select to authenticated
      using (id = (select auth.uid()));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users can read own profile') then
    create policy "Users can read own profile"
      on public.users for select to authenticated
      using ((select auth.uid()) = id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile"
      on public.users for insert to authenticated
      with check ((id = (select auth.uid())) and (role = 'user'));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'users' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile"
      on public.users for update to authenticated
      using ((select auth.uid()) = id)
      with check ((select auth.uid()) = id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. artifacts
-- ---------------------------------------------------------------------------
create table if not exists public.artifacts (
  id                        uuid      primary key default uuid_generate_v4(),
  name                      text      not null,
  qr_code                   text      unique,
  category                  text,
  created_at                timestamp,
  description               text,
  image_url                 text,
  qr_value                  text      unique,
  creator                   text,
  "Historical_Significance" text
);

alter table public.artifacts enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifacts' and policyname = 'Anyone can view artifacts') then
    create policy "Anyone can view artifacts"
      on public.artifacts for select to public using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifacts' and policyname = 'Authenticated users can read artifacts') then
    create policy "Authenticated users can read artifacts"
      on public.artifacts for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifacts' and policyname = 'Admin can insert artifacts') then
    create policy "Admin can insert artifacts"
      on public.artifacts for insert to public with check (is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifacts' and policyname = 'Admin can update artifacts') then
    create policy "Admin can update artifacts"
      on public.artifacts for update to public using (is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifacts' and policyname = 'Admin can delete artifacts') then
    create policy "Admin can delete artifacts"
      on public.artifacts for delete to public using (is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. artifact_translations
-- ---------------------------------------------------------------------------
create table if not exists public.artifact_translations (
  id            uuid      primary key default uuid_generate_v4(),
  artifact_id   uuid      not null references public.artifacts(id) on delete cascade,
  language_code varchar   not null,
  name          text      not null,
  description   text,
  created_at    timestamp,
  audio_url     text,
  unique (artifact_id, language_code)
);

comment on column public.artifact_translations.language_code is
  'Valid values: en | fil | ceb | ilo | hil | ja | es | ko';

alter table public.artifact_translations enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_translations' and policyname = 'Anyone can view artifact translations') then
    create policy "Anyone can view artifact translations"
      on public.artifact_translations for select to public using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_translations' and policyname = 'Authenticated users can read artifact translations') then
    create policy "Authenticated users can read artifact translations"
      on public.artifact_translations for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_translations' and policyname = 'Admins can insert artifact translations') then
    create policy "Admins can insert artifact translations"
      on public.artifact_translations for insert to public
      with check (exists (
        select 1 from public.users
        where users.id = auth.uid() and users.role = 'admin'
      ));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_translations' and policyname = 'Admins can update artifact translations') then
    create policy "Admins can update artifact translations"
      on public.artifact_translations for update to public
      using (exists (
        select 1 from public.users
        where users.id = auth.uid() and users.role = 'admin'
      ));
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_translations' and policyname = 'Admins can delete artifact translations') then
    create policy "Admins can delete artifact translations"
      on public.artifact_translations for delete to public
      using (exists (
        select 1 from public.users
        where users.id = auth.uid() and users.role = 'admin'
      ));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. announcements
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id                    uuid        primary key default uuid_generate_v4(),
  title                 text        not null,
  announcement_datetime timestamptz not null,
  description           text,
  image_url             text,
  created_at            timestamptz
);

alter table public.announcements enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'announcements' and policyname = 'Anyone can view announcements') then
    create policy "Anyone can view announcements"
      on public.announcements for select to public using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'announcements' and policyname = 'Admin can insert announcements') then
    create policy "Admin can insert announcements"
      on public.announcements for insert to public with check (is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'announcements' and policyname = 'Admin can update announcements') then
    create policy "Admin can update announcements"
      on public.announcements for update to public using (is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'announcements' and policyname = 'Admin can delete announcements') then
    create policy "Admin can delete announcements"
      on public.announcements for delete to public using (is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 5. events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id               uuid        primary key default uuid_generate_v4(),
  title            text        not null,
  event_datetime   timestamptz not null,
  description      text,
  image_url        text,
  created_at       timestamptz,
  interested_count int4        not null default 0
);

alter table public.events enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Anyone can view events') then
    create policy "Anyone can view events"
      on public.events for select to public using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Admin can insert events') then
    create policy "Admin can insert events"
      on public.events for insert to public with check (is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Admin can update events') then
    create policy "Admin can update events"
      on public.events for update to public using (is_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events' and policyname = 'Admin can delete events') then
    create policy "Admin can delete events"
      on public.events for delete to public using (is_admin());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 6. event_interests
-- ---------------------------------------------------------------------------
create table if not exists public.event_interests (
  event_id   uuid        not null references public.events(id) on delete cascade,
  user_id    uuid        not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

alter table public.event_interests enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_interests' and policyname = 'interests_select_all') then
    create policy "interests_select_all"
      on public.event_interests for select to public using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_interests' and policyname = 'interests_insert_own') then
    create policy "interests_insert_own"
      on public.event_interests for insert to public
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'event_interests' and policyname = 'interests_delete_own') then
    create policy "interests_delete_own"
      on public.event_interests for delete to public
      using (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 7. user_ratings
-- ---------------------------------------------------------------------------
create table if not exists public.user_ratings (
  id          uuid      primary key default uuid_generate_v4(),
  user_id     uuid      references public.users(id) on delete cascade,
  artifact_id uuid      references public.artifacts(id) on delete cascade,
  rating      int4,
  feedback    text,
  created_at  timestamp
);

alter table public.user_ratings enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_ratings' and policyname = 'Anyone can view ratings') then
    create policy "Anyone can view ratings"
      on public.user_ratings for select to public using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_ratings' and policyname = 'Users can insert own rating') then
    create policy "Users can insert own rating"
      on public.user_ratings for insert to public
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_ratings' and policyname = 'Users can update own rating') then
    create policy "Users can update own rating"
      on public.user_ratings for update to public
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'user_ratings' and policyname = 'Users can delete own rating') then
    create policy "Users can delete own rating"
      on public.user_ratings for delete to public
      using (auth.uid() = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 8. artifact_ratings  (API Disabled — anon role has no access)
-- ---------------------------------------------------------------------------
create table if not exists public.artifact_ratings (
  id          uuid        primary key default uuid_generate_v4(),
  user_id     uuid        references public.users(id) on delete cascade,
  artifact_id uuid        not null references public.artifacts(id) on delete cascade,
  rating      int4        not null,
  comment     text,
  created_at  timestamptz not null default now()
);

alter table public.artifact_ratings enable row level security;

revoke all on public.artifact_ratings from anon;
grant select, insert, update, delete on public.artifact_ratings to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_ratings' and policyname = 'Authenticated users can read all ratings') then
    create policy "Authenticated users can read all ratings"
      on public.artifact_ratings for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_ratings' and policyname = 'Admins can read all ratings') then
    create policy "Admins can read all ratings"
      on public.artifact_ratings for select to authenticated
      using (is_current_user_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_ratings' and policyname = 'Users can insert own ratings') then
    create policy "Users can insert own ratings"
      on public.artifact_ratings for insert to authenticated
      with check ((select auth.uid()) = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_ratings' and policyname = 'Users can update own ratings') then
    create policy "Users can update own ratings"
      on public.artifact_ratings for update to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 9. tour_feedback  (API Disabled — anon role has no access)
-- ---------------------------------------------------------------------------
create table if not exists public.tour_feedback (
  id              uuid        primary key default uuid_generate_v4(),
  user_id         uuid        unique references public.users(id) on delete set null,
  overall_rating  int2        not null,
  visit_type      text        not null,
  heard_from      text[]      not null default '{}',
  highlights      text,
  suggestions     text,
  would_recommend bool        not null,
  total_artifacts int4        not null default 0,
  submitted_at    timestamptz not null default now()
);

alter table public.tour_feedback enable row level security;

revoke all on public.tour_feedback from anon;
grant select, insert, update on public.tour_feedback to authenticated;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tour_feedback' and policyname = 'Users can read own feedback') then
    create policy "Users can read own feedback"
      on public.tour_feedback for select to authenticated
      using ((select auth.uid()) = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tour_feedback' and policyname = 'Users can read own tour feedback') then
    create policy "Users can read own tour feedback"
      on public.tour_feedback for select to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tour_feedback' and policyname = 'Users can insert own tour feedback') then
    create policy "Users can insert own tour feedback"
      on public.tour_feedback for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tour_feedback' and policyname = 'Users can update own tour feedback') then
    create policy "Users can update own tour feedback"
      on public.tour_feedback for update to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tour_feedback' and policyname = 'Admins can read all feedback') then
    create policy "Admins can read all feedback"
      on public.tour_feedback for select to authenticated
      using (is_current_user_admin());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'tour_feedback' and policyname = 'Admins can manage all feedback') then
    create policy "Admins can manage all feedback"
      on public.tour_feedback for all to authenticated
      using (exists (
        select 1 from public.users
        where users.id = (select auth.uid()) and users.role = 'admin'
      ))
      with check (exists (
        select 1 from public.users
        where users.id = (select auth.uid()) and users.role = 'admin'
      ));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 10. artifact_comments
-- ---------------------------------------------------------------------------
create table if not exists public.artifact_comments (
  id          uuid        primary key default uuid_generate_v4(),
  artifact_id uuid        not null references public.artifacts(id) on delete cascade,
  user_id     uuid        not null references public.users(id) on delete cascade,
  parent_id   uuid        references public.artifact_comments(id) on delete cascade,
  content     text        not null,
  likes       int4        not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_artifact_comments_content_fts
  on public.artifact_comments using gin (to_tsvector('english', content));

alter table public.artifact_comments enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comments' and policyname = 'Authenticated can read comments') then
    create policy "Authenticated can read comments"
      on public.artifact_comments for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comments' and policyname = 'Users can insert own comments') then
    create policy "Users can insert own comments"
      on public.artifact_comments for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comments' and policyname = 'Users can update own comments') then
    create policy "Users can update own comments"
      on public.artifact_comments for update to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comments' and policyname = 'Users can delete own comments') then
    create policy "Users can delete own comments"
      on public.artifact_comments for delete to authenticated
      using (user_id = auth.uid());
  end if;
end $$;

-- Auto-update updated_at on edit
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_artifact_comments_updated_at on public.artifact_comments;
create trigger trg_artifact_comments_updated_at
  before update on public.artifact_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 11. artifact_comment_likes
-- ---------------------------------------------------------------------------
create table if not exists public.artifact_comment_likes (
  comment_id uuid not null references public.artifact_comments(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  primary key (comment_id, user_id)
);

alter table public.artifact_comment_likes enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comment_likes' and policyname = 'Authenticated can read likes') then
    create policy "Authenticated can read likes"
      on public.artifact_comment_likes for select to authenticated using (true);
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comment_likes' and policyname = 'Users can like') then
    create policy "Users can like"
      on public.artifact_comment_likes for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'artifact_comment_likes' and policyname = 'Users can unlike') then
    create policy "Users can unlike"
      on public.artifact_comment_likes for delete to authenticated
      using (user_id = auth.uid());
  end if;
end $$;
