-- Admin dashboard + support access (view by default, edit only after «تفعيل الدعم")
-- 1) admins + acting state + audit log (private, no API access)
create table if not exists private.admins (user_id uuid primary key references auth.users(id) on delete cascade, created_at timestamptz default now());
create table if not exists private.admin_acting (admin_id uuid primary key references auth.users(id) on delete cascade, teacher_id uuid not null references auth.users(id) on delete cascade, can_write boolean not null default false, started_at timestamptz not null default now());
create table if not exists private.admin_log (id bigserial primary key, at timestamptz default now(), admin_id uuid, teacher_id uuid, action text, tbl text, row_id text);
insert into private.admins(user_id) select id from auth.users where email = 'almotawa80@gmail.com' on conflict do nothing;

-- 2) effective user id: the teacher being viewed (expires after 2 hours), else yourself
create schema if not exists sup;
grant usage on schema sup to anon, authenticated;
create or replace function sup.uid() returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce((select a.teacher_id from private.admin_acting a join private.admins d on d.user_id = a.admin_id
                   where a.admin_id = auth.uid() and a.started_at > now() - interval '2 hours'), auth.uid())
$$;
-- for writes: only when support is switched on
create or replace function sup.uid_w() returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce((select a.teacher_id from private.admin_acting a join private.admins d on d.user_id = a.admin_id
                   where a.admin_id = auth.uid() and a.can_write and a.started_at > now() - interval '2 hours'), auth.uid())
$$;
grant execute on function sup.uid(), sup.uid_w() to anon, authenticated;

-- 3) policies: reads use sup.uid(), writes use sup.uid_w()
do $$
declare r record; q text; w text; rq text; ww text;
begin
  for r in select * from pg_policies where schemaname = 'public' and (qual like '%auth.uid()%' or with_check like '%auth.uid()%') loop
    q  := replace(r.qual, 'auth.uid()', 'sup.uid()');
    rq := replace(r.qual, 'auth.uid()', 'sup.uid_w()');
    ww := replace(r.with_check, 'auth.uid()', 'sup.uid_w()');
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    if r.cmd = 'ALL' then
      execute format('create policy %I on public.%I for select to %s using (%s)', r.policyname||'_r', r.tablename, array_to_string(r.roles, ','), q);
      execute format('create policy %I on public.%I for insert to %s with check (%s)', r.policyname||'_i', r.tablename, array_to_string(r.roles, ','), ww);
      execute format('create policy %I on public.%I for update to %s using (%s) with check (%s)', r.policyname||'_u', r.tablename, array_to_string(r.roles, ','), rq, ww);
      execute format('create policy %I on public.%I for delete to %s using (%s)', r.policyname||'_d', r.tablename, array_to_string(r.roles, ','), rq);
    elsif r.cmd = 'SELECT' then
      execute format('create policy %I on public.%I for select to %s using (%s)', r.policyname, r.tablename, array_to_string(r.roles, ','), q);
    elsif r.cmd = 'INSERT' then
      execute format('create policy %I on public.%I for insert to %s with check (%s)', r.policyname, r.tablename, array_to_string(r.roles, ','), ww);
    elsif r.cmd = 'UPDATE' then
      execute format('create policy %I on public.%I for update to %s using (%s) with check (%s)', r.policyname, r.tablename, array_to_string(r.roles, ','), rq, ww);
    elsif r.cmd = 'DELETE' then
      execute format('create policy %I on public.%I for delete to %s using (%s)', r.policyname, r.tablename, array_to_string(r.roles, ','), rq);
    end if;
  end loop;
end $$;

-- 4) teacher RPCs: read ones see the viewed teacher, write ones need support on. delete_my_account untouched.
do $$
declare r record; d text;
begin
  for r in select p.oid, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prokind = 'f' and pg_get_functiondef(p.oid) like '%auth.uid()%'
             and p.proname <> 'delete_my_account' loop
    d := pg_get_functiondef(r.oid);
    if r.proname in ('add_students','import_shared','regenerate_code','set_self_join','share_questions') then
      d := replace(d, 'auth.uid()', 'sup.uid_w()');
    else
      d := replace(d, 'auth.uid()', 'sup.uid()');
    end if;
    execute d;
  end loop;
end $$;

-- 5) audit: every write made while viewing someone else is logged under the admin
create or replace function private.log_support() returns trigger language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); eff uuid := sup.uid_w();
begin
  if me is not null and eff is distinct from me then
    insert into private.admin_log(admin_id, teacher_id, action, tbl, row_id)
    values (me, eff, tg_op, tg_table_name, coalesce((to_jsonb(coalesce(new, old))->>'id'), ''));
  end if;
  return coalesce(new, old);
end $$;
do $$
declare t text;
begin
  foreach t in array array['teachers','classes','students','competitions','questions','question_picks','question_hides','messages','curricula','question_shares'] loop
    execute format('drop trigger if exists zz_log_support on public.%I', t);
    execute format('create trigger zz_log_support after insert or update or delete on public.%I for each row execute function private.log_support()', t);
  end loop;
end $$;

-- 6) admin RPCs
create or replace function public.admin_state() returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'is', exists(select 1 from private.admins where user_id = auth.uid()),
    'act', (select json_build_object('teacher_id', a.teacher_id, 'can_write', a.can_write, 'email', u.email, 'name', t.display_name)
            from private.admin_acting a join auth.users u on u.id = a.teacher_id left join public.teachers t on t.id = a.teacher_id
            where a.admin_id = auth.uid() and a.started_at > now() - interval '2 hours'
              and exists(select 1 from private.admins where user_id = auth.uid())))
$$;

create or replace function public.admin_act(p_teacher uuid, p_write boolean default false) returns json language plpgsql security definer set search_path = '' as $$
begin
  if not exists(select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  if p_teacher is null then
    insert into private.admin_log(admin_id, teacher_id, action) select auth.uid(), teacher_id, 'exit' from private.admin_acting where admin_id = auth.uid();
    delete from private.admin_acting where admin_id = auth.uid();
  else
    insert into private.admin_acting(admin_id, teacher_id, can_write, started_at) values (auth.uid(), p_teacher, coalesce(p_write, false), now())
      on conflict (admin_id) do update set teacher_id = excluded.teacher_id, can_write = excluded.can_write, started_at = now();
    insert into private.admin_log(admin_id, teacher_id, action) values (auth.uid(), p_teacher, case when p_write then 'support_on' else 'view' end);
  end if;
  return public.admin_state();
end $$;

create or replace function public.admin_overview() returns json language plpgsql stable security definer set search_path = '' as $$
declare res json;
begin
  if not exists(select 1 from private.admins where user_id = auth.uid()) then raise exception 'not_admin'; end if;
  select json_build_object(
    'teachers', (select count(*) from public.teachers),
    'teachers_week', (select count(*) from public.teachers where created_at > now() - interval '7 days'),
    'students', (select count(*) from public.students),
    'students_week', (select count(*) from public.students s where s.created_at > now() - interval '7 days'),
    'live', (select count(*) from public.competitions where status = 'active' and paused_at is null and (end_date is null or end_date >= current_date)),
    'rounds_week', (select count(*) from public.attempts where finished_at > now() - interval '7 days'),
    'rounds_today', (select count(*) from public.attempts where finished_at::date = current_date),
    'list', (select coalesce(json_agg(x order by x.rounds desc), '[]') from (
      select t.id, coalesce(t.display_name, split_part(u.email, '@', 1)) as name, u.email, t.created_at, u.last_sign_in_at,
        (select count(*) from public.classes c where c.teacher_id = t.id) as classes,
        (select count(*) from public.students s join public.classes c on c.id = s.class_id where c.teacher_id = t.id) as students,
        (select count(*) from public.attempts a join public.students s on s.id = a.student_id join public.classes c on c.id = s.class_id
          where c.teacher_id = t.id and a.finished_at > now() - interval '7 days') as rounds,
        (select count(*) from public.competitions k join public.classes c on c.id = k.class_id where c.teacher_id = t.id and k.status = 'active') as live,
        (select count(*) from public.questions q where q.owner_id = t.id) as own_q
      from public.teachers t join auth.users u on u.id = t.id) x)
  ) into res;
  return res;
end $$;
grant execute on function public.admin_state(), public.admin_act(uuid, boolean), public.admin_overview() to authenticated;
