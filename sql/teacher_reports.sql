-- Teacher problem reports (Khalid 2026-11-27): screen, app version and device travel with each report; admin list + mark done.
alter table public.feedback add column if not exists page text;
alter table public.feedback add column if not exists meta jsonb;
alter table public.feedback add column if not exists image text;
alter table public.feedback add column if not exists done_at timestamptz;

create or replace function public.admin_feedback() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not exists(select 1 from private.admins where user_id = auth.uid()) then '[]'::jsonb else coalesce((
    select jsonb_agg(x order by x.created_at desc) from (
      select f.id, f.body, f.page, f.meta, f.image, f.created_at, t.display_name teacher, u.email
      from public.feedback f left join public.teachers t on t.id = f.teacher_id left join auth.users u on u.id = f.teacher_id
      where f.done_at is null order by f.created_at desc limit 100) x), '[]'::jsonb) end
$$;
create or replace function public.admin_feedback_done(p_id uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  update public.feedback set done_at = now() where id = p_id;
end $$;
revoke all on function public.admin_feedback(), public.admin_feedback_done(uuid) from public, anon;
grant execute on function public.admin_feedback(), public.admin_feedback_done(uuid) to authenticated;
