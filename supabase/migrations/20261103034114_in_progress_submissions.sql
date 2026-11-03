alter table public.submissions drop constraint submissions_verdict_check;
alter table public.submissions add constraint submissions_verdict_check check (
  verdict in ('Accepted', 'In progress', 'Wrong Answer', 'Compilation Error', 'Runtime Error', 'Time Limit Exceeded', 'Internal Error')
);
