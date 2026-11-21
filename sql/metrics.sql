-- v173 admin metrics (retention D1/D7/D30, daily play rate, streaks). Admin only.
create or replace function public.admin_metrics() returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare t date := private.today_kw(); r jsonb;
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  with p as (
    select student_id, play_date from public.attempts where status = 'finished' and kind in ('official','knockout') group by 1, 2
  ), f as (select student_id, min(play_date) d0 from p group by 1),
  ret as (
    select n, lo, hi,
      count(*) filter (where f.d0 <= t - hi) base,
      count(*) filter (where f.d0 <= t - hi and exists (select 1 from p where p.student_id = f.student_id and p.play_date between f.d0 + lo and f.d0 + hi)) back
    from f cross join (values (1, 1, 2), (7, 7, 13), (30, 30, 44)) v(n, lo, hi) group by n, lo, hi
  ),
  act as ( -- students in classes with an active challenge
    select s.id from public.students s where coalesce(s.approved, true)
      and exists (select 1 from public.competitions c where c.class_id = s.class_id and c.status = 'active')
  ),
  days as (
    select g::date d, (select count(distinct p.student_id) from p join act on act.id = p.student_id where p.play_date = g::date) played
    from generate_series(t - 13, t, interval '1 day') g
  )
  select jsonb_build_object(
    'ret', (select jsonb_object_agg('d' || n, jsonb_build_object('base', base, 'back', back)) from ret),
    'active', (select count(*) from act),
    'days', (select jsonb_agg(jsonb_build_object('d', d, 'n', played) order by d) from days),
    'streak', (select jsonb_build_object('avg', round(avg((private.student_streak_info(x.student_id) ->> 'n')::int), 1), 'max', max((private.student_streak_info(x.student_id) ->> 'n')::int))
               from (select distinct student_id from p where play_date >= t - 6) x),
    'boxes', (select count(*) from public.student_boxes where opened_at >= now() - interval '7 days')
  ) into r;
  return r;
end $$;
revoke all on function public.admin_metrics() from public;
grant execute on function public.admin_metrics() to authenticated;
select 'ok' as done;
