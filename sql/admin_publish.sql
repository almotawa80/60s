-- Admin: publish one of his own subjects (curriculum + its questions) to the shared bank
create or replace function public.admin_publish_curriculum(p_cu uuid) returns int language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); n int;
begin
  if not exists(select 1 from private.admins where user_id = me) then raise exception 'not_admin'; end if;
  if not exists(select 1 from public.curricula where id = p_cu and owner_id = me) then raise exception 'not_found'; end if;
  update public.curricula set owner_id = null where id = p_cu;
  with q as (
    update public.questions set owner_id = null, status = 'approved'
    where curriculum_id = p_cu and owner_id = me and status in ('approved', 'draft') returning id
  ), pk as (
    insert into public.question_picks(teacher_id, question_id) select me, id from q on conflict do nothing returning 1
  ) select count(*) into n from q;
  return n;
end $$;
revoke all on function public.admin_publish_curriculum(uuid) from public, anon;
grant execute on function public.admin_publish_curriculum(uuid) to authenticated;
