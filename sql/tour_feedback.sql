-- ETurismo tour feedback schema
-- Safe to run repeatedly in the Supabase SQL editor.

create table if not exists public.tour_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete set null,
  overall_rating integer not null check (overall_rating between 1 and 5),
  visit_type text not null check (visit_type in ('solo', 'couple', 'family', 'group', 'school')),
  heard_from text[] not null default '{}',
  highlights text,
  suggestions text,
  would_recommend boolean not null,
  total_artifacts integer not null default 0 check (total_artifacts >= 0),
  submitted_at timestamptz not null default now()
);

create unique index if not exists uq_tour_feedback_user
  on public.tour_feedback (user_id)
  where user_id is not null;

create index if not exists idx_tour_feedback_submitted_at
  on public.tour_feedback (submitted_at desc);

create index if not exists idx_tour_feedback_rating
  on public.tour_feedback (overall_rating);

alter table public.tour_feedback enable row level security;

drop policy if exists "Users can insert own feedback" on public.tour_feedback;
create policy "Users can insert own feedback"
  on public.tour_feedback
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can read own feedback" on public.tour_feedback;
create policy "Users can read own feedback"
  on public.tour_feedback
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Admins can read all feedback" on public.tour_feedback;
create policy "Admins can read all feedback"
  on public.tour_feedback
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.users
      where users.id = (select auth.uid())
        and users.role = 'admin'
    )
  );

grant select, insert on public.tour_feedback to authenticated;
revoke all on public.tour_feedback from anon;
