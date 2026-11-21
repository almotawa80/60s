-- الحلبة (public arena), phase 1: levels, duel vs a recorded round (or a generated opponent when none exists yet).
-- 60 levels; level n -> n+1 costs 100 + 20*(n-1). Levels 1-10: 3 questions x 20s, 11-30: 4 x 15s, 31-60: 6 x 10s.
-- Points per round: 10 per correct + up to 5 speed per correct + 20 win / 10 draw / 5 loss. Level never drops.

create table if not exists public.arena_players (
  student_id uuid primary key references public.students(id) on delete cascade,
  pts int not null default 0,
  wins int not null default 0,
  games int not null default 0,
  nick text,
  updated_at timestamptz not null default now()
);
create table if not exists public.arena_rounds (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject text not null,
  lvl smallint not null default 1,
  nq smallint not null,
  secs smallint not null,
  qids uuid[] not null,
  perms jsonb not null,
  opp_round uuid,
  opp jsonb not null,
  ans jsonb not null default '[]'::jsonb,
  pos smallint not null default 0,
  served_at timestamptz not null default now(),
  status text not null default 'playing',
  result text,
  pts int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists arena_rounds_student on public.arena_rounds (student_id, created_at desc);
create index if not exists arena_rounds_pool on public.arena_rounds (subject, nq, status);
alter table public.arena_players enable row level security;
alter table public.arena_rounds enable row level security;
-- no policies: only the SECURITY DEFINER functions below read or write these tables.

create or replace function private.arena_lvl(p int) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare n int := 1; lo int := 0; c int := 100;
begin
  loop
    c := 100 + 20 * (n - 1);
    exit when n >= 60 or p < lo + c;
    lo := lo + c; n := n + 1;
  end loop;
  return jsonb_build_object('n', n, 'into', least(greatest(p - lo, 0), c), 'need', c,
    'stars', case when n >= 60 then greatest(0, p - lo - c) / 1000 else 0 end);
end $$;

create or replace function private.arena_tier(p_lvl int) returns jsonb
language sql immutable set search_path = '' as $$
  select case when p_lvl <= 10 then jsonb_build_object('t', 1, 'nq', 3, 'secs', 20, 'levels', jsonb_build_array('easy'))
              when p_lvl <= 30 then jsonb_build_object('t', 2, 'nq', 4, 'secs', 15, 'levels', jsonb_build_array('easy', 'medium'))
              else jsonb_build_object('t', 3, 'nq', 6, 'secs', 10, 'levels', jsonb_build_array('medium', 'hard')) end
$$;

-- bank questions the arena can use: approved, 4 options, no image, plain multiple choice
create or replace view private.arena_q as
  select q.id, case when q.qtype in ('general', 'quick') then 'عامة' else c.subject end as subj, q.level
  from public.questions q left join public.curricula c on c.id = q.curriculum_id
  where q.owner_id is null and q.status = 'approved' and q.image is null
    and jsonb_typeof(q.options) = 'array' and jsonb_array_length(q.options) = 4
    and coalesce(q.payload->>'kind', '') = ''
    and (q.qtype in ('general', 'quick') or (c.id is not null and c.owner_id is null));

create or replace function private.arena_nick(p_sid uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select nullif(nick, '') from public.arena_players where student_id = p_sid),
    (select case when s.gender = 'f'
        then (array['نجمة ذكية','فراشة سريعة','قمر الحلبة','بطلة الدقيقة','لؤلؤة العلم','وردة الذكاء','شمس المعرفة','غزالة سريعة'])[1 + abs(hashtext(p_sid::text)) % 8]
        else (array['صقر سريع','فهد ذكي','نجم الحلبة','بطل الدقيقة','ذيب الأسئلة','فارس العلم','برق الحلبة','نسر المعرفة'])[1 + abs(hashtext(p_sid::text)) % 8] end
     from public.students s where s.id = p_sid))
$$;

create or replace function private.arena_qjson(p_round uuid, p_pos int) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('position', p_pos, 'total', r.nq, 'secs', r.secs, 'body', q.body,
    'options', (select jsonb_agg(q.options -> ((r.perms -> p_pos ->> k)::int) order by k) from generate_series(0, 3) k))
  from public.arena_rounds r join public.questions q on q.id = r.qids[p_pos + 1]
  where r.id = p_round
$$;

create or replace function public.arena_home(p_token uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_p public.arena_players; v_l jsonb; v_t jsonb; v_day timestamptz;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_p from public.arena_players where student_id = v_sid;
  v_l := private.arena_lvl(coalesce(v_p.pts, 0));
  v_t := private.arena_tier((v_l->>'n')::int);
  v_day := date_trunc('day', now() at time zone 'Asia/Kuwait') at time zone 'Asia/Kuwait';
  return jsonb_build_object(
    'pts', coalesce(v_p.pts, 0), 'lvl', v_l, 'tier', v_t - 'levels',
    'wins', coalesce(v_p.wins, 0), 'games', coalesce(v_p.games, 0),
    'nick', private.arena_nick(v_sid),
    'avatar', (select avatar from public.students where id = v_sid),
    'today', (select count(*) from public.arena_rounds where student_id = v_sid and status = 'done' and created_at >= v_day),
    'players_today', (select count(distinct student_id) from public.arena_rounds where created_at >= v_day),
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('s', x.subj, 'q', x.n, 'played', x.played) order by x.played desc, x.n desc)
      from (select a.subj, count(*) n,
              (select count(distinct r.student_id) from public.arena_rounds r where r.subject = a.subj and r.created_at >= v_day) played
            from private.arena_q a
            where a.level in (select jsonb_array_elements_text(v_t->'levels'))
            group by a.subj having count(*) >= 12) x), '[]'::jsonb));
end $$;

create or replace function public.arena_start(p_token uuid, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_pts int; v_lvl int; v_t jsonb; v_nq int; v_secs int; v_levels text[];
        v_o public.arena_rounds; v_qids uuid[]; v_opp jsonb; v_perms jsonb; v_id uuid; v_recent uuid[]; v_p numeric;
begin
  v_sid := private.student_from_token(p_token);
  insert into public.arena_players (student_id) values (v_sid) on conflict do nothing;
  update public.arena_rounds set status = 'left' where student_id = v_sid and status = 'playing';
  select pts into v_pts from public.arena_players where student_id = v_sid;
  v_lvl := (private.arena_lvl(v_pts)->>'n')::int;
  v_t := private.arena_tier(v_lvl);
  v_nq := (v_t->>'nq')::int; v_secs := (v_t->>'secs')::int;
  select array_agg(x) into v_levels from jsonb_array_elements_text(v_t->'levels') x;
  select coalesce(array_agg(q), '{}') into v_recent from (
    select unnest(qids) q from (select qids from public.arena_rounds where student_id = v_sid order by created_at desc limit 12) z) y;

  -- 1) a real recorded round from another player: same subject and tier, never faced, no question seen recently
  select r.* into v_o from public.arena_rounds r
   where r.status = 'done' and r.subject = p_subject and r.nq = v_nq and r.student_id <> v_sid
     and r.created_at > now() - interval '45 days'
     and not exists (select 1 from public.arena_rounds m where m.student_id = v_sid and m.opp_round = r.id)
     and not (r.qids && v_recent)
     and (select count(*) from private.arena_q a where a.id = any (r.qids)) = v_nq
   order by abs(r.lvl - v_lvl), random() limit 1;
  if found then
    v_qids := v_o.qids;
    v_opp := jsonb_build_object('name', private.arena_nick(v_o.student_id),
      'avatar', (select avatar from public.students where id = v_o.student_id), 'lvl', v_o.lvl,
      'ans', (select jsonb_agg(jsonb_build_object('ok', (e->>'ok')::boolean, 't', (e->>'t')::numeric) order by i) from jsonb_array_elements(v_o.ans) with ordinality z(e, i)));
  else
    -- 2) nobody recorded yet: fresh questions and a generated opponent of about the same strength
    select array_agg(id) into v_qids from (
      select id from private.arena_q where subj = p_subject and level = any (v_levels) and not (id = any (v_recent)) order by random() limit v_nq) z;
    if coalesce(array_length(v_qids, 1), 0) < v_nq then
      select array_agg(id) into v_qids from (select id from private.arena_q where subj = p_subject and level = any (v_levels) order by random() limit v_nq) z;
    end if;
    if coalesce(array_length(v_qids, 1), 0) < v_nq then raise exception 'no_questions'; end if;
    v_p := case when v_nq = 3 then 0.55 when v_nq = 4 then 0.62 else 0.68 end;
    v_opp := jsonb_build_object('bot', true,
      'name', (array['صقر سريع','فهد ذكي','نجم الحلبة','ذيب الأسئلة','فارس العلم','نجمة ذكية','قمر الحلبة','وردة الذكاء','برق الحلبة','لؤلؤة العلم'])[1 + floor(random() * 10)::int],
      'avatar', (array['🦁','🐯','🐼','🦊','🐨','🦉','🦅','🐬','🦄','🚀'])[1 + floor(random() * 10)::int],
      'lvl', greatest(1, v_lvl + floor(random() * 3)::int - 1),
      'ans', (select jsonb_agg(jsonb_build_object('ok', random() < v_p, 't', round((3 + random() * (v_secs - 7))::numeric, 1))) from generate_series(1, v_nq)));
  end if;
  select jsonb_agg((select jsonb_agg(k order by random()) from generate_series(0, 3) k where g = g)) into v_perms from generate_series(1, v_nq) g;
  insert into public.arena_rounds (student_id, subject, lvl, nq, secs, qids, perms, opp_round, opp, served_at)
    values (v_sid, p_subject, v_lvl, v_nq, v_secs, v_qids, v_perms, v_o.id, v_opp, now() + interval '6 seconds')
    returning id into v_id;
  return jsonb_build_object('round', v_id, 'subject', p_subject, 'lvl', v_lvl, 'nq', v_nq, 'secs', v_secs,
    'opp', v_opp, 'question', private.arena_qjson(v_id, 0));
end $$;

-- the client calls this when a question is actually on screen, so the clock is fair on slow phones
create or replace function public.arena_served(p_token uuid, p_round uuid, p_pos int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  update public.arena_rounds set served_at = now()
   where id = p_round and student_id = v_sid and status = 'playing' and pos = p_pos and served_at > now();
end $$;

create or replace function public.arena_answer(p_token uuid, p_round uuid, p_pos int, p_chosen int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_r public.arena_rounds; v_q public.questions; v_el numeric; v_ok boolean := false; v_sp int := 0;
        v_disp int; v_me int; v_op int; v_res text; v_bonus int; v_speed int; v_tot int; v_before jsonb; v_after jsonb; v_old int;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_r from public.arena_rounds where id = p_round and student_id = v_sid for update;
  if not found then raise exception 'round_not_found'; end if;
  if v_r.status <> 'playing' or p_pos <> v_r.pos then raise exception 'wrong_position'; end if;
  select * into v_q from public.questions where id = v_r.qids[p_pos + 1];
  -- served_at still in the future = the client never confirmed the question was shown: no speed advantage
  v_el := case when v_r.served_at > now() then v_r.secs * 0.6 else extract(epoch from (now() - v_r.served_at)) end;
  select k into v_disp from generate_series(0, 3) k where (v_r.perms -> p_pos ->> k)::int = v_q.correct_index;
  if p_chosen is not null and p_chosen between 0 and 3 and v_el <= v_r.secs + 2 then
    v_ok := ((v_r.perms -> p_pos ->> p_chosen)::int = v_q.correct_index);
  end if;
  if v_ok then v_sp := round(5 * greatest(0, v_r.secs - v_el) / v_r.secs::numeric)::int; end if;
  update public.arena_rounds
     set ans = ans || jsonb_build_object('ok', v_ok, 't', round(least(v_el, v_r.secs)::numeric, 1), 'sp', v_sp),
         pos = pos + 1, served_at = now() + interval '6 seconds'
   where id = p_round returning * into v_r;
  if v_r.pos < v_r.nq then
    return jsonb_build_object('correct', v_ok, 'correct_index', v_disp, 'speed', v_sp, 'question', private.arena_qjson(p_round, v_r.pos));
  end if;
  select count(*) filter (where (e->>'ok')::boolean), coalesce(sum((e->>'sp')::int), 0) into v_me, v_speed from jsonb_array_elements(v_r.ans) e;
  select count(*) filter (where (e->>'ok')::boolean) into v_op from jsonb_array_elements(v_r.opp->'ans') e;
  v_res := case when v_me > v_op then 'win' when v_me < v_op then 'lose' else 'draw' end;
  v_bonus := case v_res when 'win' then 20 when 'draw' then 10 else 5 end;
  v_tot := v_me * 10 + v_speed + v_bonus;
  select pts into v_old from public.arena_players where student_id = v_sid;
  v_before := private.arena_lvl(coalesce(v_old, 0));
  update public.arena_players set pts = pts + v_tot, games = games + 1, wins = wins + (v_res = 'win')::int, updated_at = now() where student_id = v_sid;
  update public.arena_rounds set status = 'done', result = v_res, pts = v_tot where id = p_round;
  v_after := private.arena_lvl(coalesce(v_old, 0) + v_tot);
  return jsonb_build_object('correct', v_ok, 'correct_index', v_disp, 'speed', v_sp,
    'summary', jsonb_build_object('me', v_me, 'opp', v_op, 'result', v_res, 'correct_pts', v_me * 10, 'speed_pts', v_speed,
      'bonus', v_bonus, 'pts', v_tot, 'before', v_before, 'after', v_after, 'up', (v_after->>'n')::int > (v_before->>'n')::int,
      'tier_up', (private.arena_tier((v_after->>'n')::int)->>'t') <> (private.arena_tier((v_before->>'n')::int)->>'t')));
end $$;

revoke all on function public.arena_home(uuid), public.arena_start(uuid, text), public.arena_served(uuid, uuid, int), public.arena_answer(uuid, uuid, int, int) from public;
grant execute on function public.arena_home(uuid), public.arena_start(uuid, text), public.arena_served(uuid, uuid, int), public.arena_answer(uuid, uuid, int, int) to anon, authenticated;
