-- Run after the initial schema. These RPCs are only callable with the server's service role.
create or replace function public.admin_save_problem(p_problem jsonb, p_tests jsonb)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  saved public.problems;
begin
  if jsonb_typeof(p_tests) is distinct from 'array' then
    raise exception 'Tests must be an array';
  end if;
  if coalesce((p_problem->>'is_published')::boolean, false) and
     (jsonb_array_length(p_tests) = 0 or jsonb_array_length(p_problem->'samples') = 0) then
    raise exception 'Published problems need a sample and a grading test';
  end if;
  if p_problem->>'id' is not null and exists (
    select 1 from public.problems where id = p_problem->>'id' and slug <> p_problem->>'slug'
  ) then
    raise exception 'An existing problem must keep its original slug';
  end if;
  if exists (
    select 1 from public.problems where slug = p_problem->>'slug'
      and p_problem->>'id' is not null and id <> p_problem->>'id'
  ) then
    raise exception 'This slug belongs to another problem';
  end if;
  insert into public.problems (
    id, slug, title, division, difficulty, topic, year, acceptance_rate, summary,
    statement, input_spec, output_spec, constraints, samples, hints, starter_code,
    time_limit_ms, memory_limit_kb, is_published
  ) values (
    coalesce(nullif(p_problem->>'id', ''), gen_random_uuid()::text),
    p_problem->>'slug', p_problem->>'title', p_problem->>'division', p_problem->>'difficulty',
    p_problem->>'topic', (p_problem->>'year')::integer, (p_problem->>'acceptance_rate')::numeric,
    p_problem->>'summary', p_problem->>'statement', p_problem->>'input_spec', p_problem->>'output_spec',
    p_problem->'constraints', p_problem->'samples', p_problem->'hints', p_problem->'starter_code',
    (p_problem->>'time_limit_ms')::integer, (p_problem->>'memory_limit_kb')::integer,
    (p_problem->>'is_published')::boolean
  ) on conflict (slug) do update set
    title = excluded.title, division = excluded.division, difficulty = excluded.difficulty,
    topic = excluded.topic, year = excluded.year, acceptance_rate = excluded.acceptance_rate,
    summary = excluded.summary, statement = excluded.statement, input_spec = excluded.input_spec,
    output_spec = excluded.output_spec, constraints = excluded.constraints, samples = excluded.samples,
    hints = excluded.hints, starter_code = excluded.starter_code, time_limit_ms = excluded.time_limit_ms,
    memory_limit_kb = excluded.memory_limit_kb, is_published = excluded.is_published, updated_at = now()
  returning * into saved;
  -- Failed tests roll back the entire save, including replacement of the previous tests.
  delete from public.test_cases where problem_id = saved.id;
  insert into public.test_cases (problem_id, input, expected_output, is_hidden, position)
  select saved.id, entry->>'input', entry->>'expectedOutput',
    coalesce((entry->>'hidden')::boolean, true), (position - 1)::integer
  from jsonb_array_elements(p_tests) with ordinality as tests(entry, position);
  return to_jsonb(saved);
end;
$$;

revoke all on function public.admin_save_problem(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_problem(jsonb, jsonb) to service_role;

create or replace function public.admin_student_progress(p_user_ids uuid[])
returns table (
  user_id uuid, submission_count bigint, solved_problem_ids text[],
  attempted_problem_ids text[], last_submission_at timestamptz
)
language sql stable
set search_path = public
as $$
  select s.user_id, count(*),
    coalesce(array_agg(distinct s.problem_id) filter (where s.verdict = 'Accepted'), array[]::text[]),
    array_agg(distinct s.problem_id), max(s.created_at)
  from public.submissions s where s.user_id = any(p_user_ids) group by s.user_id
$$;

revoke all on function public.admin_student_progress(uuid[]) from public, anon, authenticated;
grant execute on function public.admin_student_progress(uuid[]) to service_role;

drop policy if exists "admins read profiles" on public.profiles;
create policy "admins read profiles" on public.profiles for select using (public.is_admin());
