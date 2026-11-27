-- v510 (Khalid 2026-11-27): arena ranking (day / week / all), robot opponent shown as «خصم آلي», name fix wipes arena progress too.

-- 1) anyone who is not live right now is shown as «خصم آلي» with a robot picture (recorded rounds still drive its answers)
do $$ declare d text; a text := '  select jsonb_agg((select jsonb_agg(k order by random()) from generate_series(0, 3) k where g = g)) into v_perms from generate_series(1, v_nq) g;';
begin
  d := pg_get_functiondef('public.arena_start(uuid, text)'::regprocedure);
  if position('خصم آلي' in d) = 0 then
    if position(a in d) = 0 then raise exception 'arena_ranks: arena_start does not match'; end if;
    d := replace(d, a, '  v_opp := (v_opp - ''avatar'') || jsonb_build_object(''bot'', true, ''name'', ''خصم آلي'', ''av'', ''bot'');' || chr(10) || a);
    execute d;
  end if;
end $$;

-- 2) wrong-name fix: «امسح كل اللي لعبه» also removes the arena rounds since that device entered, and rebuilds the arena points from what is left
create or replace function public.teacher_name_info(p_student uuid) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare v_since timestamptz;
begin
  if not exists (select 1 from public.students s join public.classes c on c.id = s.class_id where s.id = p_student and c.teacher_id = sup.uid()) then raise exception 'forbidden'; end if;
  select min(created_at) into v_since from public.student_sessions where student_id = p_student;
  return jsonb_build_object('devices', (select count(*) from public.student_sessions where student_id = p_student), 'since', v_since,
    'rounds', (select count(*) from public.attempts where student_id = p_student and v_since is not null and started_at >= v_since),
    'points', (select coalesce(sum(total_points), 0) from public.attempts where student_id = p_student and v_since is not null and started_at >= v_since and kind <> 'practice'),
    'arena', (select count(*) from public.arena_rounds where student_id = p_student and v_since is not null and created_at >= v_since));
end $$;

create or replace function public.teacher_name_fix(p_student uuid, p_wipe boolean) returns jsonb
language plpgsql security definer set search_path = public, private as $$
declare v_since timestamptz; v_code text; v_n int := 0;
begin
  if not exists (select 1 from public.students s join public.classes c on c.id = s.class_id where s.id = p_student and c.teacher_id = sup.uid_w()) then raise exception 'forbidden'; end if;
  select min(created_at) into v_since from public.student_sessions where student_id = p_student;
  if p_wipe and v_since is not null then
    delete from public.attempts where student_id = p_student and started_at >= v_since; get diagnostics v_n = row_count;
    delete from public.arena_queue where student_id = p_student;
    delete from public.arena_rounds where student_id = p_student and created_at >= v_since;
    update public.arena_players p set
      pts = coalesce((select sum(r.pts) from public.arena_rounds r where r.student_id = p_student and r.status = 'done'), 0),
      games = (select count(*) from public.arena_rounds r where r.student_id = p_student and r.status = 'done'),
      wins = (select count(*) from public.arena_rounds r where r.student_id = p_student and r.status = 'done' and r.result = 'win'),
      updated_at = now()
    where p.student_id = p_student;
  end if;
  delete from public.student_sessions where student_id = p_student;
  delete from public.push_subs where student_id = p_student;
  v_code := private.new_code();
  update public.students set code = v_code, device = null, claim_at = null where id = p_student;
  return jsonb_build_object('code', v_code, 'wiped', v_n);
end $$;

-- 3) arena ranking: top 20 + my own place. p_period = day | week (starts Sunday, Kuwait time) | all
create index if not exists arena_rounds_done_at on public.arena_rounds (created_at) where status = 'done';

create or replace function public.arena_rank(p_token uuid, p_period text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_sid uuid; v_d date; v_from timestamptz; v_out jsonb;
begin
  v_sid := private.student_from_token(p_token);
  v_d := (now() at time zone 'Asia/Kuwait')::date;
  v_from := case p_period when 'day' then v_d::timestamp at time zone 'Asia/Kuwait'
                          when 'week' then (v_d - extract(dow from v_d)::int)::timestamp at time zone 'Asia/Kuwait' else null end;
  with pts as (
    select r.student_id, sum(r.pts)::int pts, count(*)::int games, max(r.created_at) last
    from public.arena_rounds r where r.status = 'done' and (v_from is null or r.created_at >= v_from)
    group by r.student_id having sum(r.pts) > 0),
  rk as (select p.*, row_number() over (order by p.pts desc, p.last) rnk from pts p)
  select jsonb_build_object(
    'rows', coalesce((select jsonb_agg(jsonb_build_object('rank', k.rnk, 'pts', k.pts, 'games', k.games, 'me', k.student_id = v_sid,
        'name', private.arena_nick(k.student_id), 'avatar', s.avatar, 'av', ap.av,
        'lvl', (private.arena_lvl(coalesce(ap.pts, 0))->>'n')::int,
        'school', nullif(btrim(coalesce(t.settings->>'school', '')), '')) order by k.rnk)
      from rk k join public.students s on s.id = k.student_id
        left join public.arena_players ap on ap.student_id = k.student_id
        left join public.classes c on c.id = s.class_id left join public.teachers t on t.id = c.teacher_id
      where k.rnk <= 20), '[]'::jsonb),
    'me', (select jsonb_build_object('rank', k.rnk, 'pts', k.pts) from rk k where k.student_id = v_sid),
    'total', (select count(*) from rk)) into v_out;
  return v_out;
end $$;
revoke all on function public.arena_rank(uuid, text) from public;
grant execute on function public.arena_rank(uuid, text) to anon, authenticated;
