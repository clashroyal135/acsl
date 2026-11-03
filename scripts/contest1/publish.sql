-- Publish the reviewed Contest 1 library atomically after staging with payload.cjs.
-- Retired submission records remain intact (problem_id is not a foreign key).
begin;
do $$
declare
  expected text[] := array[
    'triangles-2007-junior',
    'triangles-2007-intermediate',
    'triangles-2007-senior',
    'acsl-bridge-2008-junior',
    'acsl-bridge-2008-intermediate',
    'acsl-bridge-2008-senior',
    'acsl-golf-2009-junior',
    'acsl-golf-2009-intermediate',
    'acsl-golf-2009-senior',
    'acsl-prints-2010-junior',
    'acsl-prints-2010-intermediate',
    'acsl-prints-2010-senior',
    'draft-picks-2011-junior',
    'draft-picks-2011-intermediate',
    'draft-picks-2011-senior',
    'time-sheets-2012-junior',
    'time-sheets-2012-intermediate',
    'time-sheets-2012-senior',
    'acsl-scrabble-2013-junior',
    'acsl-scrabble-2013-intermediate',
    'acsl-scrabble-2013-senior',
    'navigating-acslland-2014-junior',
    'navigating-acslland-2014-intermediate',
    'navigating-acslland-2014-senior',
    'acsl-chmod-2015-junior',
    'acsl-chmod-2015-intermediate',
    'acsl-chmod-2015-senior',
    'acsl-agram-2016-junior',
    'acsl-agram-2016-intermediate',
    'acsl-agram-2016-senior',
    'acsl-ninety-nine-2017-junior',
    'acsl-ninety-nine-2017-intermediate',
    'acsl-ninety-nine-2017-senior',
    'digit-reassembly-2018-junior',
    'digit-reassembly-2018-intermediate',
    'digit-reassembly-2018-senior',
    'number-transformation-2019-junior',
    'number-transformation-2019-intermediate',
    'number-transformation-2019-senior',
    'numeral-triangles-2020-junior',
    'numeral-triangles-2020-intermediate',
    'numeral-triangles-2020-senior',
    'fibonacci-clock-2021-junior',
    'fibonacci-clock-2021-intermediate',
    'fibonacci-clock-2021-senior',
    'next-base-2022-junior',
    'next-base-2022-intermediate',
    'next-base-2022-senior',
    'acsl-tiles-2023-intermediate',
    'acsl-tiles-2023-senior',
    'rings-2024-junior',
    'rings-2024-intermediate',
    'rings-2024-senior'
  ];
  retired text[] := array['letter-relay','shared-signal','run-recorder','logic-stack','beacon-distance','route-ledger'];
begin
  if (select count(*) from public.problems where slug=any(expected))<>53 then
    raise exception 'Stage all 53 reviewed variants before publishing';
  end if;
  if exists (
    select 1 from public.problems p
    where p.slug=any(expected) and (
      jsonb_array_length(p.samples)=0 or
      (select count(*) from public.test_cases t where t.problem_id=p.id and t.is_hidden)<>12 or
      (select count(*) from public.test_cases t where t.problem_id=p.id and not t.is_hidden)<>jsonb_array_length(p.samples)
    )
  ) then raise exception 'Every variant needs its public samples and exactly 12 hidden tests'; end if;
  if exists(select 1 from public.problems where is_published and not(slug=any(expected)) and not(slug=any(retired))) then
    raise exception 'An unexpected published problem needs review before replacement';
  end if;
  delete from public.problems where slug=any(retired);
  update public.problems set is_published=true,updated_at=now() where slug=any(expected);
  if (select count(*) from public.problems where is_published)<>53 then
    raise exception 'Published catalog count differs from the reviewed import';
  end if;
end;
$$;
commit;
select count(*) as published_versions,count(distinct (title,year)) as problem_groups,
  (select count(*) from public.test_cases t join public.problems p on p.id=t.problem_id where p.is_published and t.is_hidden) as hidden_cases,
  (select count(*) from public.test_cases t join public.problems p on p.id=t.problem_id where p.is_published and not t.is_hidden) as public_cases
from public.problems where is_published;
