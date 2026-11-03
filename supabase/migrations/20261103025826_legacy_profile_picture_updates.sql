-- Legacy accounts can update pictures/preferences without inventing a full name.
-- Registration and every explicit full-name write still require a valid name.
alter table public.profiles drop constraint profiles_full_name_required;
create or replace function public.validate_profile_full_name()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if char_length(regexp_replace(coalesce(new.full_name, ''), '^[[:space:]]+|[[:space:]]+$', '', 'g')) not between 1 and 60 then
    raise exception using errcode = '23514', message = 'Full name must be between 1 and 60 characters';
  end if;
  return new;
end;
$$;
revoke all on function public.validate_profile_full_name() from public, anon, authenticated;
create trigger validate_profile_full_name before insert or update of full_name on public.profiles
  for each row execute function public.validate_profile_full_name();
