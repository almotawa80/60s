-- v409 «لعب مباشر في الصف» (live class game): teacher drives, students answer on phones. Fun only, no class points.
create table if not exists public.live_games (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  class_id uuid not null references public.classes(id) on delete cascade,
  status text not null default 'lobby',   -- lobby | q | reveal | done
  qi int not null default -1,
  qs jsonb not null,                      -- [{body, options, c}]
  secs int not null default 20,
  q_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.live_players (
  game_id uuid not null references public.live_games(id) on delete cascade,
  student_id uuid not null,
  pts int not null default 0,
  joined_at timestamptz not null default now(),
  primary key (game_id, student_id)
);
create table if not exists public.live_answers (
  game_id uuid not null references public.live_games(id) on delete cascade,
  qi int not null,
  student_id uuid not null,
  choice int not null,
  ms int not null,
  ok boolean not null,
  pts int not null,
  primary key (game_id, qi, student_id)
);
alter table public.live_games enable row level security;
alter table public.live_players enable row level security;
alter table public.live_answers enable row level security;

create or replace function public.live_create(p_class uuid, p_qs jsonb, p_secs int default 20) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_t uuid := sup.uid_w(); v_id uuid;
begin
  if v_t is null or not exists (select 1 from public.classes where id = p_class and teacher_id = v_t) then raise exception 'not_allowed'; end if;
  if jsonb_typeof(p_qs) <> 'array' or jsonb_array_length(p_qs) < 1 or jsonb_array_length(p_qs) > 30 then raise exception 'bad_questions'; end if;
  update public.live_games set status = 'done' where class_id = p_class and status <> 'done';
  insert into public.live_games (teacher_id, class_id, qs, secs) values (v_t, p_class, p_qs, greatest(5, least(60, coalesce(p_secs, 20)))) returning id into v_id;
  return v_id;
end $$;

create or replace function public.live_t_state(p_game uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g public.live_games; v_n int; v_q jsonb; v_votes jsonb; v_ans int; v_pl jsonb;
begin
  select * into g from public.live_games where id = p_game and teacher_id = sup.uid();
  if not found then raise exception 'not_found'; end if;
  v_n := jsonb_array_length(g.qs);
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'av', s.avatar, 'pts', p.pts) order by p.pts desc, p.joined_at), '[]'::jsonb)
    into v_pl from public.live_players p join public.students s on s.id = p.student_id where p.game_id = g.id;
  if g.qi >= 0 and g.qi < v_n then
    v_q := jsonb_build_object('body', g.qs->g.qi->>'body', 'options', g.qs->g.qi->'options');
    select count(*) into v_ans from public.live_answers where game_id = g.id and qi = g.qi;
    if g.status in ('reveal', 'done') then
      select coalesce(jsonb_agg(c order by o), '[]'::jsonb) into v_votes from (
        select o, (select count(*) from public.live_answers a where a.game_id = g.id and a.qi = g.qi and a.choice = o) c
        from generate_series(0, jsonb_array_length(g.qs->g.qi->'options') - 1) o) x;
    end if;
  end if;
  return jsonb_build_object('status', g.status, 'qi', g.qi, 'n', v_n, 'secs', g.secs, 'q_at', g.q_at, 'now', now(),
    'q', v_q, 'answered', coalesce(v_ans, 0), 'players', v_pl,
    'votes', v_votes, 'c', case when g.status in ('reveal', 'done') and g.qi >= 0 and g.qi < v_n then (g.qs->g.qi->>'c')::int end,
    'class_id', g.class_id);
end $$;

create or replace function public.live_t_act(p_game uuid, p_act text) returns void
language plpgsql security definer set search_path = '' as $$
declare g public.live_games; v_n int;
begin
  select * into g from public.live_games where id = p_game and teacher_id = sup.uid_w() for update;
  if not found then raise exception 'not_found'; end if;
  v_n := jsonb_array_length(g.qs);
  if p_act = 'start' and g.status = 'lobby' then
    update public.live_games set status = 'q', qi = 0, q_at = now() where id = g.id;
  elsif p_act = 'reveal' and g.status = 'q' then
    update public.live_players p set pts = p.pts + a.pts from public.live_answers a
      where a.game_id = g.id and a.qi = g.qi and a.student_id = p.student_id and p.game_id = g.id and a.ok;
    update public.live_games set status = 'reveal' where id = g.id;
  elsif p_act = 'next' and g.status = 'reveal' then
    if g.qi + 1 >= v_n then update public.live_games set status = 'done' where id = g.id;
    else update public.live_games set status = 'q', qi = g.qi + 1, q_at = now() where id = g.id; end if;
  elsif p_act = 'end' then
    update public.live_games set status = 'done' where id = g.id;
  end if;
end $$;

create or replace function public.student_live(p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_cls uuid; g public.live_games;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'invalid_session'; end if;
  select class_id into v_cls from public.students where id = v_sid;
  select * into g from public.live_games where class_id = v_cls and status <> 'done' and created_at > now() - interval '3 hours' order by created_at desc limit 1;
  if not found then return null; end if;
  return jsonb_build_object('id', g.id, 'status', g.status);
end $$;

create or replace function public.live_join(p_token uuid, p_game uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_cls uuid;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'invalid_session'; end if;
  select class_id into v_cls from public.students where id = v_sid;
  if not exists (select 1 from public.live_games where id = p_game and class_id = v_cls and status <> 'done') then raise exception 'not_found'; end if;
  insert into public.live_players (game_id, student_id) values (p_game, v_sid) on conflict do nothing;
end $$;

create or replace function public.live_s_state(p_token uuid, p_game uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; g public.live_games; v_n int; v_me public.live_players; v_a public.live_answers; v_rank int; v_np int; v_top jsonb; v_q jsonb;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'invalid_session'; end if;
  select * into g from public.live_games where id = p_game;
  if not found then raise exception 'not_found'; end if;
  select * into v_me from public.live_players where game_id = g.id and student_id = v_sid;
  if not found then raise exception 'not_joined'; end if;
  v_n := jsonb_array_length(g.qs);
  select count(*), 1 + count(*) filter (where pts > v_me.pts) into v_np, v_rank from public.live_players where game_id = g.id;
  if g.qi >= 0 and g.qi < v_n then
    v_q := jsonb_build_object('body', g.qs->g.qi->>'body', 'options', g.qs->g.qi->'options');
    select * into v_a from public.live_answers where game_id = g.id and qi = g.qi and student_id = v_sid;
  end if;
  if g.status = 'done' then
    select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'av', s.avatar, 'pts', x.pts) order by x.pts desc), '[]'::jsonb) into v_top
      from (select * from public.live_players where game_id = g.id order by pts desc, joined_at limit 3) x join public.students s on s.id = x.student_id;
  end if;
  return jsonb_build_object('status', g.status, 'qi', g.qi, 'n', v_n, 'secs', g.secs, 'q_at', g.q_at, 'now', now(),
    'q', v_q, 'choice', v_a.choice, 'pts', v_me.pts, 'rank', v_rank, 'players', v_np, 'top', v_top,
    'c', case when g.status in ('reveal', 'done') and g.qi >= 0 and g.qi < v_n then (g.qs->g.qi->>'c')::int end,
    'got', case when g.status in ('reveal', 'done') then v_a.pts end, 'ok', case when g.status in ('reveal', 'done') then v_a.ok end);
end $$;

create or replace function public.live_answer(p_token uuid, p_game uuid, p_choice int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; g public.live_games; v_ms int; v_ok boolean; v_pts int;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'invalid_session'; end if;
  select * into g from public.live_games where id = p_game;
  if not found or g.status <> 'q' then return; end if;
  if not exists (select 1 from public.live_players where game_id = g.id and student_id = v_sid) then raise exception 'not_joined'; end if;
  v_ms := greatest(0, (extract(epoch from now() - g.q_at) * 1000)::int);
  if v_ms > g.secs * 1000 + 1500 then return; end if;
  v_ok := p_choice = (g.qs->g.qi->>'c')::int;
  v_pts := case when v_ok then 100 + round(50 * greatest(0, 1 - v_ms::numeric / (g.secs * 1000)))::int else 0 end;
  insert into public.live_answers (game_id, qi, student_id, choice, ms, ok, pts) values (g.id, g.qi, v_sid, p_choice, v_ms, v_ok, v_pts) on conflict do nothing;
end $$;

revoke all on function public.live_create(uuid, jsonb, int), public.live_t_state(uuid), public.live_t_act(uuid, text), public.student_live(uuid), public.live_join(uuid, uuid), public.live_s_state(uuid, uuid), public.live_answer(uuid, uuid, int) from public;
grant execute on function public.live_create(uuid, jsonb, int), public.live_t_state(uuid), public.live_t_act(uuid, text) to authenticated;
grant execute on function public.student_live(uuid), public.live_join(uuid, uuid), public.live_s_state(uuid, uuid), public.live_answer(uuid, uuid, int) to anon, authenticated;
