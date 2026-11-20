-- Allow «صح أو خطأ» questions: 2 options (صح، خطأ). Multiple choice stays 4.
alter table public.questions drop constraint if exists questions_options_check;
alter table public.questions add constraint questions_options_check
  check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 4);
alter table public.questions drop constraint if exists questions_correct_index_check;
alter table public.questions add constraint questions_correct_index_check
  check (correct_index >= 0 and correct_index < greatest(jsonb_array_length(options), 1) and correct_index <= 3);

-- «رتّب» questions: payload {"kind":"order"}, options = items in the right order (3-4), shown shuffled.
-- The student taps the items in order; the app sends one number: 1 followed by the tapped positions (e.g. 12031).
do $$
declare d text;
begin
  d := pg_get_functiondef('public.start_attempt'::regproc);
  d := replace(d, 'jsonb_array_length(q.options) = 4) then', 'jsonb_array_length(q.options) >= 3) then');
  d := replace(d, 'from generate_series(0, 3) g;', 'from generate_series(0, (select jsonb_array_length(q2.options) - 1 from public.questions q2 where q2.id = v_ids[v_pos])) g;');
  execute d;
end $$;

CREATE OR REPLACE FUNCTION public.submit_answer(p_token uuid, p_attempt uuid, p_position integer, p_chosen integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public', 'private'
AS $function$
declare v_sid uuid; v_a public.attempts; v_st jsonb; v_aq public.attempt_questions; v_q public.questions; v_set jsonb;
        v_el numeric; v_ok boolean := false; v_pts int := 0; v_next jsonb; v_cur int; v_mode text; v_base int; v_orig int; v_disp int; v_show text;
        v_isord boolean; v_n int; v_k int; v_d int; v_ord jsonb;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_a from public.attempts where id = p_attempt and student_id = v_sid;
  if not found then raise exception 'attempt_not_found'; end if;
  v_set := private.tset(private.teacher_of_student(v_sid));
  v_show := coalesce(v_set->>'show_ans', 'each');
  v_st := private.attempt_state(p_attempt);
  v_cur := coalesce((v_st->>'position')::int, 5);
  if p_position < v_cur then
    select * into v_aq from public.attempt_questions where attempt_id = p_attempt and position = p_position;
    select * into v_q from public.questions where id = v_aq.question_id;
    v_disp := case when v_aq.perm is null then v_q.correct_index else array_position(v_aq.perm, v_q.correct_index) - 1 end;
    return jsonb_build_object(
      'result', jsonb_build_object('correct', coalesce(v_aq.is_correct, false), 'correct_index', case when v_show = 'each' then v_disp end, 'points', coalesce(v_aq.points, 0), 'timeout', true),
      'next', v_st, 'summary', case when (v_st->>'finished')::boolean then private.attempt_summary(v_sid, p_attempt) end);
  end if;
  if p_position > v_cur then raise exception 'wrong_position'; end if;
  v_mode := coalesce(v_set->>'scoring', 'speed');
  select * into v_aq from public.attempt_questions where attempt_id = p_attempt and position = p_position;
  select * into v_q from public.questions where id = v_aq.question_id;
  v_base := private.lvl_pts(v_set, v_q.level);
  v_el := extract(epoch from (now() - v_aq.served_at));
  v_isord := coalesce(v_q.payload->>'kind', '') = 'order';
  if v_isord then
    v_n := jsonb_array_length(v_q.options);
    select jsonb_agg(case when v_aq.perm is null then k else array_position(v_aq.perm, k) - 1 end order by k) into v_ord from generate_series(0, v_n - 1) k;
    v_orig := null; v_disp := null;
    if p_chosen is not null and p_chosen >= power(10, v_n)::int and p_chosen < 2 * power(10, v_n)::int and v_el <= 17 then
      v_ok := true;
      for v_k in 0 .. v_n - 1 loop
        v_d := (p_chosen / power(10, v_n - 1 - v_k)::int) % 10;
        if v_d >= v_n or (case when v_aq.perm is null then v_d else v_aq.perm[v_d + 1] end) <> v_k then v_ok := false; end if;
      end loop;
      v_orig := case when v_ok then 0 else 1 end;
    end if;
  else
    v_orig := case when p_chosen is null then null when v_aq.perm is null then p_chosen else v_aq.perm[p_chosen + 1] end;
    v_disp := case when v_aq.perm is null then v_q.correct_index else array_position(v_aq.perm, v_q.correct_index) - 1 end;
    if p_chosen is not null and p_chosen between 0 and 3 and v_el <= 17 then v_ok := (v_orig = v_q.correct_index); end if;
  end if;
  if p_chosen is not null and v_el <= 17 and (v_isord or p_chosen between 0 and 3) then
    if v_ok then
      v_pts := v_base + case when v_mode = 'correct' then 0
        else round(v_base * greatest(0, least(100, coalesce((v_set->>'speed_pct')::int, 50))) / 100.0 * greatest(0, 15 - v_el) / 15.0)::int end;
    elsif v_mode = 'penalty' then
      v_pts := -round(v_base * greatest(0, least(100, coalesce((v_set->>'pen_pct')::int, 25))) / 100.0)::int;
    end if;
  end if;
  update public.attempt_questions set answered_at = now(), chosen_index = v_orig, is_correct = v_ok, points = v_pts where id = v_aq.id;
  v_next := private.attempt_state(p_attempt);
  return jsonb_build_object(
    'result', jsonb_build_object('correct', v_ok, 'correct_index', case when v_show = 'each' then v_disp end, 'order', case when v_show = 'each' then v_ord end, 'points', v_pts, 'elapsed', v_el, 'timeout', (p_chosen is null)),
    'next', v_next, 'summary', case when (v_next->>'finished')::boolean then private.attempt_summary(v_sid, p_attempt) end);
end $function$;
