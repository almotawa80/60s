-- v457: student account deletion with a 14-day grace period.
-- Request locks the account at once (every token RPC raises del_pending), the teacher sees «طلب حذف»,
-- the student can cancel within 14 days. After 14 days the row is anonymised (not deleted) so
-- challenge rankings and points stay as they were, under «طالب محذوف».
alter table public.students add column if not exists del_req timestamptz;

create or replace function private.student_from_token(p_token uuid) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
declare v uuid; d timestamptz;
begin
  select ss.student_id, s.del_req into v, d from public.student_sessions ss join public.students s on s.id = ss.student_id
   where ss.token = p_token and ss.expires_at > now();
  if v is null then raise exception 'invalid_session'; end if;
  if d is not null then raise exception 'del_pending'; end if;
  return v;
end $function$;

create or replace function public.student_delete_me(p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  update public.students set del_req = now() where id = v_sid;
  delete from public.push_subs where student_id = v_sid;
end $$;

-- status for a locked account (works while del_pending)
create or replace function public.student_delete_status(p_token uuid) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('at', s.del_req, 'until', s.del_req + interval '14 days', 'name', s.name)
  from public.student_sessions ss join public.students s on s.id = ss.student_id
  where ss.token = p_token and ss.expires_at > now() and s.del_req is not null $$;

create or replace function public.student_delete_cancel(p_token uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  select ss.student_id into v_sid from public.student_sessions ss where ss.token = p_token and ss.expires_at > now();
  if v_sid is null then raise exception 'invalid_session'; end if;
  update public.students set del_req = null where id = v_sid;
end $$;

create or replace function private.student_purge() returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  with x as (select id from public.students where del_req is not null and del_req < now() - interval '14 days')
  , a as (delete from public.student_sessions where student_id in (select id from x))
  , b as (delete from public.push_subs where student_id in (select id from x))
  , c as (delete from public.messages where student_id in (select id from x))
  , d as (delete from public.arena_queue where student_id in (select id from x))
  update public.students s set name = 'طالب محذوف', phone = null, device = null, avatar = null, stickers = '{}',
     student_no = '', code = 'DEL' || substr(replace(s.id::text, '-', ''), 1, 12),
     del_from = coalesce(s.class_id, s.del_from), class_id = null, del_teacher = null, deleted_at = now(), del_req = null
  from x where s.id = x.id;
  get diagnostics n = row_count; return n;
end $$;

revoke all on function public.student_delete_me(uuid), public.student_delete_status(uuid), public.student_delete_cancel(uuid) from public;
grant execute on function public.student_delete_me(uuid), public.student_delete_status(uuid), public.student_delete_cancel(uuid) to anon, authenticated;
revoke all on function private.student_purge() from public;

select cron.schedule('mc-student-purge', '17 0 * * *', 'select private.student_purge()');
