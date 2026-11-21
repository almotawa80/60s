-- v274 teacher bell: computed notices (nothing stored)
create or replace function public.teacher_notices()
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare me uuid := sup.uid(); t date := private.today_kw(); y date; r jsonb;
begin
  if me is null then raise exception 'forbidden'; end if;
  y := t - 1; while extract(isodow from y) in (5, 6) loop y := y - 1; end loop;  -- last school day
  with cls as (select * from public.classes where teacher_id = me and not coalesce(archived, false)),
  comp as (select k.*, coalesce(k.group_id, k.id) g from public.competitions k join cls on cls.id = k.class_id),
  act as (select g, min(title) title, min(start_date) sd, (array_agg(class_id))[1] cid from comp
          where status <> 'finished' and paused_at is null and start_date <= t and coalesce(end_date, t) >= t group by g),
  stu as (select s.id, s.name, s.class_id from public.students s join cls on cls.id = s.class_id where s.approved is not false),
  gstu as (select a.g, s.id, s.name from act a join comp k on k.g = a.g join stu s on s.class_id = k.class_id),
  last_play as (select a2.student_id, max(a2.play_date) d from public.attempts a2 join comp k on k.id = a2.competition_id
                where a2.status = 'finished' and a2.kind <> 'practice' group by 1)
  select jsonb_build_object(
    'today', t, 'yday', y,
    'pending', coalesce((select jsonb_agg(jsonb_build_object('cid', c.id, 'cls', c.name, 'n', x.n)) from cls c
                 join (select class_id, count(*) n from public.students where approved = false group by 1) x on x.class_id = c.id), '[]'),
    'ended', coalesce((select jsonb_agg(e order by e->>'d' desc) from (
                 select jsonb_build_object('g', k.g, 'title', min(k.title), 'd', max(k.end_date), 'cid', (array_agg(k.class_id))[1], 'comp', (array_agg(k.id))[1],
                   'win', (select s.name from public.attempts a3 join public.students s on s.id = a3.student_id join comp k2 on k2.id = a3.competition_id
                           where k2.g = k.g and a3.status = 'finished' and a3.kind <> 'practice' group by s.id, s.name order by sum(a3.total_points) desc limit 1)) e
                 from comp k group by k.g having max(k.end_date) between t - 7 and t - 1 or (bool_and(k.status = 'finished') and max(k.end_date) >= t - 7)) z), '[]'),
    'yd', coalesce((select jsonb_agg(jsonb_build_object('g', a.g, 'title', a.title, 'n', (select count(distinct id) from gstu where g = a.g),
                 'p', (select count(distinct a4.student_id) from public.attempts a4 join comp k on k.id = a4.competition_id where k.g = a.g and a4.play_date = y and a4.status = 'finished' and a4.kind <> 'practice')))
                 from act a where a.sd <= y), '[]'),
    'idle', coalesce((select jsonb_agg(jsonb_build_object('g', a.g, 'title', a.title, 'n', z.n, 'names', z.names)) from act a
                 join lateral (select count(*) n, (array_agg(gs.name order by gs.name))[1:3] names from (select distinct gs0.id, gs0.name from gstu gs0 where gs0.g = a.g) gs
                   left join last_play lp on lp.student_id = gs.id where coalesce(lp.d, a.sd - 1) <= t - 3) z on z.n > 0
                 where a.sd <= t - 3), '[]')
  ) into r;
  return r;
end $$;
grant execute on function public.teacher_notices() to authenticated;
