-- v175 student reminders (web push): one reminder at 4:00 PM Kuwait, Sun–Thu, only to students who allowed it,
-- are in an active challenge (points phase, not paused) and haven't played today.
create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists private.push_cfg (id int primary key default 1 check (id = 1), pub text, priv text, cron_key text not null default gen_random_uuid()::text);
insert into private.push_cfg(id) values (1) on conflict do nothing;

create table if not exists public.push_subs (
  endpoint text primary key,
  student_id uuid not null references public.students(id) on delete cascade,
  p256dh text not null, auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security; -- no policies: RPC only

create or replace function public.push_public_key() returns text language sql stable security definer set search_path = '' as $$
  select pub from private.push_cfg where id = 1
$$;
grant execute on function public.push_public_key() to anon, authenticated;

create or replace function public.student_push_sub(p_token uuid, p_sub jsonb) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  insert into public.push_subs(endpoint, student_id, p256dh, auth)
  values (p_sub->>'endpoint', v_sid, p_sub->'keys'->>'p256dh', p_sub->'keys'->>'auth')
  on conflict (endpoint) do update set student_id = excluded.student_id, p256dh = excluded.p256dh, auth = excluded.auth;
  return true;
end $$;
revoke all on function public.student_push_sub(uuid, jsonb) from public;
grant execute on function public.student_push_sub(uuid, jsonb) to anon, authenticated;

-- service-role only helpers used by the edge function «push»
create or replace function public.push_cfg_get() returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('pub', pub, 'priv', priv, 'cron', cron_key) from private.push_cfg where id = 1
$$;
create or replace function public.push_cfg_set(p_pub text, p_priv text) returns void language sql security definer set search_path = '' as $$
  update private.push_cfg set pub = p_pub, priv = p_priv where id = 1 and pub is null
$$;
create or replace function public.push_targets() returns setof jsonb language sql stable security definer set search_path = public, private as $$
  select jsonb_build_object('endpoint', ps.endpoint, 'p256dh', ps.p256dh, 'auth', ps.auth, 'name', split_part(st.name, ' ', 1))
  from public.push_subs ps join public.students st on st.id = ps.student_id
  where extract(isodow from private.today_kw()) not in (5, 6)
    and exists (select 1 from public.competitions c where c.class_id = st.class_id and c.status = 'active' and c.paused_at is null
                and c.start_date <= private.today_kw() and coalesce(c.points_end_date, c.end_date) >= private.today_kw())
    and not exists (select 1 from public.attempts a where a.student_id = st.id and a.play_date = private.today_kw() and a.status = 'finished' and a.kind = 'official')
$$;
create or replace function public.push_drop(p_endpoint text) returns void language sql security definer set search_path = '' as $$
  delete from public.push_subs where endpoint = p_endpoint
$$;
revoke all on function public.push_cfg_get(), public.push_cfg_set(text, text), public.push_targets(), public.push_drop(text) from public, anon, authenticated;
grant execute on function public.push_cfg_get(), public.push_cfg_set(text, text), public.push_targets(), public.push_drop(text) to service_role;

-- 13:00 UTC = 4:00 PM Kuwait, Sunday–Thursday
select cron.unschedule('mc-reminder') where exists (select 1 from cron.job where jobname = 'mc-reminder');
select cron.schedule('mc-reminder', '0 13 * * 0-4', $c$
  select net.http_post(
    url := 'https://jrgbwgswjfkquhkebvae.supabase.co/functions/v1/push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron', (select cron_key from private.push_cfg where id = 1)),
    body := '{"send":true}'::jsonb)
$c$);

select 'ok' as done;
