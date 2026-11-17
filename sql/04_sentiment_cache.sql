-- =============================================================================
-- ETurismo — 04 Sentiment Cache
-- Adds an optional sentiment column to artifact_comments and tour_feedback
-- so the admin CommentsPage and FeedbackPage can filter server-side.
--
-- The column is nullable — NULL means "not yet scored by the client".
-- The client-side scorer (sentiment.ts) works without it; this column is an
-- optional performance cache for future server-side filtering.
--
-- Safe to run on the live database — idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- artifact_comments — sentiment cache
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'artifact_comments'
      and column_name  = 'sentiment'
  ) then
    alter table public.artifact_comments
      add column sentiment text
        check (sentiment in ('positive', 'neutral', 'negative'));
  end if;
end $$;

create index if not exists idx_artifact_comments_sentiment
  on public.artifact_comments (sentiment)
  where sentiment is not null;

comment on column public.artifact_comments.sentiment is
  'Client-scored label: positive | neutral | negative. NULL = not yet scored.';

-- ---------------------------------------------------------------------------
-- tour_feedback — sentiment cache (scored from highlights + suggestions)
-- ---------------------------------------------------------------------------
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'tour_feedback'
      and column_name  = 'sentiment'
  ) then
    alter table public.tour_feedback
      add column sentiment text
        check (sentiment in ('positive', 'neutral', 'negative'));
  end if;
end $$;

create index if not exists idx_tour_feedback_sentiment
  on public.tour_feedback (sentiment)
  where sentiment is not null;

comment on column public.tour_feedback.sentiment is
  'Client-scored label derived from highlights + suggestions. positive | neutral | negative.';
