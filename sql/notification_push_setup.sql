-- ETurismo push notification setup
-- Stores Expo device tokens and notification preferences on user profiles.

alter table public.users
  add column if not exists expo_push_token text,
  add column if not exists notification_prefs jsonb not null default '{"push": true, "email": true, "sms": false}'::jsonb,
  add column if not exists email_prefs jsonb not null default '{"updates": true, "events": true, "newsletter": false}'::jsonb;

create index if not exists users_expo_push_token_idx
  on public.users (expo_push_token)
  where expo_push_token is not null;
