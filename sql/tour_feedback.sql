-- ============================================================
--  ETurismo — tour_feedback table
--  Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.tour_feedback (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid          REFERENCES public.users(id) ON DELETE SET NULL,
  overall_rating   smallint      NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  visit_type       text          NOT NULL
                                 CHECK (visit_type IN ('solo','couple','family','group','school')),
  heard_from       text[]        NOT NULL DEFAULT '{}',
  highlights       text,
  suggestions      text,
  would_recommend  boolean       NOT NULL,
  total_artifacts  integer       NOT NULL DEFAULT 0,
  submitted_at     timestamptz   NOT NULL DEFAULT now()
);

-- 2. Indexes for common admin queries
CREATE INDEX IF NOT EXISTS idx_tour_feedback_submitted_at
  ON public.tour_feedback (submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_tour_feedback_user_id
  ON public.tour_feedback (user_id);

CREATE INDEX IF NOT EXISTS idx_tour_feedback_overall_rating
  ON public.tour_feedback (overall_rating);

CREATE INDEX IF NOT EXISTS idx_tour_feedback_visit_type
  ON public.tour_feedback (visit_type);

-- 3. Row-Level Security (RLS)
ALTER TABLE public.tour_feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON public.tour_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Authenticated users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON public.tour_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Service role (admin backend) has full access — covers the admin panel
-- No policy needed for service_role; it bypasses RLS by default.

-- Anon users can insert (for guests who submit without an account)
CREATE POLICY "Anon can insert feedback"
  ON public.tour_feedback
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- ============================================================
--  Admin helper view — aggregated stats (used by dashboardData.ts)
--  The admin panel queries this view using the service-role key.
-- ============================================================
CREATE OR REPLACE VIEW public.tour_feedback_stats AS
SELECT
  -- Volume
  COUNT(*)                                                        AS total_submissions,
  COUNT(*) FILTER (WHERE submitted_at >= now() - interval '7 days')
                                                                  AS submissions_last_7d,
  COUNT(*) FILTER (WHERE submitted_at >= now() - interval '30 days')
                                                                  AS submissions_last_30d,

  -- Ratings
  ROUND(AVG(overall_rating)::numeric, 2)                         AS avg_rating,
  COUNT(*) FILTER (WHERE overall_rating = 5)                     AS rating_5,
  COUNT(*) FILTER (WHERE overall_rating = 4)                     AS rating_4,
  COUNT(*) FILTER (WHERE overall_rating = 3)                     AS rating_3,
  COUNT(*) FILTER (WHERE overall_rating = 2)                     AS rating_2,
  COUNT(*) FILTER (WHERE overall_rating = 1)                     AS rating_1,

  -- Recommendation rate
  ROUND(
    (COUNT(*) FILTER (WHERE would_recommend = true) * 100.0 /
     NULLIF(COUNT(*), 0))::numeric,
    1
  )                                                               AS recommend_pct,
  COUNT(*) FILTER (WHERE would_recommend = true)                 AS recommend_yes,
  COUNT(*) FILTER (WHERE would_recommend = false)                AS recommend_no,

  -- Visit-type breakdown
  COUNT(*) FILTER (WHERE visit_type = 'solo')                    AS vt_solo,
  COUNT(*) FILTER (WHERE visit_type = 'couple')                  AS vt_couple,
  COUNT(*) FILTER (WHERE visit_type = 'family')                  AS vt_family,
  COUNT(*) FILTER (WHERE visit_type = 'group')                   AS vt_group,
  COUNT(*) FILTER (WHERE visit_type = 'school')                  AS vt_school,

  -- Average artifacts explored
  ROUND(AVG(total_artifacts)::numeric, 1)                        AS avg_artifacts_explored

FROM public.tour_feedback;

-- ============================================================
--  Quick-access view: last 30-day daily submission trend
-- ============================================================
CREATE OR REPLACE VIEW public.tour_feedback_daily_trend AS
SELECT
  DATE(submitted_at AT TIME ZONE 'UTC')  AS day,
  COUNT(*)                               AS submissions,
  ROUND(AVG(overall_rating)::numeric, 2) AS avg_rating
FROM public.tour_feedback
WHERE submitted_at >= now() - interval '30 days'
GROUP BY DATE(submitted_at AT TIME ZONE 'UTC')
ORDER BY day;

-- ============================================================
--  Heard-from breakdown (unnests the text[] column)
-- ============================================================
CREATE OR REPLACE VIEW public.tour_feedback_heard_from AS
SELECT
  source,
  COUNT(*) AS count
FROM public.tour_feedback,
     UNNEST(heard_from) AS source
GROUP BY source
ORDER BY count DESC;
