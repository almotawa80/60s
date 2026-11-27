-- v535: «المرحلة» tab in the student's «المراكز»: one ranking across all classes that share the same running challenge (group_id).
-- Read-only. Top 10 + the student's own rank. Names = first and second name with the class name beside it.
create or replace function public.stage_rank(p_token uuid)
returns jsonb
language plpgsql
stable security definer
set search_path to ''
as $$
declare v_sid uuid; v_s public.students; v_cl public.classes; v_c public.competitions; v_set jsonb; v_n int; v_out jsonb;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_s from public.students where id = v_sid;
  select * into v_cl from public.classes where id = v_s.class_id;
  select * into v_c from public.competitions where class_id = v_s.class_id and status = 'active' order by created_at desc limit 1;
  if v_c.id is null or v_c.group_id is null then return jsonb_build_object('multi', false); end if;
  v_set := private.tset(v_cl.teacher_id);
  if coalesce(v_set->>'lb', 'all') = 'hidden' then return jsonb_build_object('multi', false); end if;
  select count(distinct k.class_id) into v_n
    from public.competitions k join public.classes c on c.id = k.class_id
    where k.group_id = v_c.group_id and k.status = 'active' and c.teacher_id = v_cl.teacher_id and not c.archived;
  if v_n < 2 then return jsonb_build_object('multi', false); end if;
  with ks as (
    select k.id, k.class_id, c.name cname
    from public.competitions k join public.classes c on c.id = k.class_id
    where k.group_id = v_c.group_id and k.status = 'active' and c.teacher_id = v_cl.teacher_id and not c.archived),
  pts as (
    select s.id, s.approved, s.avatar, ks.cname,
      coalesce(sum(a.total_points), 0)::int pts, max(a.finished_at) last
    from ks join public.students s on s.class_id = ks.class_id
      left join public.attempts a on a.student_id = s.id and a.competition_id = ks.id and a.kind = 'official' and a.status = 'finished'
    group by s.id, s.approved, s.avatar, ks.cname),
  rk as (select p.*, row_number() over (order by p.pts desc, p.last nulls last, p.id) rnk from pts p)
  select jsonb_build_object('multi', true, 'classes', v_n,
    'hide_pts', not coalesce((v_set->>'lb_pts')::boolean, true),
    'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', k.rnk, 'pts', k.pts, 'me', k.id = v_sid,
        'name', case when k.approved or k.id = v_sid then private.arena_nick(k.id) else 'طالب جديد' end,
        'cls', k.cname, 'avatar', k.avatar) order by k.rnk)
      from rk k where k.rnk <= 10 and k.pts > 0), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', k.rnk, 'pts', k.pts) from rk k where k.id = v_sid),
    'total', (select count(*) from rk)) into v_out;
  return v_out;
end $$;
revoke all on function public.stage_rank(uuid) from public;
grant execute on function public.stage_rank(uuid) to anon, authenticated;
