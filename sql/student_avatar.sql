-- Student avatar (character emoji) chosen by the student, shown in leaderboard and teacher challenge page
alter table public.students add column if not exists avatar text;
alter table public.students drop constraint if exists students_avatar_chk;
alter table public.students add constraint students_avatar_chk check (avatar is null or avatar = any (array['🦁','🐯','🐼','🦊','🐨','🐸','🦉','🦅','🐬','🐢','🦄','🐉','🚀','⚽','🏆','⭐']));

create or replace function public.student_set_avatar(p_token uuid, p_av text) returns text
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  update public.students set avatar = nullif(p_av, '') where id = v_sid;
  return nullif(p_av, '');
end $$;
revoke all on function public.student_set_avatar(uuid, text) from public;
grant execute on function public.student_set_avatar(uuid, text) to anon, authenticated;

-- student_home: add avatar to the student object
do $$ declare d text; begin
  d := pg_get_functiondef('public.student_home(uuid)'::regprocedure);
  if position('''avatar''' in d) = 0 then
    d := replace(d, '''gender'', v_s.gender)', '''gender'', v_s.gender, ''avatar'', v_s.avatar)');
    execute d;
  end if;
end $$;

-- class_leaderboard: add avatar (av) to each row
do $$ declare d text; begin
  d := pg_get_functiondef('public.class_leaderboard(uuid)'::regprocedure);
  if position('''av''' in d) = 0 then
    d := replace(d, '''is_me'', st.id = v_sid) order by r', '''is_me'', st.id = v_sid, ''av'', s2.avatar) order by r');
    execute d;
  end if;
end $$;
