-- v342: admin controls the shared bank: sees teachers' reports, edits or deletes a bank question for everyone.
create or replace function public.admin_reports() returns jsonb language sql stable security definer set search_path = '' as $$
  select case when not exists(select 1 from private.admins where user_id = auth.uid()) then '[]'::jsonb else coalesce((
    select jsonb_agg(x order by x.n desc, x.last desc) from (
      select q.id, q.body, q.options, q.correct_index, q.payload, q.subject, q.lesson, q.qtype, count(*) n, max(r.created_at) last,
             coalesce(jsonb_agg(r.note order by r.created_at desc) filter (where r.note is not null), '[]'::jsonb) notes
      from public.question_reports r join public.questions q on q.id = r.question_id
      where r.status = 'open' and q.owner_id is null group by q.id) x), '[]'::jsonb) end
$$;
create or replace function public.admin_question_set(p_q uuid, p_body text, p_options jsonb, p_correct int) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  if coalesce(trim(p_body), '') = '' or jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) not between 2 and 4 or p_correct < 0 or p_correct >= jsonb_array_length(p_options) then raise exception 'bad_question'; end if;
  update public.questions set body = trim(p_body), options = p_options, correct_index = p_correct where id = p_q and owner_id is null;
  if not found then raise exception 'not_found'; end if;
  update public.question_reports set status = 'done' where question_id = p_q and status = 'open';
  insert into private.admin_log(admin_id, teacher_id, action) values (auth.uid(), null, 'bank_edit ' || p_q::text);
end $$;
create or replace function public.admin_question_delete(p_q uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  insert into private.admin_log(admin_id, teacher_id, action) values (auth.uid(), null, 'bank_delete ' || p_q::text || ' ' || coalesce((select left(body, 120) from public.questions where id = p_q), ''));
  delete from public.questions where id = p_q and owner_id is null;
  if not found then raise exception 'not_found'; end if;
end $$;
create or replace function public.admin_reports_close(p_q uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  update public.question_reports set status = 'ignored' where question_id = p_q and status = 'open';
end $$;
revoke all on function public.admin_reports(), public.admin_question_set(uuid, text, jsonb, int), public.admin_question_delete(uuid), public.admin_reports_close(uuid) from public, anon;
grant execute on function public.admin_reports(), public.admin_question_set(uuid, text, jsonb, int), public.admin_question_delete(uuid), public.admin_reports_close(uuid) to authenticated;
