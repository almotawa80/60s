-- v177 teacher reminder time per challenge + teacher messages arrive as notifications (7:00 AM–8:00 PM Kuwait only)
alter table public.competitions add column if not exists remind_at time not null default '16:00';
create table if not exists private.push_log (student_id uuid not null, d date not null, primary key (student_id, d));

-- daily reminder: only challenges whose time falls in the current 15-minute slot; once per student per day
create or replace function public.push_targets() returns setof jsonb language plpgsql security definer set search_path = public, private as $$
declare t date := private.today_kw(); slot time := date_trunc('hour', (now() at time zone 'Asia/Kuwait')::time) + make_interval(mins => (extract(minute from (now() at time zone 'Asia/Kuwait'))::int / 15) * 15);
begin
  if extract(isodow from t) in (5, 6) then return; end if;
  return query
  with s as (
    select distinct on (ps.endpoint) ps.endpoint, ps.p256dh, ps.auth, st.id sid, split_part(st.name, ' ', 1) nm
    from public.push_subs ps join public.students st on st.id = ps.student_id
    where exists (select 1 from public.competitions c where c.class_id = st.class_id and c.status = 'active' and c.paused_at is null
                  and c.start_date <= t and coalesce(c.points_end_date, c.end_date) >= t
                  and c.remind_at >= slot and c.remind_at < slot + interval '15 minutes')
      and not exists (select 1 from public.attempts a where a.student_id = st.id and a.play_date = t and a.status = 'finished' and a.kind = 'official')
      and not exists (select 1 from private.push_log l where l.student_id = st.id and l.d = t)
  ), ins as (insert into private.push_log(student_id, d) select distinct sid, t from s on conflict do nothing)
  select jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth, 'name', nm) from s;
end $$;
revoke all on function public.push_targets() from public, anon, authenticated;
grant execute on function public.push_targets() to service_role;

-- teacher messages → notification
create or replace function public.push_msg_targets(p_ids uuid[]) returns setof jsonb language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth,
    'title', '💌 رسالة من ' || coalesce(nullif(trim(coalesce(tc.settings->>'title', '') || ' ' || coalesce(tc.display_name, '')), ''), 'المعلم'), 'body', left(m.body, 140))
  from public.messages m join public.push_subs ps on ps.student_id = m.student_id
  left join public.teachers tc on tc.id = m.teacher_id
  where m.id = any (p_ids)
$$;
revoke all on function public.push_msg_targets(uuid[]) from public, anon, authenticated;
grant execute on function public.push_msg_targets(uuid[]) to service_role;

create or replace function private.push_on_message() returns trigger language plpgsql security definer set search_path = public, private as $$
declare ids uuid[]; h int := extract(hour from (now() at time zone 'Asia/Kuwait'))::int;
begin
  if h < 7 or h >= 20 then return null; end if; -- no notifications at night; the message still waits under the bell
  select array_agg(n.id) into ids from new_rows n where exists (select 1 from public.push_subs ps where ps.student_id = n.student_id);
  if ids is null then return null; end if;
  perform net.http_post(url := 'https://jrgbwgswjfkquhkebvae.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_key from private.push_cfg where id = 1)),
    body := jsonb_build_object('msgs', to_jsonb(ids)));
  return null;
end $$;
drop trigger if exists messages_push on public.messages;
create trigger messages_push after insert on public.messages referencing new table as new_rows for each statement execute function private.push_on_message();

-- every 15 minutes, 7:00 AM–7:45 PM Kuwait, Sunday–Thursday
select cron.unschedule('mc-reminder') where exists (select 1 from cron.job where jobname = 'mc-reminder');
select cron.schedule('mc-reminder', '*/15 4-16 * * 0-4', $c$
  select net.http_post(
    url := 'https://jrgbwgswjfkquhkebvae.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_key from private.push_cfg where id = 1)),
    body := '{"send":true}'::jsonb)
$c$);

select 'ok' as done;
