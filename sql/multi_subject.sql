-- v161: a challenge can use several subjects (curricula). competitions.curricula uuid[]; curriculum_id stays = the first one.
alter table public.competitions add column if not exists curricula uuid[];

do $$ declare d text; begin
  d := pg_get_functiondef('public.start_attempt(uuid,text)'::regprocedure);
  if position('v_c.curricula' in d) = 0 then
    d := replace(d, 'q.curriculum_id = v_c.curriculum_id', 'q.curriculum_id = any (coalesce(v_c.curricula, array[v_c.curriculum_id]))');
    execute d;
  end if;
end $$;

select position('v_c.curricula' in pg_get_functiondef('public.start_attempt(uuid,text)'::regprocedure)) > 0 as ok;
