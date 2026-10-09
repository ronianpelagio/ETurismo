-- ─── Event Interests ─────────────────────────────────────────────────────────
-- Tracks which users have marked interest in an event.
-- The interested_count on the events table is kept in sync via triggers so that
-- reads are cheap (no JOIN needed for list queries).

-- 1. Add interested_count to events (safe to run multiple times)
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS interested_count integer NOT NULL DEFAULT 0;

-- 2. Create the event_interests junction table
CREATE TABLE IF NOT EXISTS event_interests (
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- 3. Index for fast look-ups by user
CREATE INDEX IF NOT EXISTS idx_event_interests_user_id ON event_interests(user_id);

-- 4. Enable RLS
ALTER TABLE event_interests ENABLE ROW LEVEL SECURITY;

-- Visitors can read all interests (needed to display counts)
CREATE POLICY "interests_select_all"
  ON event_interests FOR SELECT
  USING (true);

-- Authenticated users can insert their own row
CREATE POLICY "interests_insert_own"
  ON event_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can delete their own row (un-interest)
CREATE POLICY "interests_delete_own"
  ON event_interests FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Trigger function: keep events.interested_count in sync
CREATE OR REPLACE FUNCTION sync_event_interested_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE events
       SET interested_count = interested_count + 1
     WHERE id = NEW.event_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE events
       SET interested_count = GREATEST(interested_count - 1, 0)
     WHERE id = OLD.event_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 6. Attach the trigger
DROP TRIGGER IF EXISTS trg_sync_event_interested_count ON event_interests;
CREATE TRIGGER trg_sync_event_interested_count
  AFTER INSERT OR DELETE ON event_interests
  FOR EACH ROW EXECUTE FUNCTION sync_event_interested_count();

-- 7. Back-fill counts for any existing data (safe no-op if table was empty)
UPDATE events e
   SET interested_count = (
     SELECT COUNT(*) FROM event_interests ei WHERE ei.event_id = e.id
   );
