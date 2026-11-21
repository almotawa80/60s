-- v174 «نجم الأسبوع» ⭐: most improved student this school week (Sun–Thu) vs last week, by average points per official round.
-- Needs ≥3 rounds this week and ≥1 last week. Shown from Thursday to Saturday.
create or replace function private.week_star(p_class uuid) returns jsonb
language sql stable security definer set search_path = public, private as $$
  with t as (select private.today_kw() d),
  w as (select (d - (extract(isodow from d)::int % 7))::date s from t),
  pts as (
    select a.student_id,
      avg(a.total_points) filter (where a.play_date between w.s and w.s + 4) now_avg,
      count(*) filter (where a.play_date between w.s and w.s + 4) now_n,
      avg(a.total_points) filter (where a.play_date between w.s - 7 and w.s - 3) prev_avg
    from public.attempts a join public.students st on st.id = a.student_id, w
    where st.class_id = p_class and a.status = 'finished' and a.kind = 'official' and a.play_date between w.s - 7 and w.s + 4
    group by a.student_id)
  select case when extract(isodow from (select d from t)) in (4, 5, 6) then
    (select jsonb_build_object('id', st.id, 'name', st.name, 'av', st.avatar, 'up', round(p.now_avg - p.prev_avg))
       from pts p join public.students st on st.id = p.student_id
      where p.now_n >= 3 and p.prev_avg is not null and p.now_avg > p.prev_avg
      order by p.now_avg - p.prev_avg desc, p.now_avg desc limit 1)
  end
$$;

-- student side: add to student_daily
do $$ declare d text; begin
  d := pg_get_functiondef('public.student_daily(uuid)'::regprocedure);
  if position('''star''' in d) = 0 then
    d := replace(d, '''stickers'', to_jsonb(v_st),', '''star'', private.week_star(v_cls), ''stickers'', to_jsonb(v_st),');
    execute d;
  end if;
end $$;

-- teacher side
create or replace function public.teacher_week_star(p_class uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
begin
  if not exists (select 1 from public.classes where id = p_class and teacher_id = sup.uid()) then raise exception 'not_allowed'; end if;
  return private.week_star(p_class);
end $$;
revoke all on function public.teacher_week_star(uuid) from public;
grant execute on function public.teacher_week_star(uuid) to authenticated;

select position('''star''' in pg_get_functiondef('public.student_daily(uuid)'::regprocedure)) > 0 as ok;
