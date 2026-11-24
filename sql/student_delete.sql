-- v411: student deletes own account (App Store guideline 5.1.1(v))
create or replace function public.student_delete_me(p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  delete from public.students where id = v_sid;
end $$;
revoke all on function public.student_delete_me(uuid) from public;
grant execute on function public.student_delete_me(uuid) to anon, authenticated;
