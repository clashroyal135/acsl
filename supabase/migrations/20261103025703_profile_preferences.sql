alter table public.profiles
  add column division text not null default 'Junior' check (division in ('Junior', 'Intermediate', 'Senior')),
  add column preferred_language text not null default 'python' check (preferred_language in ('python', 'cpp', 'java'));

grant update (division, preferred_language) on public.profiles to authenticated;

-- Preferences are user-editable settings, never authorization claims.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  chosen_display_name text;
  chosen_full_name text;
  chosen_division text;
  chosen_language text;
begin
  chosen_display_name := regexp_replace(coalesce(new.raw_user_meta_data->>'display_name', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  chosen_full_name := regexp_replace(coalesce(new.raw_user_meta_data->>'full_name', ''), '^[[:space:]]+|[[:space:]]+$', '', 'g');
  chosen_division := coalesce(new.raw_user_meta_data->>'division', 'Junior');
  chosen_language := coalesce(new.raw_user_meta_data->>'preferred_language', 'python');
  if char_length(chosen_display_name) not between 1 and 60 or char_length(chosen_full_name) not between 1 and 60 then
    raise exception using errcode = '23514', message = 'Display name and full name are required and must be between 1 and 60 characters';
  end if;
  if chosen_division not in ('Junior', 'Intermediate', 'Senior') or chosen_language not in ('python', 'cpp', 'java') then
    raise exception using errcode = '23514', message = 'Choose a valid division and programming language';
  end if;
  insert into public.profiles(id, display_name, full_name, show_name, division, preferred_language)
  values (new.id, chosen_display_name, chosen_full_name, false, chosen_division, chosen_language);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
