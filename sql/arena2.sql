-- الحلبة phase 2: drawn avatars (b1-b4 / g1-g4), dice nicknames from fixed word lists (no free text), recorded reactions.
alter table public.arena_players add column if not exists av text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'arena_players_av_ck') then
    alter table public.arena_players add constraint arena_players_av_ck check (av is null or av ~ '^[bg][1-4]$');
  end if;
end $$;
alter table public.arena_rounds add column if not exists emo jsonb not null default '[]'::jsonb;

-- nickname = one word from the boy/girl list + one from the shared list ('x'), e.g. «صقر الحلبة»
create or replace function private.arena_words(p_kind text) returns text[]
language sql immutable set search_path = '' as $$
  select case p_kind
    when 'b' then array['صقر','فهد','نجم','بطل','ذيب','فارس','برق','نسر','أسد','سهم']
    when 'g' then array['نجمة','فراشة','قمر','بطلة','لؤلؤة','وردة','شمس','غزالة','ريم','نسمة']
    else array['الحلبة','الدقيقة','الذكاء','السرعة','العلم','المعرفة'] end
$$;

create or replace function public.arena_profile(p_token uuid, p_nick text, p_av text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid; v_a text; v_b text;
begin
  v_sid := private.student_from_token(p_token);
  if p_av is null or p_av !~ '^[bg][1-4]$' then raise exception 'bad_avatar'; end if;
  v_a := split_part(coalesce(p_nick, ''), ' ', 1); v_b := split_part(coalesce(p_nick, ''), ' ', 2);
  if p_nick is distinct from v_a || ' ' || v_b or not (v_a = any (private.arena_words(left(p_av, 1)))) or not (v_b = any (private.arena_words('x'))) then
    raise exception 'bad_nick';
  end if;
  insert into public.arena_players (student_id, nick, av) values (v_sid, p_nick, p_av)
    on conflict (student_id) do update set nick = excluded.nick, av = excluded.av, updated_at = now();
  return jsonb_build_object('nick', p_nick, 'av', p_av);
end $$;

-- a reaction sent during a round is stored with the round, so whoever faces this round later sees it at the same moment
create or replace function public.arena_emote(p_token uuid, p_round uuid, p_k text, p_t numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare v_sid uuid;
begin
  v_sid := private.student_from_token(p_token);
  if not (p_k = any (array['laugh','cry','strong','fire','clap','wow'])) then return; end if;
  update public.arena_rounds
     set emo = emo || jsonb_build_object('k', p_k, 'pos', pos, 't', round(greatest(0, least(coalesce(p_t, 0), secs))::numeric, 1))
   where id = p_round and student_id = v_sid and status = 'playing' and jsonb_array_length(emo) < 3;
end $$;

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
        v_o public.arena_rounds; v_qids uuid[]; v_opp jsonb; v_perms jsonb; v_id uuid; v_recent uuid[]; v_p numeric; v_g text;
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

revoke all on function public.arena_profile(uuid, text, text), public.arena_emote(uuid, uuid, text, numeric) from public;
grant execute on function public.arena_profile(uuid, text, text), public.arena_emote(uuid, uuid, text, numeric) to anon, authenticated;
