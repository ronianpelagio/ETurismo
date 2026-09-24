-- Fix: infinite recursion in public.users RLS policies.
-- Run this once in the Supabase SQL Editor.

alter table public.users enable row level security;

-- Remove old policies, including admin policies that query public.users from
-- inside a public.users policy condition.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
  loop
    execute format('drop policy if exists %I on public.users', policy_record.policyname);
  end loop;
end
$$;

-- SECURITY DEFINER reads users outside the caller's users-table RLS policies.
-- This prevents an admin role check from recursively evaluating users policies.
create or replace function public.is_current_user_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_current_user_admin() from public;
grant execute on function public.is_current_user_admin() to authenticated;

drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Admins can read all profiles" on public.users;

create policy "Users can read own profile"
on public.users
for select
to authenticated
using ((select auth.uid()) = id or public.is_current_user_admin());

create policy "Users can update own profile"
on public.users
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Admins can read all profiles"
on public.users
for select
to authenticated
using (public.is_current_user_admin());
