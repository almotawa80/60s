-- v191: primary (3 x 20s) = the class's own stage («ابتدائي» chosen when the class was created), not its name.
do $$
declare src text := pg_get_functiondef('public.start_attempt(uuid,text)'::regprocedure);
  a text := 'if private.is_primary(v_cl.name) and (coalesce(v_set->>''prof_stage'', '''') = '''' or position(''ابتدائي'' in v_set->>''prof_stage'') > 0) then';
begin
  if position(a in src) = 0 then raise exception 'already patched or text not found'; end if;
  src := replace(src, a, 'if coalesce(v_cl.stage = ''primary'', private.is_primary(v_cl.name)) then');
  execute src;
end $$;
