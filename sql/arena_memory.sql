-- Arena: memory mini-games join the «عامة» subject (shown as «مخ وسرعة»): general + quick + memory in one card.
-- At most one game per round, only when the question time is 15s or more (the 10s tier gets none).
-- The client plays payload {kind:'game'} and answers 0 (won) / 1 (lost), exactly like the class round.

create or replace view private.arena_q as
 select q.id,
        case when q.qtype = any (array['general', 'quick', 'memory']) then 'عامة' else c.subject end as subj,
        q.level,
        (coalesce(q.payload ->> 'kind', '') = 'game') as game
   from public.questions q
   left join public.curricula c on c.id = q.curriculum_id
  where q.owner_id is null and q.status = 'approved' and q.image is null and jsonb_typeof(q.options) = 'array'
    and ( (jsonb_array_length(q.options) = 4 and coalesce(q.payload ->> 'kind', '') = ''
           and (q.qtype = any (array['general', 'quick']) or (c.id is not null and c.owner_id is null)))
       or (q.qtype = 'memory' and q.payload ->> 'kind' = 'game' and q.source = 'game') );

-- picks the questions of one round
create or replace function private.arena_pick(p_subject text, p_levels text[], p_recent uuid[], p_nq int, p_secs int)
returns setof uuid language plpgsql volatile security definer set search_path = '' as $$
declare v_ids uuid[]; v_game uuid;
begin
  select array_agg(id) into v_ids from (
    select id from private.arena_q where subj = p_subject and not game and level = any (p_levels) and not (id = any (p_recent)) order by random() limit p_nq) z;
  if coalesce(array_length(v_ids, 1), 0) < p_nq then return; end if;
  if p_secs >= 15 and random() < 0.7 then
    select id into v_game from private.arena_q where subj = p_subject and game and level = any (p_levels) and not (id = any (p_recent)) order by random() limit 1;
    if v_game is null then
      select id into v_game from private.arena_q where subj = p_subject and game and level = any (p_levels) order by random() limit 1;
    end if;
    if v_game is not null then v_ids[1 + floor(random() * p_nq)::int] := v_game; end if;
  end if;
  return query select unnest(v_ids);
end $$;
revoke all on function private.arena_pick(text, text[], uuid[], int, int) from public, anon, authenticated;

create or replace function private.arena_qjson(p_round uuid, p_pos integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('position', p_pos, 'total', r.nq, 'secs', r.secs, 'body', q.body,
    'options', case when q.payload ->> 'kind' = 'game' then q.options
               else (select jsonb_agg(q.options -> ((r.perms -> p_pos ->> k)::int) order by k) from generate_series(0, 3) k) end)
    || case when q.payload ->> 'kind' = 'game' then jsonb_build_object('payload', q.payload) else '{}'::jsonb end
  from public.arena_rounds r join public.questions q on q.id = r.qids[p_pos + 1]
  where r.id = p_round
$$;

-- patch the live functions in place (they were changed several times; replace only the picked lines)
do $do$
declare d text; n text;
  a1 text := 'select id from private.arena_q where subj = p_subject and level = any (v_levels) and not (id = any (v_recent)) order by random() limit v_nq) z;';
  b1 text := 'select id from private.arena_pick(p_subject, v_levels, v_recent, v_nq, v_secs) id) z;';
  a2 text := '(select id from private.arena_q where subj = p_subject and level = any (v_levels) order by random() limit v_nq) z;';
  b2 text := '(select id from private.arena_pick(p_subject, v_levels, ''{}''::uuid[], v_nq, v_secs) id) z;';
  a3 text := 'select k into v_disp from generate_series(0, 3) k where (v_r.perms -> p_pos ->> k)::int = v_q.correct_index;';
  a4 text := 'v_ok := ((v_r.perms -> p_pos ->> p_chosen)::int = v_q.correct_index);';
begin
  foreach n in array array['arena_start', 'arena_seek'] loop
    select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = n;
    if position('arena_pick' in d) = 0 then
      if position(a1 in d) = 0 or position(a2 in d) = 0 then raise exception 'arena_memory: % does not match', n; end if;
      execute replace(replace(d, a1, b1), a2, b2);
    end if;
  end loop;
  select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public' and p.proname = 'arena_answer';
  if position('''game''' in d) = 0 then
    if position(a3 in d) = 0 or position(a4 in d) = 0 then raise exception 'arena_memory: arena_answer does not match'; end if;
    d := replace(d, a3, a3 || ' if v_q.payload ->> ''kind'' = ''game'' then v_disp := 0; end if;');
    d := replace(d, a4, 'v_ok := case when v_q.payload ->> ''kind'' = ''game'' then p_chosen = 0 else ((v_r.perms -> p_pos ->> p_chosen)::int = v_q.correct_index) end;');
    execute d;
  end if;
end $do$;
