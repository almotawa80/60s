-- v176 permanent student level ⚡: XP = 10 per correct answer + 5 per finished round (any kind, practice too). Never resets.
create or replace function private.student_xp(p_sid uuid) returns int
language sql stable security definer set search_path = public, private as $$
  select coalesce((select 10 * count(*) from public.attempt_questions aq join public.attempts a on a.id = aq.attempt_id
                    where a.student_id = p_sid and aq.is_correct), 0)::int
       + coalesce((select 5 * count(*) from public.attempts where student_id = p_sid and status = 'finished'), 0)::int
$$;

do $$ declare d text; begin
  d := pg_get_functiondef('public.student_daily(uuid)'::regprocedure);
  if position('''xp''' in d) = 0 then
    d := replace(d, '''stickers'', to_jsonb(v_st),', '''xp'', private.student_xp(v_sid), ''stickers'', to_jsonb(v_st),');
    execute d;
  end if;
end $$;

select position('''xp''' in pg_get_functiondef('public.student_daily(uuid)'::regprocedure)) > 0 as ok;
