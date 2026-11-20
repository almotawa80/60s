-- v153: optional prize text for 1st/2nd/3rd per challenge (the app only displays it)
alter table public.competitions add column if not exists prizes text[];
alter table public.competitions drop constraint if exists competitions_prizes_chk;
alter table public.competitions add constraint competitions_prizes_chk check (prizes is null or (cardinality(prizes) <= 3 and length(array_to_string(prizes, '')) <= 200));

-- student_home: add prizes to the competition object
do $$ declare d text; begin
  d := pg_get_functiondef('public.student_home(uuid)'::regprocedure);
  if position('''prizes''' in d) = 0 then
    d := replace(d, '''days_left_points'', greatest(0, v_c.points_end_date - private.today_kw()))',
                    '''days_left_points'', greatest(0, v_c.points_end_date - private.today_kw()), ''prizes'', v_c.prizes)');
    execute d;
  end if;
end $$;

select position('''prizes''' in pg_get_functiondef('public.student_home(uuid)'::regprocedure)) > 0 as ok;
