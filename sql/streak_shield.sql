-- v170 streak on school days + shield 🛡
-- Friday/Saturday never break the streak (playing on them still counts).
-- Every 5 days in a row earns a shield (max 2). A missed school day uses a shield instead of resetting.
create or replace function private.student_streak_info(p_student uuid) returns jsonb
language plpgsql stable security definer set search_path = public, private as $$
declare
  t date := private.today_kw();
  d date; n int := 0; sh int := 0; saved date := null; played boolean;
begin
  select min(play_date) into d from public.attempts
   where student_id = p_student and status = 'finished' and play_date >= t - 150;
  if d is null then return jsonb_build_object('n', 0, 'shields', 0, 'saved', null); end if;
  while d <= t loop
    played := exists (select 1 from public.attempts where student_id = p_student and status = 'finished' and play_date = d);
    if played then
      n := n + 1;
      if n % 5 = 0 and sh < 2 then sh := sh + 1; end if;
    elsif d = t or extract(isodow from d) in (5, 6) then
      null; -- today not played yet, or weekend: no change
    elsif n > 0 and sh > 0 then
      sh := sh - 1; saved := d;
    else
      n := 0;
    end if;
    d := d + 1;
  end loop;
  return jsonb_build_object('n', n, 'shields', sh, 'saved', saved);
end $$;

create or replace function private.student_streak(p_student uuid) returns integer
language sql stable security definer set search_path = public, private as $$
  select (private.student_streak_info(p_student) ->> 'n')::int
$$;

-- student_home: add shield info
do $$ declare d text; begin
  d := pg_get_functiondef('public.student_home(uuid)'::regprocedure);
  if position('''shield''' in d) = 0 then
    d := replace(d, '''streak'', v_streak,', '''streak'', v_streak, ''shield'', private.student_streak_info(v_sid),');
    execute d;
  end if;
end $$;

-- check: should list the student_home definition containing 'shield'
select position('''shield''' in pg_get_functiondef('public.student_home(uuid)'::regprocedure)) > 0 as ok;
