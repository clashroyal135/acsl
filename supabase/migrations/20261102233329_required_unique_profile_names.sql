-- Resolve the existing duplicate pair using the site owner's chosen names.
-- IDs are selected from the database rather than hardcoded.
do $$
declare
  duplicate_count integer;
  newer_account uuid;
begin
  select count(*) into duplicate_count from public.profiles
  where lower(regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) = 'bob';
  if duplicate_count > 1 then
    if duplicate_count <> 2 then raise exception 'Review the duplicate Bob accounts before continuing'; end if;
    if exists (select 1 from public.profiles where lower(regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) = 'bob2') then
      raise exception 'Bob2 is already taken; choose another display name';
    end if;
    select id into newer_account from public.profiles
    where lower(regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) = 'bob'
    order by created_at desc, id desc limit 1;
    update public.profiles set display_name = 'Bob2', updated_at = now() where id = newer_account;
  end if;
end;
$$;

-- This index also protects concurrent signups and direct profile updates.
create unique index profiles_display_name_unique
on public.profiles (lower(regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')));

-- Existing blank full names are preserved until those accounts next save a profile.
-- NOT VALID still enforces these requirements for every new or updated row.
alter table public.profiles
  add constraint profiles_display_name_required check (char_length(regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) > 0) not valid,
  add constraint profiles_full_name_required check (char_length(regexp_replace(full_name, '^[[:space:]]+|[[:space:]]+$', '', 'g')) > 0) not valid;

create or replace function public.admin_display_name_available(p_display_name text)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select char_length(regexp_replace(coalesce(p_display_name, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g')) between 1 and 60
    and not exists (
      select 1 from public.profiles
      where lower(regexp_replace(display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
          = lower(regexp_replace(p_display_name, '^[[:space:]]+|[[:space:]]+$', '', 'g'))
    )
$$;
revoke all on function public.admin_display_name_available(text) from public, anon, authenticated;
grant execute on function public.admin_display_name_available(text) to service_role;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  chosen_display_name text;
  chosen_full_name text;
begin
  chosen_display_name := regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  chosen_full_name := regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  if char_length(chosen_display_name) not between 1 and 60 or char_length(chosen_full_name) not between 1 and 60 then
    raise exception using errcode = '23514', message = 'Display name and full name are required and must be between 1 and 60 characters';
  end if;
  insert into public.profiles(id, display_name, full_name, show_name)
  values (new.id, chosen_display_name, chosen_full_name, false);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
