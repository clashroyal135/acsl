-- Profile text remains private to its owner and administrators under the existing SELECT policies.
alter table public.profiles
  add column if not exists about_me text not null default '',
  add column if not exists avatar_path text;

alter table public.profiles
  add constraint profiles_about_me_length check (char_length(about_me) <= 1000),
  add constraint profiles_avatar_owned_path check (
    avatar_path is null or avatar_path ~ (
      '^' || id::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.](jpg|png|webp)$'
    )
  );

-- Allow administrators and students to edit their own profile, while protecting IDs and roles.
revoke update on public.profiles from public, anon, authenticated;
revoke update (id, display_name, role, created_at, updated_at, about_me, avatar_path) on public.profiles from public, anon, authenticated;
grant update (display_name, about_me, avatar_path, updated_at) on public.profiles to authenticated;
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-pictures', 'profile-pictures', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Uploads use a new UUID filename, so no overwrite/UPDATE policy is necessary.
create policy "profile pictures insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "profile pictures read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'profile-pictures' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "profile pictures delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-pictures' and (storage.foldername(name))[1] = (select auth.uid())::text);
