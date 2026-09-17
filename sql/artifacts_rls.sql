-- Ensure authenticated users can read artifacts (needed for CollectionPage)
-- Run this in Supabase SQL Editor if the collection page shows no data.

alter table public.artifacts enable row level security;

-- Allow any authenticated user to read all artifacts
drop policy if exists "Authenticated users can read artifacts" on public.artifacts;
create policy "Authenticated users can read artifacts"
  on public.artifacts
  for select
  to authenticated
  using (true);

-- Also allow artifact_translations to be read
alter table public.artifact_translations enable row level security;

drop policy if exists "Authenticated users can read artifact translations" on public.artifact_translations;
create policy "Authenticated users can read artifact translations"
  on public.artifact_translations
  for select
  to authenticated
  using (true);

-- Also allow audio_guides to be read
alter table public.audio_guides enable row level security;

drop policy if exists "Authenticated users can read audio guides" on public.audio_guides;
create policy "Authenticated users can read audio guides"
  on public.audio_guides
  for select
  to authenticated
  using (true);
