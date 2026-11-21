-- الحلبة phase 2b: live pairing. Two players searching the same subject and tier at the same time get the same questions
-- and see each other's progress live. If nobody is searching, arena_start still gives a recorded round or a generated opponent.
alter table public.arena_rounds add column if not exists live boolean not null default false;
alter table public.arena_rounds add column if not exists sum jsonb;
create table if not exists public.arena_queue (
  student_id uuid primary key references public.students(id) on delete cascade,
  subject text not null, nq int not null, lvl int not null,
  since timestamptz not null default now(), beat timestamptz not null default now(),
  round uuid references public.arena_rounds(id) on delete cascade);
alter table public.arena_queue enable row level security;

create or replace function private.arena_payload(p_round uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('round', r.id, 'subject', r.subject, 'lvl', r.lvl, 'nq', r.nq, 'secs', r.secs, 'opp', r.opp, 'live', r.live,
    'question', private.arena_qjson(r.id, 0)) from public.arena_rounds r where r.id = p_round
$$;

-- is the live opponent still answering? (not finished, not left, not silent, and actually picked the round up)
create or replace function private.arena_opp_busy(p_round uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select r.status = 'playing' and r.pos < r.nq and r.served_at > now() - make_interval(secs => r.secs + 12)
      and not exists (select 1 from public.arena_queue q where q.round = r.id and q.beat < now() - interval '6 seconds')
    from public.arena_rounds r where r.id = p_round), false)
$$;

-- close a round: result against p_op correct answers, award points once, keep the summary
create or replace function private.arena_finish(p_round uuid, p_op int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_r public.arena_rounds; v_me int; v_speed int; v_res text; v_bonus int; v_tot int; v_before jsonb; v_after jsonb; v_old int; v_sum jsonb;
begin
  select * into v_r from public.arena_rounds where id = p_round for update;
  if v_r.status = 'done' then return v_r.sum; end if;
  if v_r.status <> 'playing' then return null; end if;
  select count(*) filter (where (e->>'ok')::boolean), coalesce(sum((e->>'sp')::int), 0) into v_me, v_speed from jsonb_array_elements(v_r.ans) e;
  v_res := case when v_me > p_op then 'win' when v_me < p_op then 'lose' else 'draw' end;
  v_bonus := case v_res when 'win' then 20 when 'draw' then 10 else 5 end;
  v_tot := v_me * 10 + v_speed + v_bonus;
  select pts into v_old from public.arena_players where student_id = v_r.student_id;
  v_before := private.arena_lvl(coalesce(v_old, 0));
  update public.arena_players set pts = pts + v_tot, games = games + 1, wins = wins + (v_res = 'win')::int, updated_at = now() where student_id = v_r.student_id;
  v_after := private.arena_lvl(coalesce(v_old, 0) + v_tot);
  v_sum := jsonb_build_object('me', v_me, 'opp', p_op, 'result', v_res, 'correct_pts', v_me * 10, 'speed_pts', v_speed,
      'bonus', v_bonus, 'pts', v_tot, 'before', v_before, 'after', v_after, 'up', (v_after->>'n')::int > (v_before->>'n')::int,
      'tier_up', (private.arena_tier((v_after->>'n')::int)->>'t') <> (private.arena_tier((v_before->>'n')::int)->>'t'));
  update public.arena_rounds set status = 'done', result = v_res, pts = v_tot, sum = v_sum where id = p_round;
  return v_sum;
end $$;

create or replace function private.arena_okn(p_round uuid) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((select count(*) filter (where (e->>'ok')::boolean) from public.arena_rounds r, jsonb_array_elements(r.ans) e where r.id = p_round), 0)::int
$$;

-- called every ~1.5s while searching: joins the queue, and returns a round as soon as another searcher is paired with me
create or replace function public.arena_seek(p_token uuid, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_pts int; v_lvl int; v_t jsonb; v_nq int; v_secs int; v_levels text[]; v_rid uuid; v_q public.arena_queue;
        v_qids uuid[]; v_a uuid; v_b uuid; v_olvl int; v_perms jsonb; v_recent uuid[];
begin
  v_sid := private.student_from_token(p_token);
  insert into public.arena_players (student_id) values (v_sid) on conflict do nothing;
  perform pg_advisory_xact_lock(hashtext('arena_queue'));
  delete from public.arena_queue where beat < now() - interval '2 minutes';
  select round into v_rid from public.arena_queue where student_id = v_sid;
  if v_rid is not null then
    delete from public.arena_queue where student_id = v_sid;
    if exists (select 1 from public.arena_rounds where id = v_rid and status = 'playing') then return private.arena_payload(v_rid); end if;
  end if;
  select pts into v_pts from public.arena_players where student_id = v_sid;
  v_lvl := (private.arena_lvl(v_pts)->>'n')::int; v_t := private.arena_tier(v_lvl);
  v_nq := (v_t->>'nq')::int; v_secs := (v_t->>'secs')::int;
  select array_agg(x) into v_levels from jsonb_array_elements_text(v_t->'levels') x;
  select * into v_q from public.arena_queue q
   where q.student_id <> v_sid and q.subject = p_subject and q.nq = v_nq and q.round is null and q.beat > now() - interval '5 seconds'
   order by q.since limit 1;
  if found then
    select coalesce(array_agg(q), '{}') into v_recent from (
      select unnest(qids) q from (select qids from public.arena_rounds where student_id in (v_sid, v_q.student_id) order by created_at desc limit 16) z) y;
    select array_agg(id) into v_qids from (
      select id from private.arena_q where subj = p_subject and level = any (v_levels) and not (id = any (v_recent)) order by random() limit v_nq) z;
    if coalesce(array_length(v_qids, 1), 0) < v_nq then
      select array_agg(id) into v_qids from (select id from private.arena_q where subj = p_subject and level = any (v_levels) order by random() limit v_nq) z;
    end if;
  end if;
  if v_q.student_id is not null and coalesce(array_length(v_qids, 1), 0) = v_nq then
    update public.arena_rounds set status = 'left' where student_id in (v_sid, v_q.student_id) and status = 'playing';
    v_olvl := (private.arena_lvl((select pts from public.arena_players where student_id = v_q.student_id))->>'n')::int;
    select jsonb_agg((select jsonb_agg(k order by random()) from generate_series(0, 3) k where g = g)) into v_perms from generate_series(1, v_nq) g;
    insert into public.arena_rounds (student_id, subject, lvl, nq, secs, qids, perms, opp, served_at, live)
      values (v_sid, p_subject, v_lvl, v_nq, v_secs, v_qids, v_perms, jsonb_build_object('live', true, 'name', private.arena_nick(v_q.student_id),
        'avatar', (select avatar from public.students where id = v_q.student_id), 'av', (select av from public.arena_players where student_id = v_q.student_id), 'lvl', coalesce(v_olvl, 1)),
        now() + interval '10 seconds', true) returning id into v_a;
    select jsonb_agg((select jsonb_agg(k order by random()) from generate_series(0, 3) k where g = g)) into v_perms from generate_series(1, v_nq) g;
    insert into public.arena_rounds (student_id, subject, lvl, nq, secs, qids, perms, opp, served_at, live, opp_round)
      values (v_q.student_id, p_subject, coalesce(v_olvl, 1), v_nq, v_secs, v_qids, v_perms, jsonb_build_object('live', true, 'name', private.arena_nick(v_sid),
        'avatar', (select avatar from public.students where id = v_sid), 'av', (select av from public.arena_players where student_id = v_sid), 'lvl', v_lvl),
        now() + interval '10 seconds', true, v_a) returning id into v_b;
    update public.arena_rounds set opp_round = v_b where id = v_a;
    update public.arena_queue set round = v_b, beat = now() where student_id = v_q.student_id;
    delete from public.arena_queue where student_id = v_sid;
    return private.arena_payload(v_a);
  end if;
  insert into public.arena_queue (student_id, subject, nq, lvl) values (v_sid, p_subject, v_nq, v_lvl)
    on conflict (student_id) do update set subject = excluded.subject, nq = excluded.nq, lvl = excluded.lvl, beat = now(), round = null,
      since = case when public.arena_queue.subject = excluded.subject then public.arena_queue.since else now() end;
  return null;
end $$;

-- leave the search, or leave a round (the live opponent then stops waiting for me)
create or replace function public.arena_leave(p_token uuid, p_round uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_rid uuid;
begin
  v_sid := private.student_from_token(p_token);
  perform pg_advisory_xact_lock(hashtext('arena_queue'));
  select round into v_rid from public.arena_queue where student_id = v_sid;
  delete from public.arena_queue where student_id = v_sid;
  update public.arena_rounds set status = 'left' where student_id = v_sid and status = 'playing' and id in (p_round, v_rid);
end $$;

-- live rounds only, polled about once a second: the opponent's progress and reactions, and my summary once both are finished
create or replace function public.arena_peek(p_token uuid, p_round uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_r public.arena_rounds; v_o public.arena_rounds; v_sum jsonb;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_r from public.arena_rounds where id = p_round and student_id = v_sid;
  if not found or not v_r.live then return null; end if;
  if v_r.status = 'done' then v_sum := v_r.sum;
  elsif v_r.status = 'playing' and v_r.pos >= v_r.nq and not private.arena_opp_busy(v_r.opp_round) then
    perform pg_advisory_xact_lock(hashtext('arena_pair' || least(v_r.id, v_r.opp_round)::text));
    v_sum := private.arena_finish(v_r.id, private.arena_okn(v_r.opp_round));
  end if;
  select * into v_o from public.arena_rounds where id = v_r.opp_round;
  return jsonb_build_object('ans', coalesce((select jsonb_agg((e->>'ok')::boolean order by i) from jsonb_array_elements(v_o.ans) with ordinality z(e, i)), '[]'::jsonb),
    'emo', coalesce(v_o.emo, '[]'::jsonb), 'left', coalesce(v_o.status = 'left', true), 'summary', v_sum);
end $$;

create or replace function public.arena_answer(p_token uuid, p_round uuid, p_pos int, p_chosen int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_r public.arena_rounds; v_q public.questions; v_el numeric; v_ok boolean := false; v_sp int := 0;
        v_disp int; v_op int; v_o public.arena_rounds; v_base jsonb;
begin
  v_sid := private.student_from_token(p_token);
  select * into v_r from public.arena_rounds where id = p_round and student_id = v_sid;
  if not found then raise exception 'round_not_found'; end if;
  if v_r.live then perform pg_advisory_xact_lock(hashtext('arena_pair' || least(v_r.id, v_r.opp_round)::text)); end if;
  select * into v_r from public.arena_rounds where id = p_round and student_id = v_sid for update;
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
  v_base := jsonb_build_object('correct', v_ok, 'correct_index', v_disp, 'speed', v_sp);
  if v_r.pos < v_r.nq then return v_base || jsonb_build_object('question', private.arena_qjson(p_round, v_r.pos)); end if;
  if v_r.live then
    if private.arena_opp_busy(v_r.opp_round) then return v_base || jsonb_build_object('wait', true); end if;
    select * into v_o from public.arena_rounds where id = v_r.opp_round;
    -- the opponent finished first and is waiting for me: close their round too
    if v_o.status = 'playing' and v_o.pos >= v_o.nq then perform private.arena_finish(v_o.id, private.arena_okn(v_r.id)); end if;
    v_op := private.arena_okn(v_r.opp_round);
  else
    select count(*) filter (where (e->>'ok')::boolean) into v_op from jsonb_array_elements(v_r.opp->'ans') e;
  end if;
  return v_base || jsonb_build_object('summary', private.arena_finish(p_round, coalesce(v_op, 0)));
end $$;

create or replace function public.arena_start(p_token uuid, p_subject text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_pts int; v_lvl int; v_t jsonb; v_nq int; v_secs int; v_levels text[];
        v_o public.arena_rounds; v_qids uuid[]; v_opp jsonb; v_perms jsonb; v_id uuid; v_recent uuid[]; v_p numeric; v_g text;
begin
  v_sid := private.student_from_token(p_token);
  insert into public.arena_players (student_id) values (v_sid) on conflict do nothing;
  -- paired with a live player in the last moment of the search: play that round instead of a recorded one
  perform pg_advisory_xact_lock(hashtext('arena_queue'));
  select round into v_id from public.arena_queue where student_id = v_sid;
  delete from public.arena_queue where student_id = v_sid;
  if v_id is not null and exists (select 1 from public.arena_rounds where id = v_id and status = 'playing') then
    return private.arena_payload(v_id);
  end if;
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
      'av', (select av from public.arena_players where student_id = v_o.student_id), 'emo', coalesce(v_o.emo, '[]'::jsonb),
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
    v_g := case when random() < 0.5 then 'b' else 'g' end;
    v_opp := jsonb_build_object('bot', true,
      'name', (select w[1 + floor(random() * array_length(w, 1))::int] from (select private.arena_words(v_g) w) z) || ' ' ||
              (select w[1 + floor(random() * array_length(w, 1))::int] from (select private.arena_words('x') w) z),
      'av', v_g || (1 + floor(random() * 4)::int)::text,
      'lvl', greatest(1, v_lvl + floor(random() * 3)::int - 1),
      'emo', case when random() < 0.5 then jsonb_build_array(jsonb_build_object('k', (array['fire','strong','laugh','clap','wow'])[1 + floor(random() * 5)::int], 'pos', floor(random() * v_nq)::int, 't', round((2 + random() * 6)::numeric, 1))) else '[]'::jsonb end,
      'ans', (select jsonb_agg(jsonb_build_object('ok', random() < v_p, 't', round((3 + random() * (v_secs - 7))::numeric, 1))) from generate_series(1, v_nq)));
  end if;
  select jsonb_agg((select jsonb_agg(k order by random()) from generate_series(0, 3) k where g = g)) into v_perms from generate_series(1, v_nq) g;
  insert into public.arena_rounds (student_id, subject, lvl, nq, secs, qids, perms, opp_round, opp, served_at)
    values (v_sid, p_subject, v_lvl, v_nq, v_secs, v_qids, v_perms, v_o.id, v_opp, now() + interval '6 seconds')
    returning id into v_id;
  return jsonb_build_object('round', v_id, 'subject', p_subject, 'lvl', v_lvl, 'nq', v_nq, 'secs', v_secs,
    'opp', v_opp, 'question', private.arena_qjson(v_id, 0));
end $$;


-- who is here right now: searching, or inside a round (touched in the last 45 seconds)
create or replace view private.arena_now as
  select student_id, subject from public.arena_queue where beat > now() - interval '8 seconds'
  union
  select student_id, subject from public.arena_rounds where status = 'playing' and served_at > now() - interval '45 seconds';

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
    'av', v_p.av, 'setup', (v_p.av is null),
    'today', (select count(*) from public.arena_rounds where student_id = v_sid and status = 'done' and created_at >= v_day),
    'players_today', (select count(distinct student_id) from public.arena_rounds where created_at >= v_day),
    'now', (select count(*) from private.arena_now),
    'subjects', coalesce((select jsonb_agg(jsonb_build_object('s', x.subj, 'q', x.n, 'played', x.played, 'now', (select count(*) from private.arena_now n where n.subject = x.subj)) order by x.played desc, x.n desc)
      from (select a.subj, count(*) n,
              (select count(distinct r.student_id) from public.arena_rounds r where r.subject = a.subj and r.created_at >= v_day) played
            from private.arena_q a
            where a.level in (select jsonb_array_elements_text(v_t->'levels'))
            group by a.subj having count(*) >= 12) x), '[]'::jsonb));
end $$;


revoke all on function public.arena_seek(uuid, text), public.arena_leave(uuid, uuid), public.arena_peek(uuid, uuid) from public;
grant execute on function public.arena_seek(uuid, text), public.arena_leave(uuid, uuid), public.arena_peek(uuid, uuid) to anon, authenticated;
