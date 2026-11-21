-- v324: box after the sticker collection is complete gives +30 level XP instead of nothing
alter table public.student_boxes add column if not exists xp int not null default 0;

create or replace function private.student_xp(p_sid uuid)
returns integer language sql stable security definer set search_path to 'public', 'private' as $$
  select coalesce((select 10 * count(*) from public.attempt_questions aq join public.attempts a on a.id = aq.attempt_id
                    where a.student_id = p_sid and aq.is_correct), 0)::int
       + coalesce((select 5 * count(*) from public.attempts where student_id = p_sid and status = 'finished'), 0)::int
       + coalesce((select sum(xp) from public.student_boxes where student_id = p_sid), 0)::int
$$;

create or replace function public.student_open_box(p_token uuid)
returns jsonb language plpgsql security definer set search_path to 'public', 'private' as $$
declare v_sid uuid; v_day date; v_left text[]; v_prize text; v_xp int := 0;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  v_day := private.box_ready(v_sid);
  if v_day is null then return jsonb_build_object('ok', false); end if;
  select array_agg(e) into v_left from unnest(private.sticker_pool()) e
   where not exists (select 1 from public.students s where s.id = v_sid and e = any (s.stickers));
  if v_left is not null then
    v_prize := v_left[1 + floor(random() * array_length(v_left, 1))::int];
    update public.students set stickers = array_append(stickers, v_prize) where id = v_sid;
  else
    v_xp := 30;
  end if;
  insert into public.student_boxes(student_id, earned_on, prize, xp) values (v_sid, v_day, v_prize, v_xp) on conflict do nothing;
  return jsonb_build_object('ok', true, 'prize', v_prize, 'xp', v_xp, 'xp_total', private.student_xp(v_sid),
    'count', (select cardinality(stickers) from public.students where id = v_sid), 'total', cardinality(private.sticker_pool()));
end $$;

-- v325 (Khalid): not every day a gift. A played day earns a box only every 3rd day the student plays (3rd, 6th, 9th …).
create or replace function private.box_day(p_sid uuid, p_day date)
returns boolean language sql stable security definer set search_path to 'public', 'private' as $$
  select (select count(distinct a.play_date) from public.attempts a
           where a.student_id = p_sid and a.status = 'finished' and a.kind in ('official','knockout') and a.play_date <= p_day) % 3 = 0
     and exists (select 1 from public.attempts a where a.student_id = p_sid and a.status = 'finished' and a.kind in ('official','knockout') and a.play_date = p_day)
$$;

create or replace function private.box_ready(p_sid uuid)
returns date language sql stable security definer set search_path to 'public', 'private' as $$
  select max(a.play_date) from public.attempts a
   where a.student_id = p_sid and a.status = 'finished' and a.kind in ('official','knockout')
     and a.play_date < private.today_kw()
     and private.box_day(p_sid, a.play_date)
     and not exists (select 1 from public.student_boxes b where b.student_id = p_sid and b.earned_on = a.play_date)
     and exists (select 1 from public.attempts t where t.student_id = p_sid and t.status = 'finished' and t.kind in ('official','knockout') and t.play_date = private.today_kw())
     and a.play_date >= private.today_kw() - 30
$$;

-- student_daily: box.locked only when today is a box day; box.left = played days until the next box
create or replace function public.student_daily(p_token uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public', 'private' as $$
declare v_sid uuid; v_cls uuid; t date := private.today_kw(); v_size int; v_played int; v_stars int; v_today boolean; v_st text[]; v_n int;
begin
  v_sid := private.student_from_token(p_token);
  if v_sid is null then raise exception 'bad_token'; end if;
  select class_id, stickers into v_cls, v_st from public.students where id = v_sid;
  select count(*) into v_size from public.students where class_id = v_cls and coalesce(approved, true);
  select count(distinct a.student_id) into v_played from public.attempts a join public.students s on s.id = a.student_id
   where s.class_id = v_cls and a.play_date = t and a.status = 'finished' and a.kind in ('official','knockout');
  select count(*) into v_stars from (
    select a.play_date from public.attempts a join public.students s on s.id = a.student_id
     where s.class_id = v_cls and a.play_date >= t - 60 and a.status = 'finished' and a.kind in ('official','knockout')
     group by a.play_date having count(distinct a.student_id) >= ceil(greatest(v_size, 1) * 0.8)) x;
  v_today := exists (select 1 from public.attempts where student_id = v_sid and play_date = t and status = 'finished' and kind in ('official','knockout'));
  select count(distinct play_date) into v_n from public.attempts where student_id = v_sid and status = 'finished' and kind in ('official','knockout') and play_date <= t;
  return jsonb_build_object(
    'box', jsonb_build_object('ready', private.box_ready(v_sid) is not null, 'locked', v_today and v_n % 3 = 0, 'left', case when v_n % 3 = 0 then 3 else 3 - v_n % 3 end),
    'star', private.week_star(v_cls), 'xp', private.student_xp(v_sid), 'stickers', to_jsonb(v_st), 'pool', to_jsonb(private.sticker_pool()),
    'goal', jsonb_build_object('played', v_played, 'size', v_size, 'need', ceil(greatest(v_size, 1) * 0.8)::int, 'stars', v_stars));
end $$;
