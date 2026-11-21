-- v197: admin can delete a teacher account (and everything it owns: classes, students, challenges, own questions, messages).
create or replace function public.admin_delete_teacher(p_teacher uuid) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not exists (select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  if p_teacher is null or p_teacher = auth.uid() then raise exception 'cannot_delete_self'; end if;
  if exists (select 1 from private.admins where user_id = p_teacher) then raise exception 'cannot_delete_admin'; end if;
  insert into private.admin_log(admin_id, teacher_id, action) values (auth.uid(), null, 'delete_teacher ' || p_teacher::text);
  delete from private.admin_acting where teacher_id = p_teacher;
  delete from auth.users where id = p_teacher;
end $$;
revoke all on function public.admin_delete_teacher(uuid) from public, anon;
grant execute on function public.admin_delete_teacher(uuid) to authenticated;
