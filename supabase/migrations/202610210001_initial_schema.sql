-- ACSL Practice initial schema. Run with `supabase db push` or in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Coder' check (char_length(display_name) between 1 and 60),
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.problems (
  id text primary key default gen_random_uuid()::text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  title text not null,
  division text not null check (division in ('Junior', 'Intermediate', 'Senior')),
  difficulty text not null check (difficulty in ('Easy', 'Medium', 'Hard')),
  topic text not null,
  year integer not null check (year between 2000 and 2200),
  acceptance_rate numeric(5,2) not null default 0 check (acceptance_rate between 0 and 100),
  summary text not null,
  statement text not null,
  input_spec text not null,
  output_spec text not null,
  constraints jsonb not null default '[]'::jsonb,
  samples jsonb not null default '[]'::jsonb,
  hints jsonb not null default '[]'::jsonb,
  starter_code jsonb not null,
  time_limit_ms integer not null default 2000 check (time_limit_ms between 250 and 15000),
  memory_limit_kb integer not null default 128000 check (memory_limit_kb between 16000 and 512000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.test_cases (
  id uuid primary key default gen_random_uuid(),
  problem_id text not null references public.problems(id) on delete cascade,
  input text not null,
  expected_output text not null,
  is_hidden boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Text rather than a foreign key also supports the server-bundled original problems.
  problem_id text not null,
  language text not null check (language in ('python', 'cpp', 'java')),
  source_code text not null check (char_length(source_code) <= 100000),
  verdict text not null check (verdict in ('Accepted', 'Wrong Answer', 'Compilation Error', 'Runtime Error', 'Time Limit Exceeded', 'Internal Error')),
  passed_tests integer not null default 0,
  total_tests integer not null default 0,
  execution_time_ms integer,
  memory_kb integer,
  created_at timestamptz not null default now()
);

create index if not exists submissions_user_created_idx on public.submissions(user_id, created_at desc);
create index if not exists submissions_problem_verdict_idx on public.submissions(problem_id, verdict);
create index if not exists test_cases_problem_position_idx on public.test_cases(problem_id, position);

alter table public.profiles enable row level security;
alter table public.problems enable row level security;
alter table public.test_cases enable row level security;
alter table public.submissions enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

drop policy if exists "profiles read own" on public.profiles;
create policy "profiles read own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id and role = 'student');

drop policy if exists "published problems are public" on public.problems;
create policy "published problems are public" on public.problems for select using (is_published or public.is_admin());
drop policy if exists "admins manage problems" on public.problems;
create policy "admins manage problems" on public.problems for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admins manage test cases" on public.test_cases;
create policy "admins manage test cases" on public.test_cases for all using (public.is_admin()) with check (public.is_admin());
-- Intentionally no student SELECT policy for test_cases. The service role grades server-side.

drop policy if exists "students read own submissions" on public.submissions;
create policy "students read own submissions" on public.submissions for select using (auth.uid() = user_id);
drop policy if exists "admins read submissions" on public.submissions;
create policy "admins read submissions" on public.submissions for select using (public.is_admin());
-- Submission insertion is intentionally server-only through the service role.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), split_part(new.email, '@', 1), 'Coder'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

-- Promote an administrator manually after their account exists:
-- update public.profiles set role = 'admin' where id = '<user uuid>';
