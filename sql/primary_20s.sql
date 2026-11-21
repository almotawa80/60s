-- v188: primary classes (grades 1-5) play 3 questions x 20 seconds; others stay 4 x 15.
-- Safe to run once. Each patch checks the old text exists, otherwise it stops with an error and changes nothing.
begin;

alter table public.attempts add column if not exists nq smallint not null default 4;
alter table public.attempts add column if not exists secs smallint not null default 15;

-- same rule as the app's stageOf(): grade number in class name (Arabic or English digits) or Arabic ordinal word; 1-5 = primary
create or replace function private.is_primary(p_name text) returns boolean
language plpgsql immutable as $$
declare t text := translate(coalesce(p_name, ''), '٠١٢٣٤٥٦٧٨٩', '0123456789'); g int; w text[] := array['الأول','الثاني','الثالث','الرابع','الخامس','السادس','السابع','الثامن','التاسع','العاشر','الحادي عشر','الثاني عشر']; i int;
begin
  g := nullif(substring(t from '\d+'), '')::int;
  if g is null or g = 0 then
    for i in reverse 12..1 loop
      if position(w[i] in t) > 0 then g := i; exit; end if;
    end loop;
  end if;
  return coalesce(g, 0) between 1 and 5;
end $$;

create or replace function private._patch(p_fn regprocedure, p_pairs text[]) returns void
language plpgsql as $$
declare src text := pg_get_functiondef(p_fn); i int;
begin
  for i in 1..array_length(p_pairs, 1) / 2 loop
    if position(p_pairs[2*i-1] in src) = 0 then raise exception 'patch % : text not found: %', p_fn, p_pairs[2*i-1]; end if;
    src := replace(src, p_pairs[2*i-1], p_pairs[2*i]);
  end loop;
  execute src;
end $$;

select private._patch('public.start_attempt(uuid,text)', array[
  'v_perm int[];', 'v_perm int[]; v_n int := 4; v_secs int := 15;',
  'v_set := private.tset(v_cl.teacher_id);', 'v_set := private.tset(v_cl.teacher_id); if private.is_primary(v_cl.name) then v_n := 3; v_secs := 20; end if;',
  'select avg(x.correct_count) / 4.0 into v_acc from (select a.correct_count from', 'select avg(x.correct_count::numeric / greatest(x.nq, 1)) into v_acc from (select a.correct_count, a.nq from',
  'group by aq.question_id order by random() limit 4) x;', 'group by aq.question_id order by random() limit v_n) x;',
  'foreach v_lv in array v_levels loop', 'v_levels := v_levels[1:v_n]; foreach v_lv in array v_levels loop',
  'insert into public.attempts(student_id, competition_id, kind, play_date) values (v_sid, v_c.id, p_kind, private.today_kw())',
    'insert into public.attempts(student_id, competition_id, kind, play_date, nq, secs) values (v_sid, v_c.id, p_kind, private.today_kw(), v_n, v_secs)',
  'for v_pos in 1..4 loop', 'for v_pos in 1..v_n loop'
]);

select private._patch('private.attempt_state(uuid)', array[
  'if v_el > 17 then', 'if v_el > v_a.secs + 2 then',
  '''total'', 4,', '''total'', v_a.nq, ''secs'', v_a.secs,',
  'greatest(0, 15 - v_el)', 'greatest(0, v_a.secs - v_el)'
]);

select private._patch('public.submit_answer(uuid,uuid,integer,integer)', array[
  'v_el <= 17', 'v_el <= v_a.secs + 2',
  'greatest(0, 15 - v_el) / 15.0', 'greatest(0, v_a.secs - v_el) / v_a.secs::numeric'
]);

select private._patch('private.attempt_summary(uuid,uuid)', array[
  '''kind'', v_a.kind, ''total_points''', '''kind'', v_a.kind, ''total'', v_a.nq, ''total_points'''
]);

select private._patch('private.standings(uuid,uuid,uuid)', array[
  'count(fa.id)::int rounds,', 'count(fa.id)::int rounds, coalesce(sum(fa.nq), 0)::int qs,',
  '(t.rounds * 4)', 'greatest(t.qs, 1)'
]);

select private._patch((select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'student_home'), array[
  'correct_count = 4', 'correct_count = nq'
]);

drop function private._patch(regprocedure, text[]);
commit;
