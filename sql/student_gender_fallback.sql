-- v481: student_home returns the student's gender, falling back to the class gender (m/f),
-- then to the teacher's school type (teachers.settings.def_gender m/f). Text patch of the live function.
do $$
declare d text; o text := '''gender'', v_s.gender,';
  n text := '''gender'', coalesce(nullif(v_s.gender, ''''), case when v_cl.gender in (''m'',''f'') then v_cl.gender end, (select case when t.settings->>''def_gender'' in (''m'',''f'') then t.settings->>''def_gender'' end from public.teachers t where t.id = v_cl.teacher_id)),';
begin
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace ns on ns.oid = p.pronamespace where ns.nspname = 'public' and p.proname = 'student_home';
  if position(o in d) = 0 then raise exception 'student_home: gender line not found (already patched?)'; end if;
  execute replace(d, o, n);
end $$;
