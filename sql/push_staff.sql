-- v493 notifications for teachers and admins (phone push), plus two more for students.
-- Teacher: student waiting for approval, «someone used my name», challenge ended, evening summary.
-- Admin: new teacher account, new report/suggestion.   Student: new challenge, challenge ended.
-- Safe to run twice. Every trigger swallows its own errors, so a push problem never blocks the app.

alter table public.push_subs alter column student_id drop not null;
alter table public.push_subs add column if not exists teacher_id uuid references public.teachers(id) on delete cascade;
alter table public.push_subs drop constraint if exists push_subs_owner;
alter table public.push_subs add constraint push_subs_owner check (num_nonnulls(student_id, teacher_id) = 1);
create index if not exists push_subs_teacher on public.push_subs(teacher_id) where teacher_id is not null;

-- a device belongs to the last one who enabled notifications on it (student or teacher)
create or replace function public.student_push_sub(p_token uuid, p_sub jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  insert into public.push_subs(endpoint, student_id, p256dh, auth)
  values (p_sub->>'endpoint', v_sid, p_sub->'keys'->>'p256dh', p_sub->'keys'->>'auth')
  on conflict (endpoint) do update set student_id = excluded.student_id, teacher_id = null, p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end $$;

create or replace function public.teacher_push_sub(p_sub jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid();
begin
  if me is null or not exists (select 1 from public.teachers where id = me) then raise exception 'forbidden'; end if;
  if coalesce(p_sub->>'endpoint', '') = '' then raise exception 'bad_sub'; end if;
  insert into public.push_subs(endpoint, teacher_id, p256dh, auth)
  values (p_sub->>'endpoint', me, coalesce(p_sub->'keys'->>'p256dh', '-'), coalesce(p_sub->'keys'->>'auth', '-'))
  on conflict (endpoint) do update set teacher_id = excluded.teacher_id, student_id = null, p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end $$;
-- turn off on this device only (p_endpoint), or on all the teacher's devices (null)
create or replace function public.teacher_push_off(p_endpoint text default null) returns void language sql security definer set search_path = '' as $$
  delete from public.push_subs where teacher_id = auth.uid() and (p_endpoint is null or endpoint = p_endpoint)
$$;
revoke all on function public.teacher_push_sub(jsonb), public.teacher_push_off(text) from public, anon;
grant execute on function public.teacher_push_sub(jsonb), public.teacher_push_off(text) to authenticated;

-- one sender for everything new: asks the edge function «push» to deliver title/body to these teachers and students
create or replace function private.push_send(p_teachers uuid[], p_students uuid[], p_title text, p_body text, p_tag text, p_quiet boolean default true)
returns void language plpgsql security definer set search_path = public, private as $$
declare h int := extract(hour from (now() at time zone 'Asia/Kuwait'))::int;
begin
  if p_quiet and (h < 7 or h >= 21) then return; end if;   -- nothing at night; the bell inside the app still shows it
  if not exists (select 1 from public.push_subs ps where ps.teacher_id = any (coalesce(p_teachers, '{}')) or ps.student_id = any (coalesce(p_students, '{}'))) then return; end if;
  perform net.http_post(url := 'https://jrgbwgswjfkquhkebvae.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_key from private.push_cfg where id = 1)),
    body := jsonb_build_object('direct', jsonb_build_object('t', to_jsonb(coalesce(p_teachers, '{}')), 's', to_jsonb(coalesce(p_students, '{}')), 'title', p_title, 'body', left(coalesce(p_body, ''), 140), 'tag', p_tag)));
exception when others then null;
end $$;

create or replace function public.push_direct_targets(p_teachers uuid[], p_students uuid[]) returns setof jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth)
  from public.push_subs ps where ps.teacher_id = any (p_teachers) or ps.student_id = any (p_students)
$$;
revoke all on function public.push_direct_targets(uuid[], uuid[]) from public, anon, authenticated;
grant execute on function public.push_direct_targets(uuid[], uuid[]) to service_role;

-- teacher: a student is waiting for approval / says someone used his name
create or replace function private.push_on_student() returns trigger language plpgsql security definer set search_path = public, private as $$
declare c record;
begin
  select teacher_id, name into c from public.classes where id = new.class_id;
  if c.teacher_id is null then return null; end if;
  if tg_op = 'INSERT' then
    perform private.push_send(array[c.teacher_id], null, '🙋 طالب جديد ينتظر موافقتك', new.name || ' · ' || c.name, 'mc-pend');
  else
    perform private.push_send(array[c.teacher_id], null, '🚨 طالب يقول: أحد دخل باسمي', new.name || ' · ' || c.name, 'mc-claim');
  end if;
  return null;
exception when others then return null;
end $$;
drop trigger if exists students_push_pending on public.students;
create trigger students_push_pending after insert on public.students for each row when (new.approved = false) execute function private.push_on_student();
drop trigger if exists students_push_claim on public.students;
create trigger students_push_claim after update of claim_at on public.students for each row when (new.claim_at is not null and old.claim_at is distinct from new.claim_at) execute function private.push_on_student();

-- admin: new teacher account / new report or suggestion (no quiet hours)
create or replace function private.push_on_admin() returns trigger language plpgsql security definer set search_path = public, private as $$
declare adm uuid[]; nm text;
begin
  select array_agg(user_id) into adm from private.admins;
  if adm is null then return null; end if;
  if tg_table_name = 'teachers' then
    select coalesce(nullif(trim(new.display_name), ''), u.email, 'معلم') into nm from (select 1) x left join auth.users u on u.id = new.id;
    perform private.push_send(adm, null, '👤 حساب معلم جديد', nm, 'mc-acc', false);
  else
    if new.teacher_id = any (adm) then return null; end if;
    select coalesce(nullif(trim(t.display_name), ''), 'معلم') into nm from (select 1) x left join public.teachers t on t.id = new.teacher_id;
    perform private.push_send(adm, null, '🚩 بلاغ جديد من ' || nm, new.body, 'mc-rep', false);
  end if;
  return null;
exception when others then return null;
end $$;
drop trigger if exists teachers_push_admin on public.teachers;
create trigger teachers_push_admin after insert on public.teachers for each row execute function private.push_on_admin();
drop trigger if exists feedback_push_admin on public.feedback;
create trigger feedback_push_admin after insert on public.feedback for each row execute function private.push_on_admin();

-- student: the teacher started a new challenge (one notification per statement, only challenges that start today or earlier)
create or replace function private.push_on_comp() returns trigger language plpgsql security definer set search_path = public, private as $$
declare ids uuid[]; ttl text;
begin
  select array_agg(distinct s.id), min(n.title) into ids, ttl from new_rows n join public.students s on s.class_id = n.class_id
  where n.status = 'active' and n.start_date <= private.today_kw() and s.approved is not false;
  if ids is null then return null; end if;
  perform private.push_send(null, ids, '🎯 معلمك بدأ تحدي جديد', coalesce(nullif(split_part(ttl, '·', 1), ''), 'ادخل والعب جولتك'), 'mc-new');
  return null;
exception when others then return null;
end $$;
drop trigger if exists competitions_push_new on public.competitions;
create trigger competitions_push_new after insert on public.competitions referencing new table as new_rows for each statement execute function private.push_on_comp();

-- morning after a challenge ends: teacher gets the winner, students are told to check their final rank
create or replace function private.push_ended() returns void language plpgsql security definer set search_path = public, private as $$
declare t date := private.today_kw(); r record; win text;
begin
  for r in select coalesce(k.group_id, k.id) g, min(k.title) title, array_agg(k.id) comps, array_agg(distinct c.teacher_id) tids, array_agg(k.class_id) cls
           from public.competitions k join public.classes c on c.id = k.class_id
           group by 1 having max(k.end_date) = t - 1 loop
    select s.name into win from public.attempts a join public.students s on s.id = a.student_id
      where a.competition_id = any (r.comps) and a.status = 'finished' and a.kind <> 'practice' group by s.id, s.name order by sum(a.total_points) desc limit 1;
    perform private.push_send(r.tids, null, '🏆 خلص «' || r.title || '»', case when win is null then 'ما لعب أحد' else 'الفايز: ' || win end, 'mc-end');
    perform private.push_send(null, (select array_agg(id) from public.students where class_id = any (r.cls)), '🏆 خلص التحدي', 'ادخل وشوف ترتيبك النهائي', 'mc-end');
  end loop;
end $$;

-- evening summary for the teacher: how many played today, one line per teacher
create or replace function private.push_summary() returns void language plpgsql security definer set search_path = public, private as $$
declare t date := private.today_kw(); r record;
begin
  if extract(isodow from t) in (5, 6) then return; end if;
  for r in select c.teacher_id tid, count(distinct s.id) n,
             count(distinct s.id) filter (where exists (select 1 from public.attempts a where a.student_id = s.id and a.play_date = t and a.status = 'finished' and a.kind <> 'practice')) p
           from public.competitions k join public.classes c on c.id = k.class_id join public.students s on s.class_id = c.id and s.approved is not false
           where k.status = 'active' and k.paused_at is null and k.start_date <= t and coalesce(k.end_date, t) >= t and not coalesce(c.archived, false)
             and exists (select 1 from public.push_subs ps where ps.teacher_id = c.teacher_id)
           group by 1 loop
    perform private.push_send(array[r.tid], null, '📊 ملخص اليوم', 'لعب ' || r.p || ' من ' || r.n || ' طالب', 'mc-sum');
  end loop;
end $$;

-- student: 6 PM warning when a streak of 3+ days is about to break (has not played today)
create or replace function private.push_streak() returns void language plpgsql security definer set search_path = public, private as $$
declare t date := private.today_kw(); r record;
begin
  if extract(isodow from t) in (5, 6) then return; end if;
  for r in select st.id, private.student_streak(st.id) n from public.students st
           where exists (select 1 from public.push_subs ps where ps.student_id = st.id)
             and exists (select 1 from public.competitions c where c.class_id = st.class_id and c.status = 'active' and c.paused_at is null
                         and c.start_date <= t and coalesce(c.points_end_date, c.end_date) >= t)
             and not exists (select 1 from public.attempts a where a.student_id = st.id and a.play_date = t and a.status = 'finished' and a.kind = 'official') loop
    if r.n >= 3 then perform private.push_send(null, array[r.id], '🔥 سلسلتك بتنقطع!', r.n || ' أيام متواصلة، العب جولة اليوم وحافظ عليها', 'mc-streak'); end if;
  end loop;
end $$;

select cron.unschedule('mc-ended') where exists (select 1 from cron.job where jobname = 'mc-ended');
select cron.schedule('mc-ended', '30 4 * * *', 'select private.push_ended()');       -- 7:30 AM Kuwait
select cron.unschedule('mc-summary') where exists (select 1 from cron.job where jobname = 'mc-summary');
select cron.schedule('mc-summary', '0 15 * * 0-4', 'select private.push_summary(); select private.push_streak()'); -- 6:00 PM Kuwait, Sun–Thu

select 'ok' as done;
