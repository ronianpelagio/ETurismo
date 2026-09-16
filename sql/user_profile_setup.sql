-- ETurismo user profile setup
-- Adds structured location fields, persists signup metadata, and provisions
-- an authenticated, user-owned public avatar bucket.

alter table public.users
  add column if not exists country text,
  add column if not exists province text,
  add column if not exists city text,
  add column if not exists barangay text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_first_name  text;
  v_last_name   text;
  v_full_name   text;
  v_avatar_url  text;
begin
  -- Email/password signup stores first_name / last_name directly.
  -- Google OAuth stores full_name (and sometimes name) with no split.
  -- We handle both so the row is never null regardless of provider.
  v_first_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    split_part(coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      ''
    ), ' ', 1),
    ''
  );

  v_full_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    ''
  );
  v_last_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    -- Everything after the first word in full_name
    case
      when length(v_full_name) > length(split_part(v_full_name, ' ', 1)) + 1
        then substring(v_full_name from length(split_part(v_full_name, ' ', 1)) + 2)
      else ''
    end,
    ''
  );

  -- Google provides an avatar via avatar_url / picture
  v_avatar_url := coalesce(
    nullif(new.raw_user_meta_data ->> 'avatar_url', ''),
    nullif(new.raw_user_meta_data ->> 'picture', '')
  );

  insert into public.users (
    id,
    email,
    first_name,
    last_name,
    gender,
    age,
    status,
    role,
    profile_picture,
    "Address",
    country,
    province,
    city,
    barangay
  )
  values (
    new.id,
    coalesce(new.email, ''),
    v_first_name,
    v_last_name,
    case
      when new.raw_user_meta_data ->> 'gender' in ('Male', 'Female', 'Other')
        then new.raw_user_meta_data ->> 'gender'
      else null
    end,
    case
      when new.raw_user_meta_data ->> 'age' ~ '^\d+$'
        then (new.raw_user_meta_data ->> 'age')::integer
      else null
    end,
    'active',
    'user',
    v_avatar_url,
    nullif(new.raw_user_meta_data ->> 'Address', ''),
    nullif(new.raw_user_meta_data ->> 'country', ''),
    nullif(new.raw_user_meta_data ->> 'province', ''),
    nullif(new.raw_user_meta_data ->> 'city', ''),
    nullif(new.raw_user_meta_data ->> 'barangay', '')
  )
  on conflict (id) do update set
    email        = excluded.email,
    first_name   = case when excluded.first_name <> '' then excluded.first_name else public.users.first_name end,
    last_name    = case when excluded.last_name  <> '' then excluded.last_name  else public.users.last_name  end,
    profile_picture = coalesce(excluded.profile_picture, public.users.profile_picture),
    "Address"    = excluded."Address",
    country      = excluded.country,
    province     = excluded.province,
    city         = excluded.city,
    barangay     = excluded.barangay;

  return new;
end;
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'profile-pictures',
  'profile-pictures',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload own profile picture" on storage.objects;
drop policy if exists "Users can read own profile picture" on storage.objects;
drop policy if exists "Users can update own profile picture" on storage.objects;
drop policy if exists "Users can delete own profile picture" on storage.objects;

create policy "Users can upload own profile picture"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can read own profile picture"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can update own profile picture"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "Users can delete own profile picture"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'profile-pictures'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
