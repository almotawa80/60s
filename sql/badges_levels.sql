-- v154: badges with levels. student_home.badges = [{k, n}] where n = progress count; the app turns n into bronze/silver/gold.
create or replace function public.student_home(p_token uuid)
 returns jsonb language plpgsql security definer set search_path to 'public', 'private'
as $function$
declare v_sid uuid; v_s public.students; v_cl public.classes; v_c public.competitions;
        v_phase text := 'none'; v_pts int := 0; v_rank int; v_played boolean := false; v_inprog uuid; v_count int; v_comp jsonb;
        v_streak int; v_best int; v_badges jsonb := '[]'::jsonb; v_gap int; v_wrong int; v_prac int;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_s from public.students where id = v_sid;
  select * into v_cl from public.classes where id = v_s.class_id;
  select * into v_c from public.competitions where class_id = v_cl.id and status = 'active' order by created_at desc limit 1;
  select count(*) into v_count from public.students where class_id = v_cl.id;
  if v_c.id is not null then
    v_phase := private.phase_of(v_c.start_date, v_c.points_end_date, v_c.end_date);
    v_pts := coalesce((select sum(total_points) from public.attempts where student_id = v_sid and competition_id = v_c.id and kind = 'official' and status = 'finished'), 0);
    v_rank := private.class_rank(v_sid, v_c.id, null);
    v_played := exists (select 1 from public.attempts where student_id = v_sid and competition_id = v_c.id and kind = 'official' and status = 'finished' and play_date = private.today_kw());
    select id into v_inprog from public.attempts where student_id = v_sid and kind = 'official' and status = 'in_progress' and play_date = private.today_kw() limit 1;
    if v_rank > 1 then
      select min(st.pts) - v_pts into v_gap from private.standings(v_cl.id, v_c.id, null) st where st.r < v_rank;
    end if;
    v_comp := jsonb_build_object('id', v_c.id, 'title', v_c.title, 'start_date', v_c.start_date, 'points_end_date', v_c.points_end_date,
                                 'end_date', v_c.end_date, 'phase', v_phase, 'days_left_points', greatest(0, v_c.points_end_date - private.today_kw()), 'prizes', v_c.prizes);
  end if;
  v_streak := private.student_streak(v_sid);
  select count(*) into v_prac from public.attempts where student_id = v_sid and kind = 'practice' and status = 'finished';
  select count(distinct aq.question_id) into v_wrong from public.attempt_questions aq join public.attempts a on a.id = aq.attempt_id
    where a.student_id = v_sid and aq.is_correct is false and aq.answered_at is not null
      and not exists (select 1 from public.attempt_questions aq2 join public.attempts a2 on a2.id = aq2.attempt_id
                      where a2.student_id = v_sid and aq2.question_id = aq.question_id and aq2.is_correct and aq2.answered_at > aq.answered_at);
  select coalesce(max(c), 0) into v_best from (select count(*) c from (select play_date, play_date - (row_number() over (order by play_date))::int g
      from (select distinct play_date from public.attempts where student_id = v_sid and status = 'finished') d) x group by g) y;
  v_badges := jsonb_build_array(
    jsonb_build_object('k','fast','n', (select count(*) from public.attempt_questions aq join public.attempts a on a.id = aq.attempt_id
        where a.student_id = v_sid and aq.is_correct and aq.answered_at - aq.served_at < interval '3 seconds')),
    jsonb_build_object('k','first','n', (select count(*) from public.attempts where student_id = v_sid and kind = 'official' and status = 'finished')),
    jsonb_build_object('k','practice','n', v_prac),
    jsonb_build_object('k','streak','n', greatest(v_best, coalesce(v_streak, 0))),
    jsonb_build_object('k','perfect','n', (select count(*) from public.attempts where student_id = v_sid and status = 'finished' and correct_count = 4)),
    jsonb_build_object('k','correct','n', (select count(*) from public.attempt_questions aq join public.attempts a on a.id = aq.attempt_id
        where a.student_id = v_sid and aq.is_correct))
  );
  return jsonb_build_object(
    'student', jsonb_build_object('id', v_s.id, 'name', v_s.name, 'student_no', v_s.student_no, 'gender', v_s.gender, 'avatar', v_s.avatar),
    'class', jsonb_build_object('id', v_cl.id, 'name', v_cl.name, 'style', v_cl.style, 'size', v_count),
    'competition', v_comp, 'phase', v_phase, 'total_points', v_pts, 'rank', v_rank,
    'played_today', v_played, 'in_progress_attempt', v_inprog,
    'streak', v_streak, 'badges', v_badges, 'gap', v_gap, 'wrong_count', v_wrong);
end $function$;

select position('''correct''' in pg_get_functiondef('public.student_home(uuid)'::regprocedure)) > 0 as ok;
