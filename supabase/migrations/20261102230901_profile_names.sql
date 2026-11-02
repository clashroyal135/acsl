-- Display names remain the public identity. Personal names are private by default.
alter table public.profiles
  add column if not exists full_name text not null default '',
  add column if not exists show_name boolean not null default false;

alter table public.profiles
  add constraint profiles_full_name_length check (char_length(full_name) <= 60),
  add constraint profiles_visible_name_not_empty check (not show_name or char_length(btrim(full_name)) > 0);

grant update (full_name, show_name) on public.profiles to authenticated;

-- Keep the existing owner/admin SELECT policies. Public pages use an explicit server-side projection.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name, full_name, show_name)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'display_name'), ''), 'Coder'),
    coalesce(btrim(new.raw_user_meta_data->>'full_name'), ''),
    false
  );
  return new;
end;
$$;

-- This function is used only by the existing Auth trigger, not as a callable API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
