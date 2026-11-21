-- v189: a class counts as primary (3 x 20s) only if its name has grade 1-5 AND the teacher's stage (حسابي ← المرحلة) includes «ابتدائي» or is empty.
do $$
declare src text := pg_get_functiondef('public.start_attempt(uuid,text)'::regprocedure);
begin
  if position('if private.is_primary(v_cl.name) then' in src) = 0 then raise exception 'already patched or text not found'; end if;
  src := replace(src, 'if private.is_primary(v_cl.name) then',
    'if private.is_primary(v_cl.name) and (coalesce(v_set->>''prof_stage'', '''') = '''' or position(''ابتدائي'' in v_set->>''prof_stage'') > 0) then');
  execute src;
end $$;
