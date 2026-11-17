-- =============================================================================
-- ETurismo — 02 New Local Languages
-- Adds Bisaya (ceb), Ilocano (ilo), and Hiligaynon (hil) support.
--
-- The live artifacts table has NO audio_* columns — audio is stored in
-- artifact_translations.audio_url per language row, not as separate columns.
-- This script therefore only documents the new language codes and ensures
-- any future audio inserts can reference them.
--
-- Safe to run on the live database — idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- artifact_translations already supports any language_code string.
-- The unique constraint (artifact_id, language_code) prevents duplicates.
-- No schema change is needed to add ceb / ilo / hil translation rows.
--
-- Document valid codes via a column comment so Supabase Studio shows them.
-- ---------------------------------------------------------------------------
comment on column public.artifact_translations.language_code is
  'BCP-47-inspired code. Valid values: en | fil | ceb | ilo | hil | ja | es | ko';

-- ---------------------------------------------------------------------------
-- Seed helper: insert empty translation stubs for the three new dialects
-- for every existing artifact that already has a Filipino (fil) translation.
-- This gives admins a starting point to fill in Bisaya / Ilocano / Hiligaynon
-- descriptions.  Rows that already exist are skipped (ON CONFLICT DO NOTHING).
-- ---------------------------------------------------------------------------
insert into public.artifact_translations (artifact_id, language_code, name, description)
select t.artifact_id, 'ceb', t.name, null
from   public.artifact_translations t
where  t.language_code = 'fil'
on conflict (artifact_id, language_code) do nothing;

insert into public.artifact_translations (artifact_id, language_code, name, description)
select t.artifact_id, 'ilo', t.name, null
from   public.artifact_translations t
where  t.language_code = 'fil'
on conflict (artifact_id, language_code) do nothing;

insert into public.artifact_translations (artifact_id, language_code, name, description)
select t.artifact_id, 'hil', t.name, null
from   public.artifact_translations t
where  t.language_code = 'fil'
on conflict (artifact_id, language_code) do nothing;
