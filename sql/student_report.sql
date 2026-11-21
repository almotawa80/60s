-- v270 student report (teacher page + PDF + student «تقريري»)
-- Uses attempt_questions snapshot columns (subject, lesson, level) so reports survive question edits/deletes.

create or replace function private.stu_report(p_student uuid, p_full boolean default true)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare r jsonb; v_cls uuid; v_name text; v_av text; v_cname text; v_cu text;
begin
  select s.class_id, s.name, s.avatar into v_cls, v_name, v_av from public.students s where s.id = p_student;
  select c.name, c.subject into v_cname, v_cu from public.classes c where c.id = coalesce(v_cls, (select del_from from public.students where id = p_student));
  with att as (
    select a.* from public.attempts a where a.student_id = p_student and a.status = 'finished'
  ), aq as (
    select a.id aid, a.kind, a.play_date, a.started_at, aqs.is_correct, aqs.chosen_index, aqs.position,
           coalesce(nullif(aqs.lesson,''), nullif(q.lesson,''), nullif(aqs.subject,''), nullif(q.subject,''), 'عام') as les,
           coalesce(nullif(aqs.subject,''), nullif(q.subject,''), '') as subj,
           q.body, q.options, q.correct_index, q.payload,
           extract(epoch from (aqs.answered_at - aqs.served_at)) as secs
    from att a join public.attempt_questions aqs on aqs.attempt_id = a.id
    left join public.questions q on q.id = aqs.question_id
    where a.kind <> 'practice'
  ), wk as (
    select (play_date - extract(dow from play_date)::int) w, count(*) t, count(*) filter (where is_correct) c from aq group by 1
  ), les as (
    select les, max(subj) subj, count(*) t, count(*) filter (where is_correct) c from aq group by les
  ), cls_rank as (
    select a.student_id, sum(a.total_points) p from public.attempts a join public.students s on s.id = a.student_id
    where s.class_id = v_cls and a.status = 'finished' and a.kind <> 'practice' group by a.student_id
  ), comps as (
    select a.competition_id cid, sum(a.total_points) p from att a where a.kind <> 'practice' and a.competition_id is not null group by 1
  )
  select jsonb_build_object(
    'name', v_name, 'avatar', v_av, 'cls', v_cname, 'subject', v_cu,
    'xp', private.student_xp(p_student), 'streak', (private.student_streak_info(p_student))->'n',
    'rounds', (select count(*) from att where kind <> 'practice'),
    'practice', (select count(*) from att where kind = 'practice'),
    'total', (select count(*) from aq), 'correct', (select count(*) filter (where is_correct) from aq),
    'avg_secs', (select round(avg(secs) filter (where secs between 0 and 60)::numeric, 1) from aq where chosen_index is not null),
    'from', (select min(play_date) from att), 'to', (select max(play_date) from att),
    'rank', (select 1 + count(*) from cls_rank x where x.p > coalesce((select p from cls_rank where student_id = p_student), 0)),
    'of', (select count(*) from public.students where class_id = v_cls and approved is not false),
    'weeks', coalesce((select jsonb_agg(jsonb_build_object('w', w, 't', t, 'c', c) order by w) from (select * from wk order by w desc limit 8) x), '[]'),
    'lessons', coalesce((select jsonb_agg(jsonb_build_object('l', les, 's', subj, 't', t, 'c', c) order by t desc) from (select * from les order by t desc limit 14) x), '[]'),
    'wrong', case when p_full then coalesce((select jsonb_agg(jsonb_build_object('q', body, 'right', case when payload->>'kind' = 'order' then (select string_agg(x, ' ← ') from jsonb_array_elements_text(options) x) else options->>correct_index end,
                 'chosen', case when chosen_index is null then null when payload->>'kind' = 'order' then '✗' else options->>chosen_index end, 'l', les))
                 from (select * from aq where is_correct is false and body is not null order by started_at desc, position desc limit 30) w), '[]') else '[]'::jsonb end,
    'comps', case when p_full then coalesce((select jsonb_agg(jsonb_build_object('t', c.title, 'st', c.status, 'p', x.p,
                 'r', (select 1 + count(*) from (select a2.student_id, sum(a2.total_points) p2 from public.attempts a2 where a2.competition_id = x.cid and a2.status = 'finished' and a2.kind <> 'practice' group by 1) y where y.p2 > x.p))
                 order by c.start_date desc) from comps x join public.competitions c on c.id = x.cid), '[]') else '[]'::jsonb end,
    'gone', (select count(distinct play_date) from att where kind <> 'practice' and competition_id is null)
  ) into r;
  return r;
end $$;
revoke all on function private.stu_report(uuid, boolean) from public, anon, authenticated;

create or replace function public.teacher_student_report2(p_student uuid)
returns jsonb language plpgsql security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.students s left join public.classes c on c.id = s.class_id
                 where s.id = p_student and (c.teacher_id = sup.uid() or (s.class_id is null and s.del_teacher = sup.uid()))) then
    raise exception 'forbidden';
  end if;
  return private.stu_report(p_student, true)
    || jsonb_build_object('teacher', (select display_name from public.teachers where id = sup.uid()),
                          'school', (select settings->>'school' from public.teachers where id = sup.uid()));
end $$;
grant execute on function public.teacher_student_report2(uuid) to authenticated;

create or replace function public.student_my_report(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare v uuid := private.student_from_token(p_token);
begin
  return private.stu_report(v, false) - 'rank' - 'of';
end $$;
grant execute on function public.student_my_report(uuid) to anon, authenticated;
