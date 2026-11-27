-- v547: لوحة الإدارة تحسب «اليوم» بتوقيت الكويت (كانت UTC فيبدأ اليوم 3 فجراً)
do $$
declare src text := pg_get_functiondef('public.admin_overview()'::regprocedure);
begin
  if position('current_date' in src) = 0 then raise notice 'nothing to patch'; return; end if;
  src := replace(src, 'end_date >= current_date', 'end_date >= private.today_kw()');
  src := replace(src, 'finished_at::date = current_date', '(finished_at at time zone ''Asia/Kuwait'')::date = private.today_kw()');
  execute src;
end $$;
