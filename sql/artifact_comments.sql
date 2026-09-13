-- ============================================================
--  ETurismo — artifact_comments table
--  Run this in the Supabase SQL Editor (Database → SQL Editor)
-- ============================================================

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.artifact_comments (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id   uuid          NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  user_id       uuid          NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id     uuid          REFERENCES public.artifact_comments(id) ON DELETE CASCADE,
  content       text          NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  likes         integer       NOT NULL DEFAULT 0,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_artifact_comments_artifact_id
  ON public.artifact_comments (artifact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_artifact_comments_parent_id
  ON public.artifact_comments (parent_id);

CREATE INDEX IF NOT EXISTS idx_artifact_comments_user_id
  ON public.artifact_comments (user_id);

-- 3. Likes table (one row per user per comment — prevents duplicate likes)
CREATE TABLE IF NOT EXISTS public.artifact_comment_likes (
  comment_id  uuid  NOT NULL REFERENCES public.artifact_comments(id) ON DELETE CASCADE,
  user_id     uuid  NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (comment_id, user_id)
);

-- 4. Trigger to keep artifact_comments.likes in sync
CREATE OR REPLACE FUNCTION sync_comment_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.artifact_comments SET likes = likes + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.artifact_comments SET likes = GREATEST(0, likes - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_comment_likes ON public.artifact_comment_likes;
CREATE TRIGGER trg_sync_comment_likes
AFTER INSERT OR DELETE ON public.artifact_comment_likes
FOR EACH ROW EXECUTE FUNCTION sync_comment_likes();

-- 5. Row-Level Security
ALTER TABLE public.artifact_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artifact_comment_likes ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all comments
CREATE POLICY "Authenticated can read comments"
  ON public.artifact_comments FOR SELECT
  TO authenticated USING (true);

-- Users can insert their own comments
CREATE POLICY "Users can insert own comments"
  ON public.artifact_comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update (edit) their own comments
CREATE POLICY "Users can update own comments"
  ON public.artifact_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments"
  ON public.artifact_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Likes: anyone authenticated can read
CREATE POLICY "Authenticated can read likes"
  ON public.artifact_comment_likes FOR SELECT
  TO authenticated USING (true);

-- Likes: users can insert their own
CREATE POLICY "Users can like"
  ON public.artifact_comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Likes: users can unlike (delete their own)
CREATE POLICY "Users can unlike"
  ON public.artifact_comment_likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
